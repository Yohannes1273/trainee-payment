import React, { useState } from 'react';
import { 
  TrendingUp, Target, Landmark, ArrowUpRight, 
  Sparkles, DollarSign, Calendar, ChevronRight 
} from 'lucide-react';
import { motion } from 'motion/react';

interface DailyData {
  day: string;
  inflow: number;
  target: number;
}

export default function DailyInflowStats() {
  // 7-day ledger dataset of TVET academic payments vs projections
  const data: DailyData[] = [
    { day: 'Mon', inflow: 64000, target: 70000 },
    { day: 'Tue', inflow: 81000, target: 70000 },
    { day: 'Wed', inflow: 95000, target: 80000 },
    { day: 'Thu', inflow: 72000, target: 80000 },
    { day: 'Fri', inflow: 115000, target: 90000 },
    { day: 'Sat', inflow: 124000, target: 100000 },
    { day: 'Sun', inflow: 88000, target: 70000 },
  ];

  const [activeDayIndex, setActiveDayIndex] = useState<number>(5); // Default to Saturday/Current view

  const activeData = data[activeDayIndex];
  const totalInflow = data.reduce((acc, curr) => acc + curr.inflow, 0);
  const totalTarget = data.reduce((acc, curr) => acc + curr.target, 0);
  const averagePerformance = Math.round((totalInflow / totalTarget) * 100);

  // SVG Chart sizing parameters
  const chartHeight = 120;
  const chartWidth = 360;
  const paddingX = 30;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => Math.max(d.inflow, d.target))) * 1.15;

  const getX = (index: number) => {
    return paddingX + (index * (chartWidth - paddingX * 2)) / (data.length - 1);
  };

  const getY = (value: number) => {
    return chartHeight - paddingY - (value * (chartHeight - paddingY * 2)) / maxVal;
  };

  // Generate paths for Inflow Area & Line
  const inflowPoints = data.map((d, idx) => `${getX(idx)},${getY(d.inflow)}`).join(' ');
  const inflowAreaPath = `${getX(0)},${chartHeight - paddingY} ${inflowPoints} ${getX(data.length - 1)},${chartHeight - paddingY}`;
  
  // Generate path for Target line
  const targetPoints = data.map((d, idx) => `${getX(idx)},${getY(d.target)}`).join(' ');

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString()} ETB`;
  };

  const performancePercent = Math.round((activeData.inflow / activeData.target) * 100);

  return (
    <div id="daily-inflow-stats-root" className="bg-slate-950 border border-slate-800/80 rounded-3xl p-6 shadow-xl text-slate-100">
      
      {/* Title Header with micro-context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5 mb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Live Intelligence Feed</span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <Landmark size={18} className="text-violet-400" />
            Daily Payment Inflow vs. Expected Targets
          </h3>
          <p className="text-slate-400 text-xs">
            Interactive 7D financial performance tracker. Click nodes on the graph below to audit specific projections.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800/50 px-4 py-2.5 rounded-2xl">
          <TrendingUp size={16} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">7D Cumulative</p>
            <p className="text-xs font-extrabold text-white">
              {formatCurrency(totalInflow)} <span className="text-[10px] text-emerald-400 font-medium">({averagePerformance}% vs Target)</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Dynamic Detail Panel Card */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800">
              <Calendar size={13} className="text-violet-400" />
              <span className="text-xs font-bold text-slate-300">Day: {activeData.day}day Projection</span>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
              performancePercent >= 100 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {performancePercent}% Achieved
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Verified Inflow</p>
              <h4 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                {formatCurrency(activeData.inflow)}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/50">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Target Cap</p>
                <p className="text-sm font-extrabold text-slate-300 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {formatCurrency(activeData.target)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Variance</p>
                <p className={`text-sm font-extrabold flex items-center gap-1 ${
                  activeData.inflow >= activeData.target ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  <ArrowUpRight size={14} className={activeData.inflow >= activeData.target ? '' : 'rotate-90'} />
                  {activeData.inflow >= activeData.target ? '+' : ''}
                  {((activeData.inflow - activeData.target)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Vector Sparkline & Chart Area */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[400px] h-[150px] bg-slate-900/20 rounded-2xl border border-slate-900/60 p-2 flex flex-col justify-end">
            
            {/* SVG Visual Canvas */}
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-full overflow-visible"
            >
              {/* Horizontal Reference Lines */}
              {[0.25, 0.5, 0.75, 1.0].map((ratio, index) => {
                const yPos = getY(maxVal * ratio * 0.85);
                return (
                  <g key={index}>
                    <line 
                      x1={paddingX} 
                      y1={yPos} 
                      x2={chartWidth - paddingX} 
                      y2={yPos} 
                      stroke="#1e293b" 
                      strokeWidth={0.5} 
                      strokeDasharray="4,4" 
                    />
                    <text 
                      x={paddingX - 4} 
                      y={yPos + 2} 
                      fill="#64748b" 
                      fontSize={6.5} 
                      fontFamily="monospace" 
                      textAnchor="end"
                    >
                      {Math.round((maxVal * ratio * 0.85) / 1000)}k
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area for Inflow */}
              <polygon 
                points={inflowAreaPath} 
                fill="url(#inflow-gradient)" 
                opacity="0.15" 
              />

              {/* Expected target projection line */}
              <polyline 
                fill="none" 
                stroke="#10b981" 
                strokeWidth={1.5} 
                strokeDasharray="3,3" 
                points={targetPoints} 
                className="transition-all duration-300"
              />

              {/* Daily payment inflow path */}
              <polyline 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth={2.5} 
                points={inflowPoints} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="transition-all duration-300"
              />

              {/* Interactive nodes */}
              {data.map((d, idx) => {
                const cx = getX(idx);
                const cy = getY(d.inflow);
                const isSelected = activeDayIndex === idx;

                return (
                  <g 
                    key={idx} 
                    className="cursor-pointer group"
                    onClick={() => setActiveDayIndex(idx)}
                  >
                    {/* Hover hotspot */}
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={10} 
                      fill="transparent" 
                    />
                    {/* Outer glow ring */}
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={isSelected ? 6 : 4} 
                      fill={isSelected ? '#6366f1' : '#1e1b4b'} 
                      stroke={isSelected ? '#ffffff' : '#4f46e5'} 
                      strokeWidth={isSelected ? 1.5 : 1} 
                      className="transition-all duration-250"
                    />
                    {/* Day labels along the bottom */}
                    <text 
                      x={cx} 
                      y={chartHeight - 4} 
                      fill={isSelected ? '#ffffff' : '#64748b'} 
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fontSize={8} 
                      textAnchor="middle"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}

              {/* Definitions for color gradients */}
              <defs>
                <linearGradient id="inflow-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Key Legend Row */}
          <div className="flex items-center gap-5 mt-4 text-[10px] font-bold tracking-wide text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-full bg-indigo-500" />
              <span>Actual Inflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="border-t-2 border-emerald-500 border-dashed w-4 inline-block" />
              <span>Target Baseline</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
