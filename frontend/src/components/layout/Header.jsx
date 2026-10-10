import React from 'react';
import { Menu, Upload, X } from 'lucide-react';
import { usePcapAnalysis } from '../../context/PcapAnalysisContext';

export default function Header({
  onToggleSidebar,
}) {
  const { fileName, loading, error, uploadPcap, clearPcap } = usePcapAnalysis();

  const handlePcapChange = (event) => {
    const file = event.target.files?.[0];
    if (file) uploadPcap(file);
    event.target.value = '';
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/[0.06] bg-threatcast-card">
      <div className="h-full px-4 md:px-8 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-4">

          {/* Mobile menu */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-threatcast-silver border border-white/[0.08] hover:bg-threatcast-elevated/70 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* System indicator */}
          <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-threatcast-elevated/70">
            <span className="w-2 h-2 rounded-full bg-threatcast-green" />

            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-wider text-threatcast-muted font-medium">
                AI Engine
              </span>
              <span className="mt-1 text-[11px] font-semibold text-white">
                CTU13 LSTM Online
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2.5 md:gap-4">


          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-threatcast-cyan/30 bg-threatcast-cyan/10 px-3 text-[11px] font-semibold text-threatcast-cyan hover:bg-threatcast-cyan/[0.16] transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>{loading ? 'Analyzing…' : 'Upload Data'}</span>
            <input type="file" accept=".pcap,.pcapng,.cap,.csv" className="hidden" onChange={handlePcapChange} disabled={loading} />
          </label>

          {fileName && (
            <button type="button" onClick={clearPcap} title="Clear active PCAP" className="flex h-9 max-w-40 items-center gap-1.5 rounded-lg border border-threatcast-green/25 bg-threatcast-green/10 px-2.5 text-[10px] text-threatcast-green">
              <span className="truncate">{fileName}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          )}

          {error && <span className="hidden max-w-44 truncate text-[10px] text-threatcast-red xl:inline" title={error}>{error}</span>}

          {/* Profile */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-threatcast-elevated text-white shrink-0">
            <span className="text-[10px] font-bold tracking-wider">TC</span>
          </div>
        </div>
      </div>
    </header>
  );
}
