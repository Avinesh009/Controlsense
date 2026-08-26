import React, { useState } from 'react';
import { Clock, ShieldCheck, PlayCircle, Code, Moon } from 'lucide-react';

export default function ActivityTimeline({ employees }) {
  const [selectedEmp, setSelectedEmp] = useState(employees[0]?.employee_code || 'EMP-1001');

  const currentEmp = employees.find((e) => e.employee_code === selectedEmp) || employees[0];

  // Generate 24 hourly blocks with realistic segments for the shift
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  // Timeline blocks simulation for shift visualization
  const getTimelineBlocksForEmployee = (emp) => {
    if (!emp) return [];
    
    // Shift from 09:00 to 18:00
    const blocks = [];
    for (let h = 0; h < 24; h++) {
      if (h < 9 || h >= 18) {
        blocks.push({ hour: h, status: 'OFFLINE', color: 'bg-slate-900', label: 'Off-Shift' });
      } else if (h === 13) {
        blocks.push({ hour: h, status: 'LUNCH', color: 'bg-amber-900/40 border border-amber-800/40', label: 'Lunch / Away' });
      } else {
        // Active work hours
        if (emp.employee_code === 'EMP-1003' && (h === 14 || h === 15)) {
          blocks.push({ hour: h, status: 'YOUTUBE', color: 'bg-rose-600 shadow-glow-rose', label: 'YouTube Streaming' });
        } else if (emp.employee_code === 'EMP-1002') {
          blocks.push({ hour: h, status: 'DEV', color: 'bg-sky-500', label: 'VS Code & GitHub' });
        } else {
          blocks.push({ hour: h, status: 'CONTROL_ID', color: 'bg-emerald-500 shadow-glow-emerald', label: 'Control ID Tool' });
        }
      }
    }
    return blocks;
  };

  const timelineBlocks = getTimelineBlocksForEmployee(currentEmp);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">24-Hour Shift Activity Timeline</h2>
          <p className="text-xs text-slate-400">Gantt-style hourly visualizer of application switches and idle periods</p>
        </div>

        {/* Employee Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Select Employee:</label>
          <select
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
            className="bg-dark-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-brand-500"
          >
            {employees.map((emp) => (
              <option key={emp.employee_code} value={emp.employee_code}>
                {emp.full_name} ({emp.employee_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Employee Summary Card */}
      {currentEmp && (
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <img
                src={currentEmp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentEmp.full_name)}`}
                alt=""
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <h3 className="font-bold text-sm text-white">{currentEmp.full_name}</h3>
                <p className="text-xs text-slate-400">{currentEmp.department} • {currentEmp.role}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className="text-emerald-400 font-bold">Control ID: {(currentEmp.control_id_seconds/3600).toFixed(1)}h</span>
              <span className="text-rose-400 font-bold">YouTube: {(currentEmp.youtube_seconds/3600).toFixed(1)}h</span>
              <span className="text-accent-blue font-bold">Score: {currentEmp.productivity_score}%</span>
            </div>
          </div>

          {/* Hourly Timeline Grid */}
          <div className="mt-6">
            <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
              <span>Shift Timeline (00:00 - 23:00)</span>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                  <span>Control ID Tool</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-600 inline-block"></span>
                  <span>YouTube</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block"></span>
                  <span>Other Work</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-800/40 inline-block"></span>
                  <span>Idle / Break</span>
                </span>
              </div>
            </div>

            {/* 24-Hour Block Visualization */}
            <div className="grid grid-cols-12 md:grid-cols-24 gap-1.5 p-3 rounded-xl bg-dark-900/90 border border-slate-800">
              {timelineBlocks.map((block, idx) => (
                <div key={idx} className="group relative flex flex-col items-center">
                  <div
                    className={`w-full h-12 rounded-md ${block.color} transition-all group-hover:opacity-80 cursor-pointer`}
                  />
                  <span className="text-[9px] font-mono text-slate-500 mt-1">
                    {block.hour.toString().padStart(2, '0')}
                  </span>

                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-16 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                    <div className="bg-slate-900 border border-slate-700 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
                      <div className="font-bold">{block.hour}:00 - {block.hour + 1}:00</div>
                      <div className="text-slate-300">{block.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Employees Mini Timeline Matrix */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <h3 className="font-semibold text-sm text-white">All Employees Live Timeline Matrix</h3>
        <div className="space-y-3">
          {employees.map((emp) => {
            const blocks = getTimelineBlocksForEmployee(emp);
            return (
              <div key={emp.employee_code} className="p-3 rounded-xl bg-dark-900 border border-slate-800/70">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-200">{emp.full_name} ({emp.employee_code})</span>
                  <span className="text-slate-400 text-[11px]">Active in: <strong className="text-slate-200">{emp.current_app_display || emp.current_process || 'Online'}</strong></span>
                </div>
                <div className="grid grid-cols-24 gap-0.5 h-4 rounded overflow-hidden">
                  {blocks.map((b, i) => (
                    <div key={i} className={`h-full ${b.color}`} title={`${b.hour}:00 - ${b.label}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
