import React from 'react';

const CSRNet = () => {
  return (
    <div className="flex flex-col gap-3.5">
      <h3 className="m-0 text-[1.0625rem] font-semibold text-slate-800">
        CSRNET Density Mapping
      </h3>
      <div className="flex min-h-[250px] flex-1 items-center justify-center rounded-xl border-2 border-dashed border-[#667eea] bg-[linear-gradient(135deg,rgba(102,126,234,0.08)_0%,rgba(118,75,162,0.08)_100%)] p-6 text-center sm:min-h-[300px] lg:min-h-[480px] xl:min-h-[540px]">
        <div className="text-center text-slate-500">
          <svg viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-4 h-12 w-12 text-[#667eea] sm:h-14 sm:w-14 lg:h-16 lg:w-16">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          <p className="my-2 text-base font-semibold text-slate-800">Crowd density visualization</p>
          <p className="!m-0 text-[0.8125rem] font-normal text-slate-400">
            Real-time heatmap analysis coming soon
          </p>
        </div>
      </div>
    </div>
  );
};

export default CSRNet;
