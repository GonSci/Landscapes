import React, { useRef, useMemo } from 'react';
import * as d3 from 'd3';
import useResizeObserver from '../../../hooks/useResizeObserver';

/**
 * BarChart — D3-powered Peak Analysis bar chart.
 *
 * Pattern: "D3 for math, React for rendering."
 * D3 is used only to compute scales and tick values.
 * All JSX rendering is done by React — no d3.select() or DOM mutations.
 *
 * Features:
 * - Fixed count label always visible above each bar (non-zero bars only)
 * - Smart X-axis label skipping to prevent overlap in 24H mode
 * - Dynamic resizing via ResizeObserver
 *
 * Props:
 *   data: Array<{ label: string, value: number }>
 */
const MARGIN = { top: 28, right: 8, bottom: 28, left: 32 };

const BarChartDesktop = ({ data = [] }) => {
  const wrapperRef = useRef(null);
  const { width } = useResizeObserver(wrapperRef);

  // ── Guard: don't render until container is measured or data is present ───────
  const isEmpty = !data || data.length === 0;

  // ── D3 Scale computation (memoized, recomputed on data or width change) ──────
  const { xScale, yScale, ticks, chartWidth, chartHeight, labelStep } = useMemo(() => {
    if (!width || isEmpty) return {};

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = 96; // fixed inner chart height in px

    const maxVal = Math.max(...data.map(d => d.value), 1); // floor at 1 to avoid domain [0,0]

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, chartWidth])
      .padding(0.35);

    const yScale = d3.scaleLinear()
      .domain([0, maxVal])
      .range([chartHeight, 0])
      .nice();

    const ticks = yScale.ticks(3);

    // Smart label skipping: ensure minimum ~28px per label to avoid overlap.
    // e.g. for 24 bars in a ~300px chart → barWidth ≈ 8px → show every 4th label.
    const minLabelWidth = 28;
    const labelStep = Math.max(1, Math.ceil(minLabelWidth / xScale.step()));

    return { xScale, yScale, ticks, chartWidth, chartHeight, labelStep };
  }, [data, width]);

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div ref={wrapperRef} className="w-full flex flex-col items-center justify-center gap-2 min-h-[128px]">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-pulse" />
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Syncing Trends...</span>
      </div>
    );
  }

  // ── Loading state: width not yet measured by ResizeObserver ─────────────────
  if (!width || !xScale) {
    return <div ref={wrapperRef} className="w-full min-h-[128px]" />;
  }

  const svgHeight = chartHeight + MARGIN.top + MARGIN.bottom;

  return (
    <div ref={wrapperRef} className="w-full select-none">

      {/* ── SVG Chart ── */}
      <svg
        width={width}
        height={svgHeight}
        role="img"
        aria-label="Peak crowd count per hour"
        className="overflow-visible"
      >
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>

          {/* ── Y-Axis Grid Lines & Labels ── */}
          {ticks.map((tick) => (
            <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
              <line
                x1={0}
                x2={chartWidth}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
              <text
                x={-6}
                dy="0.32em"
                textAnchor="end"
                fill="rgba(255,255,255,0.3)"
                fontSize={8}
                fontWeight="700"
                fontFamily="inherit"
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}

          {/* ── Bars + Fixed Count Labels ── */}
          {data.map((bar) => {
            const barX = xScale(bar.label);
            const barWidth = xScale.bandwidth();
            const barHeight = Math.max(chartHeight - yScale(bar.value), 4); // min 4px stub
            const barY = chartHeight - barHeight;
            const isZero = bar.value === 0;

            return (
              <g key={bar.label}>
                {/* Visible bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  ry={4}
                  fill={isZero ? 'rgba(51,65,85,0.3)' : 'url(#barGradient)'}
                  style={{
                    transition: 'height 0.6s ease-out, y 0.6s ease-out',
                    filter: isZero ? 'none' : 'drop-shadow(0 0 6px rgba(99,102,241,0.4))',
                  }}
                />

                {/* Fixed count label — sits just above the bar top, non-zero bars only */}
                {!isZero && (
                  <text
                    x={barX + barWidth / 2}
                    y={barY - 5}
                    textAnchor="middle"
                    fill="rgba(167,139,250,0.9)"
                    fontSize={7}
                    fontWeight="900"
                    fontFamily="inherit"
                  >
                    {bar.value}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── X-Axis Labels (smart skipping to prevent overlap in 24H mode) ── */}
          {data.map((bar, index) => {
            // Always show first and last for orientation context.
            // Between them, only show every Nth label where N = labelStep.
            const isFirst = index === 0;
            const isLast = index === data.length - 1;
            if (!isFirst && !isLast && index % labelStep !== 0) return null;

            return (
              <text
                key={`label-${bar.label}`}
                x={xScale(bar.label) + xScale.bandwidth() / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                fill="rgba(255,255,255,0.25)"
                fontSize={7}
                fontWeight="700"
                fontFamily="inherit"
              >
                {bar.label}
              </text>
            );
          })}

          {/* ── Gradient Definition ── */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

        </g>
      </svg>
    </div>
  );
};

export default BarChartDesktop;
