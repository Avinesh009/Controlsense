import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, PlayCircle, Monitor, RefreshCw, Cpu, Server, Activity } from 'lucide-react';
import { fetchEmployeeDetail, fetchEmployeeRawLogs } from '../services/api';

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
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [shiftEvents, setShiftEvents] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const getPastDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      dates.push({ value: iso, label });
    }
    return dates;
  };

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

  const emp = range === 'daily' 
    ? (employees?.find((e) => e.employee_code === employeeCode) || data?.employee) 
    : data?.employee;

  useEffect(() => {
    async function loadLogs() {
      if (emp?.email) {
        setLoadingLogs(true);
        const res = await fetchEmployeeRawLogs(emp.email, selectedDate);
        setActivityLogs(res?.raw_logs || []);
        setShiftEvents(res?.shift_events || []);
        setLoadingLogs(false);
      }
    }
    loadLogs();
  }, [emp?.email, selectedDate]);

  if (!employeeCode) return null;

  // Reactively track the employee if they are currently online and we are looking at today's stats,
  // otherwise fallback to the historical aggregated data returned by the backend API.
  const appDurations = emp?.app_durations || {};

  // Calculate total seconds logged to compute percentages
  const totalSessionSeconds = Object.values(appDurations).reduce((sum, val) => sum + val, 0);

  // Sort applications by duration descending
  const sortedApps = Object.entries(appDurations).sort((a, b) => b[1] - a[1]);

  const selectedDayTotalSeconds = activityLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
  const selectedDayBreakSeconds = activityLogs
    .filter((log) => log.process_name === 'Lunch Break')
    .reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
  const selectedDayAwaySeconds = activityLogs
    .filter((log) => log.process_name === 'Screen Locked')
    .reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
  const selectedDayIdleSeconds = activityLogs
    .filter((log) => log.is_idle && log.process_name !== 'Lunch Break' && log.process_name !== 'Screen Locked')
    .reduce((sum, log) => sum + (log.duration_seconds || 0), 0);

  // Check if today is selected to bind the header stats to live real-time values instead of static log list
  const isTodaySelected = selectedDate === new Date().toISOString().split('T')[0];
  const liveIdleSeconds = emp?.total_idle_seconds || 0;
  const liveBreakSeconds = emp?.total_break_seconds || 0;
  const liveAwaySeconds = emp?.total_away_seconds || 0;

  // Compute total offline / sleep gaps from milestones
  const totalSleepSeconds = shiftEvents
    .filter((evt) => evt.type === 'SLEEP_GAP')
    .reduce((sum, evt) => sum + (evt.gap_seconds || 0), 0);

  const displayBreakSeconds = isTodaySelected ? liveBreakSeconds : selectedDayBreakSeconds;
  const displayAwaySeconds = isTodaySelected ? liveAwaySeconds : selectedDayAwaySeconds;
  const displayIdleSeconds = isTodaySelected ? liveIdleSeconds : selectedDayIdleSeconds;

  // Strict Wall-Clock Shift Span: Difference between Shift Start and Last Check-in (or Shift End)
  const displayedShiftStartTime = (shiftEvents.length > 0 && shiftEvents[0].timestamp) 
    ? shiftEvents[0].timestamp 
    : emp?.shift_start_time;
  const startTimeMs = displayedShiftStartTime ? new Date(displayedShiftStartTime).getTime() : null;
  const endTimeMs = emp?.shift_end_time 
    ? new Date(emp.shift_end_time).getTime() 
    : (emp?.last_heartbeat ? new Date(emp.last_heartbeat).getTime() : null);

  let totalClockSpanSeconds = 0;
  if (startTimeMs && endTimeMs && endTimeMs >= startTimeMs) {
    totalClockSpanSeconds = Math.floor((endTimeMs - startTimeMs) / 1000);
  } else {
    totalClockSpanSeconds = (isTodaySelected ? totalSessionSeconds : selectedDayTotalSeconds) + totalSleepSeconds;
  }

  const nonWorkSeconds = displayBreakSeconds + displayAwaySeconds + displayIdleSeconds + totalSleepSeconds;
  const displayTotalSeconds = Math.max(totalClockSpanSeconds, nonWorkSeconds);
  const displayWorkSeconds = Math.max(0, displayTotalSeconds - nonWorkSeconds);

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
              <div className="flex items-center space-x-2 mt-1.5 text-xs">
                <span className="text-slate-400">{emp?.role}</span>
                {(isTodaySelected || activityLogs.length > 0) && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400 font-semibold font-mono" title="Total hours active in session">
                      Session: {formatDuration(displayTotalSeconds)}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-sky-400 font-semibold font-mono" title="Actual time worked (excluding breaks/idle)">
                      Worked: {formatDuration(displayWorkSeconds)}
                    </span>
                  </>
                )}
              </div>
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
                    {formatDuration(displayTotalSeconds)}
                  </div>
                  <div className="text-slate-400">Authorized Lunch / Break:</div>
                  <div className="text-slate-300 text-right font-mono font-semibold text-amber-500">
                    {formatDuration(displayBreakSeconds)}
                  </div>
                  <div className="text-slate-400">Stepped Away (Locked):</div>
                  <div className="text-slate-300 text-right font-mono font-semibold text-sky-400">
                    {formatDuration(displayAwaySeconds)}
                  </div>
                  <div className="text-slate-400">Unproductive Idle (Unlocked):</div>
                  <div className="text-slate-300 text-right font-mono font-semibold text-amber-600/80">
                    {formatDuration(displayIdleSeconds)}
                  </div>
                  <div className="text-slate-400">Computer Asleep / Offline:</div>
                  <div className="text-purple-400 text-right font-mono font-semibold">
                    {formatDuration(totalSleepSeconds)}
                  </div>
                  <div className="text-slate-400">Shift Started (Login):</div>
                  <div className="text-slate-300 text-right font-mono font-semibold text-emerald-400">
                    {displayedShiftStartTime ? new Date(displayedShiftStartTime).toLocaleTimeString() : 'N/A'}
                  </div>
                  <div className="text-slate-400">Shift Ended (Logout):</div>
                  <div className="text-slate-300 text-right font-mono font-semibold text-rose-400">
                    {emp?.shift_end_time ? new Date(emp.shift_end_time).toLocaleTimeString() : 'Active Now / Offline'}
                  </div>
                  <div className="text-slate-400">Last Reported Check-in:</div>
                  <div className="text-slate-300 text-right font-mono text-slate-400">
                    {emp?.last_heartbeat ? new Date(emp.last_heartbeat).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Detailed Activity Logs Auditor */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Detailed Activity History Trail</span>
                  </div>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono cursor-pointer"
                  >
                    {getPastDates().map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {loadingLogs ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2 bg-dark-900 rounded-2xl border border-slate-800">
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Loading past activity logs...</span>
                  </div>
                ) : (
                  <>
                    {/* Shift Events Milestones Timeline */}
                    {shiftEvents.length > 0 && (
                      <div className="p-4 bg-dark-900 rounded-2xl border border-slate-800 space-y-4">
                        <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Shift Milestones Timeline</div>
                        <div className="relative border-l border-slate-800 ml-2.5 pl-5 space-y-4 text-xs font-mono">
                          {shiftEvents.map((evt, idx) => {
                            const dotColors = {
                              LOGIN: 'bg-emerald-500 ring-emerald-500/20',
                              LOGOUT: 'bg-rose-500 ring-rose-500/20',
                              BREAK_START: 'bg-amber-500 ring-amber-500/20',
                              BREAK_END: 'bg-emerald-400 ring-emerald-400/20',
                              LOCK: 'bg-amber-600 ring-amber-600/20',
                              UNLOCK: 'bg-teal-400 ring-teal-400/20',
                              SLEEP_GAP: 'bg-purple-500 ring-purple-500/20',
                              DISCONNECT: 'bg-slate-500 ring-slate-500/20'
                            };
                            const isSleep = evt.type === 'SLEEP_GAP';
                            return (
                              <div key={idx} className={`relative flex items-center justify-between ${isSleep ? 'p-1.5 -ml-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20' : ''}`}>
                                <span className={`absolute -left-[26px] w-2.5 h-2.5 rounded-full ring-4 ${dotColors[evt.type] || 'bg-slate-400'}`}></span>
                                <span className={`${isSleep ? 'text-purple-300 font-semibold flex items-center space-x-1' : 'text-slate-200'} font-sans font-medium`}>
                                  {isSleep && <span>💤</span>}
                                  <span>{evt.event}</span>
                                </span>
                                <span className={`${isSleep ? 'text-purple-400' : 'text-slate-400'} text-[11px] font-semibold font-mono`}>
                                  {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : (evt.time || 'N/A')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Raw Application Logs Trail */}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider mb-2">Raw Application Log Trail</div>
                      {activityLogs.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-xs italic bg-dark-900 rounded-2xl border border-slate-800">
                          No activity logs recorded on this date.
                        </div>
                      ) : (
                        <div className="p-3 bg-dark-900 rounded-2xl border border-slate-800 space-y-2 max-h-60 overflow-y-auto text-xs font-mono">
                          {activityLogs.map((log, idx) => {
                            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            const catColors = {
                              CORE_WORK: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
                              PRODUCTIVE: 'text-sky-400 bg-sky-500/10 border border-sky-500/20',
                              ENTERTAINMENT: 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
                              NEUTRAL: 'text-slate-400 bg-slate-500/10 border border-slate-500/20'
                            };
                            return (
                              <div key={idx} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/50 transition-all flex flex-col space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span className="text-slate-500 font-semibold">{timeStr}</span>
                                  <span className="font-semibold text-sky-400">{log.process_name}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${catColors[log.category] || catColors.NEUTRAL}`}>
                                    {log.category === 'CORE_WORK' ? 'CORE' : log.category}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-300 break-words leading-relaxed font-sans">
                                  {log.window_title || 'Active Window'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
