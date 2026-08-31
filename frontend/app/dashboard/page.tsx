'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  DollarSign, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  ArrowRight, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck, 
  ExternalLink,
  Zap,
  AlertTriangle,
  Edit3,
  Check,
  Download,
  UploadCloud,
  FileText
} from 'lucide-react';
import ShopperPreview from '@/components/ShopperPreview';
import AskQuestionWidget from '@/components/AskQuestionWidget';

interface FieldMeta {
  field: string;
  value: string | null;
  source_url_or_tag: string;
  confidence: number;
  tier_used: string | null;
  cost: number;
  has_conflict?: boolean;
  status?: string;
  fusion_reasoning?: string;
  candidates?: Array<{ value: string; tier_used: string; confidence: number; source_url?: string }>;
}

interface EnrichmentResponse {
  record: Record<string, string | null>;
  field_metadata: Record<string, FieldMeta>;
  summary: {
    mfg_part_num: string;
    resolved_manufacturer: string;
    resolved_brand: string;
    classpath: string;
    source_url: string;
    total_columns: number;
    populated_columns: number;
    total_cost_usd: number;
    duration_ms: number;
  };
  pipeline_log: Array<{ stage: string; [key: string]: any }>;
}

const PRESETS = [
  {
    name: 'Frigidaire PDSH4816AF (Flagship Dishwasher - No Marketing Copy)',
    data: {
      mfg_part_num: 'PDSH4816AF',
      part_desc: 'PDSH4816AF Dishwasher SS - Display Only',
      e1_brand: '-- Unbranded --',
      unilog_brand: '-- No Unilog Brand --',
      dib_brand: '-- No DIB Brand --',
      part_manuf: 'Appliance Dealers Cooperative (APPDE)',
    }
  },
  {
    name: 'Whirlpool WDTS7024RZ (Flagship Dishwasher - Rich Marketing Copy)',
    data: {
      mfg_part_num: 'WDTS7024RZ',
      part_desc: 'WDTS7024RZ Dishwasher SS - Display Only',
      e1_brand: '-- Unbranded --',
      unilog_brand: '-- No Unilog Brand --',
      dib_brand: '-- No DIB Brand --',
      part_manuf: 'Appliance Dealers Cooperative (APPDE)',
    }
  },
  {
    name: 'Diablo DCB518ASTS06G (Abrasive Disc)',
    data: {
      mfg_part_num: 'DCB518ASTS06G',
      part_desc: 'DIABLO 5IN 180G S/C HOOK&LOCK DISC 6PK',
      e1_brand: 'DIABLO',
      unilog_brand: 'Diablo',
      dib_brand: '-- No DIB Brand --',
      part_manuf: 'Freud Inc (2435)',
    }
  }
];

export default function DashboardPage() {
  const [formData, setFormData] = useState({
    mfg_part_num: 'PDSH4816AF',
    part_desc: 'PDSH4816AF Dishwasher SS - Display Only',
    e1_brand: '-- Unbranded --',
    unilog_brand: '-- No Unilog Brand --',
    dib_brand: '-- No DIB Brand --',
    part_manuf: 'Appliance Dealers Cooperative (APPDE)',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichmentResponse | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [populatedOnly, setPopulatedOnly] = useState(true);

  // Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    raw_token: 'Appliance Dealers Cooperative (APPDE)',
    resolved_manufacturer: 'Electrolux',
    resolved_brand: 'FRIGIDAIRE',
  });
  const [correctionSuccess, setCorrectionSuccess] = useState<string | null>(null);

  // Conflict View Modal State
  const [activeConflictField, setActiveConflictField] = useState<FieldMeta | null>(null);

  // Batch Upload State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchRowsLimit, setBatchRowsLimit] = useState(5);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const handlePresetSelect = (presetData: any) => {
    setFormData(presetData);
  };

  const handleEnrich = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Enrichment failed with status: ${response.status}`);
      }

      const data: EnrichmentResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      alert(`API Error: ${err.message}. Make sure FastAPI is running on http://localhost:8000`);
    } finally {
      setLoading(false);
    }
  };

  // Instant Client-side CSV Download (0ms latency, UTF-8 BOM formatted for Excel)
  const handleDownloadSingleCSV = () => {
    if (!result || !result.record) {
      alert('Please run the enrichment pipeline first before downloading.');
      return;
    }
    try {
      const columns = Object.keys(result.record);
      const headerLine = columns.map(c => `"${c.replace(/"/g, '""')}"`).join(',');
      const rowLine = columns.map(c => {
        const v = result.record[c];
        return v !== null && v !== undefined ? `"${String(v).replace(/"/g, '""')}"` : '""';
      }).join(',');

      const csvContent = '\uFEFF' + headerLine + '\r\n' + rowLine + '\r\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enriched_${result.summary.mfg_part_num || 'product'}_252col_delivery.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const handleBatchUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFile) return;

    setBatchProcessing(true);
    setBatchMessage('Processing rows through 252-column enrichment pipeline...');

    try {
      const fd = new FormData();
      fd.append('file', batchFile);

      const response = await fetch(`http://localhost:8000/api/batch-enrich-csv?max_rows=${batchRowsLimit}`, {
        method: 'POST',
        body: fd,
      });

      if (!response.ok) throw new Error('Batch enrichment failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_enriched_${batchRowsLimit}rows_252col_delivery.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);

      setBatchMessage('✅ Successfully enriched and downloaded Excel delivery CSV!');
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchFile(null);
        setBatchMessage(null);
      }, 2000);
    } catch (err: any) {
      setBatchMessage(`❌ Error: ${err.message}`);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/corrections/manufacturer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correctionForm),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || 'Failed to save correction');
      }

      setCorrectionSuccess(resData.message);
      setTimeout(() => {
        setShowCorrectionModal(false);
        setCorrectionSuccess(null);
      }, 1800);
    } catch (err: any) {
      alert(`Correction Error: ${err.message}`);
    }
  };

  const filteredFields = result
    ? Object.entries(result.field_metadata).filter(([col, meta]) => {
        if (populatedOnly && meta.value === null) return false;
        if (tierFilter !== 'ALL' && meta.tier_used !== tierFilter) return false;
        if (searchFilter) {
          const s = searchFilter.toLowerCase();
          const colMatch = col.toLowerCase().includes(s);
          const valMatch = meta.value ? meta.value.toLowerCase().includes(s) : false;
          const srcMatch = meta.source_url_or_tag.toLowerCase().includes(s);
          return colMatch || valMatch || srcMatch;
        }
        return true;
      })
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
                UniHack <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Production Pipeline</span>
              </h1>
              <p className="text-xs text-slate-400">252-Column Product Data Enrichment, Evidence Fusion & Cost Ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowBatchModal(true);
                setBatchMessage(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Batch CSV Upload</span>
            </button>

            <button
              onClick={() => {
                setCorrectionForm({
                  raw_token: formData.part_manuf,
                  resolved_manufacturer: 'Electrolux',
                  resolved_brand: 'FRIGIDAIRE',
                });
                setShowCorrectionModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Correction Memory</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-xs text-emerald-400 font-mono">
              <DollarSign className="w-4 h-4" />
              <span>Active Cost: {result ? `$${result.summary.total_cost_usd.toFixed(4)}` : '$0.0000'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Preset Selector */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick-Fill Real Test Presets</span>
            <span className="text-xs text-slate-500">Includes distributor gotcha rows & ground truth fixtures</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetSelect(p.data)}
                className="text-left px-3.5 py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition text-xs flex items-center justify-between group"
              >
                <span className="font-medium text-slate-200 group-hover:text-emerald-400 transition">{p.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Distributor Raw Input Parameters (6 Ground-Truth Columns)
            </h2>
            <span className="text-xs text-slate-400 font-mono">Input: /data/sample_input.csv</span>
          </div>

          <form onSubmit={handleEnrich} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mfg_Part_Num *</label>
              <input
                type="text"
                value={formData.mfg_part_num}
                onChange={(e) => setFormData({ ...formData, mfg_part_num: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Part_Desc (Free-text description) *</label>
              <input
                type="text"
                value={formData.part_desc}
                onChange={(e) => setFormData({ ...formData, part_desc: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Part_Manuf (Raw Distributor/Mfr)</label>
              <input
                type="text"
                value={formData.part_manuf}
                onChange={(e) => setFormData({ ...formData, part_manuf: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">E1_Brand / Unilog_Brand</label>
              <input
                type="text"
                value={formData.e1_brand}
                onChange={(e) => setFormData({ ...formData, e1_brand: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>


            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-950 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enriching Record...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Full 252-Column Enrichment Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {loading && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-3 text-xs text-emerald-300 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Enrichment is running. Completed stages and field evidence appear when the server returns them.</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-8">
            {/* Summary KPI Cards & Export Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  Enriched Delivery Format Record
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    252-Column Schema Active
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Complete standardized delivery listing ready for Excel or Unilog database ingestion.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadSingleCSV}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download 252-Column CSV (Excel)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Schema Coverage</span>
                <span className="text-2xl font-bold text-slate-100">{result.summary.populated_columns} <span className="text-xs text-slate-500 font-normal">/ {result.summary.total_columns} cols</span></span>
                <span className="text-xs text-emerald-400 block mt-1 font-mono">{(result.summary.populated_columns / result.summary.total_columns * 100).toFixed(1)}% Populated</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Resolved Brand & OEM</span>
                <span className="text-lg font-bold text-slate-100 truncate block">{result.summary.resolved_brand || result.summary.resolved_manufacturer || 'N/A'}</span>
                <span className="text-xs text-slate-400 block mt-1 truncate">{result.summary.resolved_manufacturer}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Taxonomy Classpath</span>
                <span className="text-xs font-semibold text-slate-200 block truncate" title={result.summary.classpath}>{result.summary.classpath.split('>').pop()}</span>
                <span className="text-xs text-emerald-400 block mt-1">Flagship Match</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Pipeline Cost</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono">${result.summary.total_cost_usd.toFixed(4)}</span>
                <span className="text-xs text-slate-500 block mt-1">Free Tier (Tiers 0/1/3)</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block mb-1">Pipeline Latency</span>
                <span className="text-2xl font-bold text-slate-100 font-mono">{result.summary.duration_ms} <span className="text-xs text-slate-500 font-normal">ms</span></span>
                <span className="text-xs text-emerald-400 block mt-1">Real Execution</span>
              </div>
            </div>

            {/* Shopper Experience Preview Component */}
            <ShopperPreview record={result.record} fieldMetadata={result.field_metadata} />

            {/* Ask-It-A-Question Widget */}
            <AskQuestionWidget record={result.record} fieldMetadata={result.field_metadata} />

            {/* Interactive 252-Column Field Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-slate-200 text-sm">Populated Field Inspector & Provenance Ledger</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{filteredFields.length} showing</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search fields or values..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Tiers</option>
                    <option value="Tier 0: Rule/Input">Tier 0: Rule/Input</option>
                    <option value="Tier 1: schema.org">Tier 1: schema.org</option>
                    <option value="Tier 2: headless_render">Tier 2: headless_render</option>
                    <option value="Tier 3: static_html">Tier 3: static_html</option>
                    <option value="Tier 4: vlm_ocr">Tier 4: vlm_ocr</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={populatedOnly}
                      onChange={(e) => setPopulatedOnly(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    Populated Only
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Schema Column</th>
                      <th className="px-4 py-3 font-semibold">Enriched Value</th>
                      <th className="px-4 py-3 font-semibold">Source Provenance</th>
                      <th className="px-4 py-3 font-semibold text-center">Confidence</th>
                      <th className="px-4 py-3 font-semibold">Tier / Conflict</th>
                      <th className="px-4 py-3 font-semibold text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredFields.map(([col, meta]) => (
                      <tr key={col} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-2.5 font-medium text-slate-200 font-sans flex items-center justify-between">
                          <span>{col}</span>
                          {(col === 'MANUFACTURER_NAME' || col === 'BRAND_NAME') && (
                            <button
                              onClick={() => {
                                setCorrectionForm({
                                  raw_token: formData.part_manuf,
                                  resolved_manufacturer: result.summary.resolved_manufacturer || 'Electrolux',
                                  resolved_brand: result.summary.resolved_brand || 'FRIGIDAIRE',
                                });
                                setShowCorrectionModal(true);
                              }}
                              className="text-[10px] text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>Override</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-100 max-w-md truncate">
                          {meta.value !== null ? (
                            <span className="text-emerald-300 font-sans">{meta.value}</span>
                          ) : (
                            <span className="text-slate-600 italic font-sans">null</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate font-sans">
                          {meta.source_url_or_tag.startsWith('http') ? (
                            <a
                              href={meta.source_url_or_tag}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              <span className="truncate">{meta.source_url_or_tag}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className={meta.source_url_or_tag === 'no source found' ? 'text-rose-400' : 'text-slate-400'}>
                              {meta.source_url_or_tag}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              meta.has_conflict
                                ? 'bg-amber-950 text-amber-400 border border-amber-800 font-bold'
                                : meta.confidence >= 0.9
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : meta.confidence > 0
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {(meta.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans">
                          {meta.has_conflict ? (
                            <button
                              onClick={() => setActiveConflictField(meta)}
                              className="px-2 py-0.5 rounded text-[11px] bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 hover:bg-amber-900 transition cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>CONFLICTING EVIDENCE</span>
                            </button>
                          ) : meta.tier_used ? (
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                              {meta.tier_used}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                          ${meta.cost.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Batch Upload Modal */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <UploadCloud className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Batch CSV Enrichment & Export</h3>
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleBatchUploadSubmit} className="space-y-4 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Upload a distributor input CSV (like <code className="text-emerald-400">data/sample_input.csv</code>) to process rows and download the complete <strong>252-column Delivery Format CSV</strong> for Excel.
                </p>

                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Rows to Enrich:</label>
                  <select
                    value={batchRowsLimit}
                    onChange={(e) => setBatchRowsLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  >
                    <option value={10}>10 Rows (Quick Demo - ~2 seconds)</option>
                    <option value={50}>50 Rows (~8 seconds)</option>
                    <option value={100}>100 Rows (~15 seconds)</option>
                    <option value={250}>250 Rows (~35 seconds)</option>
                    <option value={500}>500 Rows (~1 minute)</option>
                    <option value={1000}>1,000 Rows (Full Dataset Evaluation)</option>
                  </select>
                </div>

                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center space-y-2 hover:border-emerald-500 transition">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                  <div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setBatchFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
                    />
                  </div>
                  {batchFile && (
                    <div className="text-emerald-400 font-mono text-[11px]">Selected: {batchFile.name}</div>
                  )}
                </div>

                {batchMessage && (
                  <div className={`p-2.5 rounded text-xs ${batchMessage.includes('❌') ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                    {batchMessage}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={!batchFile || batchProcessing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded shadow transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {batchProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enriching & Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Enrich & Download Excel CSV</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Conflict Details Modal */}
        {activeConflictField && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Evidence Conflict Resolution</h3>
                </div>
                <button
                  onClick={() => setActiveConflictField(null)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
                >
                  Close
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p><strong>Column:</strong> {activeConflictField.field}</p>
                <p className="p-2.5 rounded bg-amber-950/40 border border-amber-900/50 text-amber-200">
                  <strong>Fusion Reasoning:</strong> {activeConflictField.fusion_reasoning}
                </p>

                <div className="space-y-2 pt-2">
                  <span className="font-semibold text-slate-200 block">Candidate Values From Extraction Tiers:</span>
                  {activeConflictField.candidates?.map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs flex justify-between items-center">
                      <div>
                        <span className="text-emerald-400 font-semibold">{c.tier_used}:</span> '{c.value}'
                      </div>
                      <span className="text-slate-500 text-[10px]">Conf: {(c.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Human Correction Memory Modal */}
        {showCorrectionModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Human-in-the-Loop Correction Memory</h3>
                </div>
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Raw Distributor Token *</label>
                  <input
                    type="text"
                    value={correctionForm.raw_token}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, raw_token: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Resolved Manufacturer (Must be in Controlled LOV) *</label>
                  <input
                    type="text"
                    value={correctionForm.resolved_manufacturer}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, resolved_manufacturer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Resolved Brand (Must be in Controlled LOV) *</label>
                  <input
                    type="text"
                    value={correctionForm.resolved_brand}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, resolved_brand: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                    required
                  />
                </div>

                {correctionSuccess && (
                  <div className="p-2.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{correctionSuccess}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded shadow transition"
                  >
                    Save to Correction Memory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
