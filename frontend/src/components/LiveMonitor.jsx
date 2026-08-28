import React from 'react';
import { ShieldCheck, Monitor, Clock, PlayCircle } from 'lucide-react';

export default function LiveMonitor({ employees, summary, onSelectEmployee }) {
  // Only show employees whose agents are actively sending heartbeats (last heartbeat < 15 seconds ago)
  const activeEmployees = employees.filter((emp) => {
    if (!emp.last_heartbeat) return false;
    const elapsed = (new Date() - new Date(emp.last_heartbeat)) / 1000;
    return elapsed < 20; // 20 seconds threshold
  });

  return (
    <div className="space-y-6">
      {/* Live Workspace Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Active Workstations</h2>
          <p className="text-xs text-slate-400">Real-time active window and tool tracking (Live telemetry only)</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Control ID / Work</span>
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 ml-2"></span>
          <span>YouTube / Entertainment</span>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-2"></span>
          <span>Idle</span>
        </div>
      </div>

      {activeEmployees.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80">
          <span className="flex h-3 w-3 mx-auto relative mb-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <h3 className="font-semibold text-sm text-white">No Active Agents Running</h3>
          <p className="text-xs text-slate-400 mt-1">Start the desktop agent on employee machines to begin tracking in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeEmployees.map((emp) => {
            const isControlId = emp.current_category === 'CORE_WORK' || (emp.current_app_display || '').includes('Control ID');
            const isYouTube = emp.current_category === 'ENTERTAINMENT' || emp.current_status === 'ENTERTAINMENT_ALERT';
            const isIdle = emp.current_status === 'IDLE';

            return (
              <div
                key={emp.employee_code}
                onClick={() => onSelectEmployee(emp.employee_code)}
                className="glass-card cursor-pointer hover:border-brand-500/50 hover:scale-[1.015] rounded-2xl p-5 border border-slate-800 relative transition-all"
              >
                {/* Top Row: Avatar & Status Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                        {(emp.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-dark-900 ${
                          isYouTube
                            ? 'bg-rose-500 shadow-glow-rose animate-pulse'
                            : isIdle
                            ? 'bg-amber-500'
                            : 'bg-emerald-500 shadow-glow-emerald'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white">
                        {emp.full_name}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400 leading-none mt-0.5">{emp.email}</p>
                      <p className="text-xs text-slate-400 mt-1.5">{emp.role}</p>
                    </div>
                  </div>

                  {/* Status Tag */}
                  <div>
                    {isYouTube ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
                        <PlayCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Watching YouTube</span>
                      </span>
                    ) : isControlId ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Using Control ID</span>
                      </span>
                    ) : isIdle ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Idle / Away</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        <Monitor className="w-3.5 h-3.5 text-blue-400" />
                        <span>Active Working</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Active Window & Process Snippet */}
                <div className="mt-4 p-3 rounded-xl bg-dark-900/90 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-mono text-[11px] text-slate-500">Focused Window:</span>
                    <span className="font-mono text-[10px] text-accent-blue bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/30">
                      {emp.current_process || 'System'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 truncate" title={emp.current_window_title || 'Active Window'}>
                    {emp.current_window_title || 'Application Active'}
                  </p>
                  {emp.current_url && (
                    <p className="text-[11px] text-slate-400 truncate mt-1 text-sky-400">
                      🔗 {emp.current_url}
                    </p>
                  )}
                </div>

                {/* Footer: Shift Times */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Shift Start: {emp.shift_start_time ? new Date(emp.shift_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                  {emp.shift_end_time && (
                    <span className="text-rose-400/80">Shift End: {new Date(emp.shift_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
