import React, { useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import useResizeObserver from '../../../hooks/useResizeObserver';

/**
 * DonutChart — D3-powered crowd distribution donut chart.
 *
 * Pattern: "D3 for math, React for rendering."
 * d3.pie() converts percentages → start/end angles.
 * d3.arc() converts angles → SVG path strings.
 * React renders all JSX — no d3.select() or DOM mutations.
 *
 * Props:
 *   data: Array<{ name: string, percentage: number, color: string }>
 *   busiestLocation: { name: string, percentage: number } | null
 */
const DonutChartDesktop = ({ data = [], busiestLocation = null }) => {
  const wrapperRef = useRef(null);
  const { width } = useResizeObserver(wrapperRef);

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: '', percentage: 0 });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const isEmpty = !data || data.length === 0 || !data.some(d => d.percentage > 0);

  // ── D3 Pie + Arc computation ─────────────────────────────────────────────────
  const { slices, arcGen, cx, cy, outerRadius } = useMemo(() => {
    if (!width || isEmpty) return {};

    // Chart is rendered in a fixed-size SVG container (240x240)
    const size = Math.min(width, 240);
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 * 0.88;
    const innerRadius = outerRadius * 0.58; // donut hole

    // d3.pie() converts percentage values into start/end radian angles.
    // sort(null) preserves original data order (no reordering by size).
    const pieLayout = d3.pie()
      .value(d => d.percentage)
      .sort(null);

    const slices = pieLayout(data);

    // Rounding fix: the API returns pre-rounded percentages (e.g. 33.3 + 33.3 + 33.4).
    // Floating-point drift can leave a tiny gap in the donut seam.
    // Clamp the final slice to exactly 2π to guarantee the ring closes perfectly.
    // Note: if the API is ever updated to return raw `total` counts, switch to
    // d3.pie().value(d => d.total) and remove this clamp — D3 handles it natively.
    if (slices.length > 0) {
      slices[slices.length - 1].endAngle = 2 * Math.PI;
    }

    // d3.arc() generates SVG path strings from angle objects.
    // No manual Math.sin / Math.cos needed.
    const arcGen = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(3);

    return { slices, arcGen, cx, cy, outerRadius };
  }, [data, width, isEmpty]);

  // ── Tooltip handlers (on individual <path> elements, NOT on <svg>) ───────────
  const handleSliceMouseEnter = (e, slice, index) => {
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      name: slice.data.name,
      percentage: slice.data.percentage,
    });
    setHoveredIndex(index);
  };

  const handleSliceMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, name: '', percentage: 0 });
    setHoveredIndex(null);
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div ref={wrapperRef} className="w-full flex flex-col items-center gap-4 py-12">
        <div className="p-4 bg-white/5 rounded-full border border-white/10">
          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-600">No data for selected period</p>
      </div>
    );
  }

  // ── Loading state: width not yet measured ────────────────────────────────────
  if (!width || !slices) {
    return <div ref={wrapperRef} className="w-full min-h-[240px]" />;
  }

  const svgSize = Math.min(width, 240);

  return (
    // Outer wrapper is `position: relative` so tooltip is positioned within it.
    <div ref={wrapperRef} className="w-full flex flex-col items-center gap-8">

      {/* ── Donut SVG ── */}
      <div className="relative" style={{ width: svgSize, height: svgSize }}>

        {/* ── Floating Tooltip ── */}
        {tooltip.visible && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y - 10 }}
          >
            <div className="rounded-xl bg-slate-800/95 backdrop-blur border border-white/10 px-3 py-2 shadow-xl text-center">
              <span className="block text-[10px] font-black text-white leading-tight">{tooltip.name}</span>
              <span className="block text-[9px] font-bold text-slate-400 mt-0.5">{tooltip.percentage}%</span>
            </div>
            <div className="mx-auto w-fit border-4 border-transparent border-t-slate-800" />
          </div>
        )}

        <svg
          width={svgSize}
          height={svgSize}
          role="img"
          aria-label="Crowd distribution by location"
          className="overflow-visible"
        >
          <g transform={`translate(${cx}, ${cy})`}>
            {/* ── Donut Slices ── */}
            {slices.map((slice, index) => (
              <path
                key={slice.data.name}
                d={arcGen(slice)}
                fill={slice.data.color}
                style={{
                  opacity: hoveredIndex === null ? 1 : hoveredIndex === index ? 1 : 0.45,
                  filter: hoveredIndex === index
                    ? `drop-shadow(0 0 8px ${slice.data.color}88)`
                    : `drop-shadow(0 0 4px ${slice.data.color}33)`,
                  transition: 'opacity 0.25s ease, filter 0.25s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => handleSliceMouseEnter(e, slice, index)}
                onMouseLeave={handleSliceMouseLeave}
              />
            ))}

            {/* ── Center Label ── */}
            <text
              textAnchor="middle"
              dy="-0.3em"
              fill="white"
              fontSize={10}
              fontWeight="900"
              fontFamily="inherit"
            >
              Distribution
            </text>
            <text
              textAnchor="middle"
              dy="1.1em"
              fill="rgba(148,163,184,0.7)"
              fontSize={7}
              fontWeight="700"
              fontFamily="inherit"
              className="uppercase"
            >
              Places
            </text>
          </g>
        </svg>
      </div>

      {/* ── Legend Grid ── */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-bold text-slate-300 truncate">{item.name}</span>
            </div>
            <span className="text-[10px] font-black text-white flex-shrink-0">{item.percentage}%</span>
          </div>
        ))}
      </div>

      {/* ── Busiest Location Notification ── */}
      {busiestLocation && busiestLocation.percentage > 0 && (
        <div className="w-full flex items-center gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 animate-pulse">
          <div className="p-2 bg-indigo-500/20 rounded-lg flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[11px] font-bold text-indigo-300">
            {busiestLocation.name} has the highest crowd rate at {busiestLocation.percentage}%
          </p>
        </div>
      )}
    </div>
  );
};

export default DonutChartDesktop;
