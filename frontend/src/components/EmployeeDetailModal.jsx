import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, PlayCircle, Monitor, RefreshCw, Cpu, Server, Activity } from 'lucide-react';
import { fetchEmployeeDetail } from '../services/api';

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function EmployeeDetailModal({ employeeCode, employees, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('daily');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchEmployeeDetail(employeeCode, range);
      setData(res);
      setLoading(false);
    }
    if (employeeCode) {
      load();
    }
  }, [employeeCode, range]);

  if (!employeeCode) return null;

  // Reactively track the employee if they are currently online and we are looking at today's stats,
  // otherwise fallback to the historical aggregated data returned by the backend API.
  const emp = range === 'daily' 
    ? (employees?.find((e) => e.employee_code === employeeCode) || data?.employee) 
    : data?.employee;
  const appDurations = emp?.app_durations || {};

  // Calculate total seconds logged to compute percentages
  const totalSessionSeconds = Object.values(appDurations).reduce((sum, val) => sum + val, 0);

  // Sort applications by duration descending
  const sortedApps = Object.entries(appDurations).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-lg rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-dark-800/60">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
              {(emp?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {emp?.full_name || 'Employee Details'}
              </h3>
              <p className="text-[11px] font-mono text-slate-400 leading-none mt-0.5">{emp?.email}</p>
              <p className="text-xs text-slate-400 mt-1.5">{emp?.role}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {loading && !emp ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Querying live workstation telemetry...</span>
            </div>
          ) : (
            <>
              {/* Time Period Selector */}
              <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
                {['daily', 'weekly', 'monthly'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setRange(period)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      range === period
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-900 border border-slate-800">
                <span className="text-xs text-slate-400">Current Workstation Status</span>
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Now</span>
                </span>
              </div>

              {/* Current Active Window */}
              <div className="p-4 rounded-2xl bg-dark-900 border border-slate-800 space-y-3">
                <div>
                  <div className="text-xs text-slate-400 font-semibold mb-1">Focused Window:</div>
                  <div className="text-sm font-semibold text-slate-200 break-words">
                    {emp?.current_window_title || 'Application Active'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono">Process Name:</div>
                    <div className="text-xs font-semibold text-accent-blue font-mono mt-0.5 truncate">
                      {emp?.current_process || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono">Category:</div>
                    <div className="text-xs font-semibold text-slate-300 mt-0.5">
                      {emp?.current_category || 'NEUTRAL'}
                    </div>
                  </div>
                </div>

                {emp?.current_url && (
                  <div className="pt-2.5 border-t border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase font-mono">Active URL:</div>
                    <a
                      href={emp.current_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 hover:underline break-all mt-0.5 block"
                    >
                      {emp.current_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Digital Wellbeing - Application Time Usage */}
              <div className="space-y-3">
                <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-brand-500" />
                  <span>Digital Wellbeing (Current Shift Time Share)</span>
                </div>

                {sortedApps.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 text-center">No application usage recorded in this session yet.</p>
                ) : (
                  <div className="space-y-3 p-4 rounded-2xl bg-dark-900 border border-slate-800">
                    {sortedApps.map(([appName, seconds]) => {
                      const pct = totalSessionSeconds > 0 ? (seconds / totalSessionSeconds) * 100 : 0;
                      const isWork = appName.includes('Control ID') || appName.includes('Code') || appName.includes('VS Code');
                      const isYouTube = appName.includes('YouTube') || appName.includes('Social');
                      const isIdle = appName.includes('Idle');

                      // Pick bar color based on app type
                      const barColor = isYouTube
                        ? 'bg-rose-500 shadow-glow-rose'
                        : isIdle
                        ? 'bg-amber-500'
                        : isWork
                        ? 'bg-emerald-500 shadow-glow-emerald'
                        : 'bg-sky-400';

                      return (
                        <div key={appName} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200 truncate max-w-[280px]">
                              {appName}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">
                              {formatDuration(seconds)} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor} rounded-full`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* System Metadata */}
              <div className="p-4 rounded-2xl bg-dark-900/55 border border-slate-800/80 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider flex items-center space-x-1">
                  <Server className="w-3 h-3" />
                  <span>Session Telemetry Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="text-slate-400">Total Connected Session Time:</div>
                  <div className="text-slate-300 text-right font-mono font-semibold">
                    {formatDuration(totalSessionSeconds)}
                  </div>
                  <div className="text-slate-400">Shift Started (Login):</div>
                  <div className="text-slate-300 text-right font-mono font-semibold text-emerald-400">
                    {emp?.shift_start_time ? new Date(emp.shift_start_time).toLocaleTimeString() : 'N/A'}
                  </div>
                  <div className="text-slate-400">Shift Ended (Logout):</div>
                  <div className="text-slate-300 text-right font-mono font-semibold text-rose-400">
                    {emp?.shift_end_time ? new Date(emp.shift_end_time).toLocaleTimeString() : 'Active Now / Offline'}
                  </div>
                  <div className="text-slate-400">Last Reported Check-in:</div>
                  <div className="text-slate-300 text-right font-mono">
                    {emp?.last_heartbeat ? new Date(emp.last_heartbeat).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
