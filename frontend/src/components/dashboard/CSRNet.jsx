import React from 'react';

const CSRNet = () => {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#667eea]"></div>
        <h3 className="m-0 text-[10px] font-black uppercase tracking-widest text-slate-500">
          CSRNET Density Mapping
        </h3>
      </div>
      <div className="flex min-h-[250px] flex-1 items-center justify-center rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center sm:min-h-[300px] lg:min-h-[480px]">
        <div className="text-center group">
          <div className="relative mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_30px_rgba(102,126,234,0.2)]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-[#667eea]">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-transparent animate-spin-slow"></div>
          </div>
          <p className="mb-2 text-xl font-black text-white tracking-tight">CSRNET</p>
          <p className="max-w-[200px] mx-auto text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
            MALAPIT NA TONG CSRNET MAY BITAW TOH
          </p>
        </div>
      </div>
    </div>
  );
};

export default CSRNet;
