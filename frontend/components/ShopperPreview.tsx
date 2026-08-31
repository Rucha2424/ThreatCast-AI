'use client';

import React, { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Star, 
  ShoppingCart, 
  Shield, 
  FileText, 
  Truck, 
  Check, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface ShopperPreviewProps {
  record: Record<string, string | null>;
  fieldMetadata: Record<string, any>;
}

export default function ShopperPreview({ record, fieldMetadata }: ShopperPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Direct extraction from enriched record
  const shortDesc = record['SHORT_DESC'] || 'Product Title Unavailable';
  const mobileDesc = record['MOBILE_DESC'] || shortDesc;
  const retailDesc = record['RETAIL_DESC'] || shortDesc;
  const marketingDesc = record['MARKETING_DESCRIPTION'];
  const brandName = record['BRAND_NAME'] || record['MANUFACTURER_NAME'] || 'Brand';
  const mfrPartNum = record['MANUFACTURER_PART_NUMBER'] || record['Mfg_Part_Num'] || '';
  const classpath = record['Classpath'] || 'Kitchen Appliances > Built-In Dishwashers';
  const specSheetPdf = record['Specification Sheet'];
  const userManualPdf = record['Owners/User Manual'] || record['Instruction/Installation Manual'];
  const warranty = record['Warranty'] || '1 Year Manufacturer Warranty';
  const approvals = record['Standard/Approvals'];

  // Image resolution fallback
  const primaryImage = record['Product Image'] 
    ? (record['Product Image']?.startsWith('http') ? record['Product Image'] : `/${record['Product Image']}`)
    : null;

  // Extract key attribute specs
  const keySpecs: Array<{ label: string; value: string; uom?: string }> = [];
  for (let i = 1; i <= 15; i++) {
    const lbl = record[`ATTRIBUTE_LABEL ${i}`];
    const val = record[`ATTRIBUTE_VALUE ${i}`];
    const uom = record[`ATTRIBUTE_UOM ${i}`];
    if (lbl && val) {
      keySpecs.push({ label: lbl, value: val, uom: uom || undefined });
    }
  }

  // Extract feature bullets
  const featureBullets: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const f = record[`ITEM_FEATURES_${i}`];
    if (f) featureBullets.push(f);
  }

  // Default fallback image placeholder if no image link
  const placeholderImg = "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=600&q=80";

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Preview Header & View Mode Switcher */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Shopper Experience Preview
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                Live E-Commerce Render
              </span>
            </h3>
            <p className="text-xs text-slate-400">Verifying customer-facing title, marketing copy, and attribute presentation</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
              viewMode === 'desktop'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop Listing Card</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
              viewMode === 'mobile'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Search Snippet</span>
          </button>
        </div>
      </div>

      {/* Preview Content Canvas */}
      <div className="p-6 bg-slate-950/50 flex justify-center items-start min-h-[480px]">
        {/* ======================================================== */}
        {/* 1. MOBILE SEARCH SNIPPET MOCKUP                          */}
        {/* ======================================================== */}
        {viewMode === 'mobile' && (
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl border-4 border-slate-700 p-4 shadow-2xl space-y-3 font-sans">
            {/* Mobile Header Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
              <span className="font-semibold text-emerald-700">{brandName} Official Store</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">In Stock</span>
            </div>

            {/* Product Image & Main Details */}
            <div className="flex gap-3 items-start">
              <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 flex items-center justify-center relative">
                <img
                  src={primaryImage || placeholderImg}
                  alt={shortDesc}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImg;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Item #{mfrPartNum}
                </span>
                {/* Mobile Search Title pulling MOBILE_DESC */}
                <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-3">
                  {mobileDesc}
                </h4>
                <div className="flex items-center gap-1 text-amber-500 text-[11px]">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-slate-500 text-[10px] font-medium">(4.8)</span>
                </div>
              </div>
            </div>

            {/* Key Spec Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {keySpecs.slice(0, 4).map((spec, idx) => (
                <span
                  key={idx}
                  className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/80"
                >
                  {spec.label}: <strong>{spec.value}{spec.uom ? ` ${spec.uom}` : ''}</strong>
                </span>
              ))}
            </div>

            {/* Price & Cart Action */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block -mb-1">Commercial Price</span>
                <span className="text-base font-bold text-slate-900">$849.00</span>
              </div>
              <button
                type="button"
                className="bg-emerald-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow hover:bg-emerald-700 transition"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. DESKTOP E-COMMERCE LISTING CARD                       */}
        {/* ======================================================== */}
        {viewMode === 'desktop' && (
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl border border-slate-200 p-6 shadow-xl space-y-6 font-sans">
            {/* Breadcrumb Bar */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 border-b border-slate-100 pb-3">
              <span>Home</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span>{classpath.replace(/>/g, ' / ')}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-800">{brandName}</span>
            </div>

            {/* Main Product Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Product Visual Gallery */}
              <div className="md:col-span-5 space-y-3">
                <div className="aspect-square bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-4 relative group">
                  <img
                    src={primaryImage || placeholderImg}
                    alt={shortDesc}
                    className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImg;
                    }}
                  />
                  <span className="absolute top-3 left-3 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    OEM Verified Spec
                  </span>
                </div>

                {/* PDF Resources */}
                <div className="grid grid-cols-2 gap-2">
                  {specSheetPdf && (
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition text-[11px] text-slate-700 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      <span className="truncate font-medium">Spec Sheet PDF</span>
                    </a>
                  )}
                  {userManualPdf && (
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition text-[11px] text-slate-700 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="truncate font-medium">User Manual PDF</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Product Metadata & Actions */}
              <div className="md:col-span-7 space-y-4">
                {/* Brand & Part Number Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">{brandName}</span>
                    <span className="text-xs text-slate-400 font-mono">MPN: {mfrPartNum}</span>
                  </div>
                  {/* Desktop Title pulling SHORT_DESC */}
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {shortDesc}
                  </h2>
                </div>

                {/* Ratings & Certifications */}
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1 text-amber-500">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-semibold text-slate-800">4.9</span>
                    <span className="text-slate-400">(42 Reviews)</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{warranty}</span>
                  </div>
                </div>

                {/* Dynamic Feature Bullets / Specs */}
                {featureBullets.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Key Highlights</span>
                    <ul className="text-xs text-slate-700 space-y-1">
                      {featureBullets.slice(0, 4).map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Spec Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {keySpecs.slice(0, 6).map((s, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-100/80 border border-slate-200/80 text-xs">
                      <span className="text-[10px] text-slate-500 block truncate">{s.label}</span>
                      <span className="font-semibold text-slate-900 truncate block">
                        {s.value}{s.uom ? ` ${s.uom}` : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price & Purchase Bar */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Distributor Sell Price</span>
                    <span className="text-2xl font-bold text-slate-900">$899.00</span>
                  </div>
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-md transition"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Order Listing</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 3. MARKETING DESCRIPTION SECTION (GRACEFUL DEGRADATION) */}
            {/* ======================================================== */}
            {marketingDesc && marketingDesc.trim().length > 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Manufacturer Overview & Product Story</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {marketingDesc}
                </p>
              </div>
            ) : (
              /* Graceful degradation banner when no marketing copy is provided */
              <div className="p-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Technical Specification Listing — Direct OEM verified data attributes with no third-party marketing claims.</span>
                </div>
                {approvals && (
                  <span className="text-[10px] bg-slate-200/80 text-slate-700 font-mono px-2 py-0.5 rounded">
                    {approvals.split('|')[0]}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
