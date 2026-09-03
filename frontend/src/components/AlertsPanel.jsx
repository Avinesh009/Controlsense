import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, Clock, Check } from 'lucide-react';
import { resolveAlert } from '../services/api';

export default function AlertsPanel({ alerts, onSelectEmployee, onAlertResolved }) {
  const [range, setRange] = useState('daily');

  const handleResolve = async (id) => {
    await resolveAlert(id);
    if (onAlertResolved) onAlertResolved(id);
  };

  const now = new Date();
  const filterAlerts = (list) => {
    return list.filter((a) => {
      const ts = new Date(a.timestamp);
      const diffDays = (now - ts) / (1000 * 60 * 60 * 24);
      if (range === 'daily') {
        return ts.toDateString() === now.toDateString();
      } else if (range === 'weekly') {
        return diffDays <= 7;
      } else if (range === 'monthly') {
        return diffDays <= 30;
      }
      return true;
    });
  };

  const activeAlerts = filterAlerts(alerts.filter((a) => !a.is_resolved));
  const resolvedAlerts = filterAlerts(alerts.filter((a) => a.is_resolved));

  return (
    <div className="space-y-6">
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

      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Security & Distraction Alerts</h2>
        <p className="text-xs text-slate-400">Automated flags for prolonged YouTube, Instagram, Facebook, WhatsApp, X (Twitter), excessive idle time, or unauthorized processes</p>
      </div>

      {/* Active Alerts */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
          <AlertTriangle className="w-4 h-4" />
          <span>Active Alerts ({activeAlerts.length})</span>
        </h3>

        {activeAlerts.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-slate-800">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-semibold text-white">No Active Alerts</h4>
            <p className="text-xs text-slate-400">All employees are operating within acceptable productivity thresholds.</p>
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-card rounded-2xl p-5 border border-rose-500/40 bg-gradient-to-r from-rose-950/20 via-transparent to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span 
                      onClick={() => onSelectEmployee && onSelectEmployee(alert.employee_code)}
                      className="font-bold text-sm text-white hover:text-brand-400 cursor-pointer hover:underline transition-colors"
                      title="Click to view employee's workstation"
                    >
                      {alert.employee_name}
                    </span>
                    <span className="text-[10px] font-mono bg-rose-900/60 text-rose-300 px-2 py-0.5 rounded border border-rose-700/50">
                      {alert.employee_code}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-rose-400">
                      {alert.alert_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1">{alert.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Triggered: {new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleResolve(alert.id)}
                className="self-end sm:self-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-700 hover:border-emerald-500 flex items-center space-x-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Acknowledge & Resolve</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Resolved History */}
      {resolvedAlerts.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Resolved History ({resolvedAlerts.length})</span>
          </h3>

          <div className="space-y-2">
            {resolvedAlerts.map((alert) => (
              <div key={alert.id} className="p-3.5 rounded-xl bg-dark-900/60 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span 
                    onClick={() => onSelectEmployee && onSelectEmployee(alert.employee_code)}
                    className="font-semibold text-slate-300 hover:text-brand-400 cursor-pointer hover:underline transition-colors"
                    title="Click to view employee's workstation"
                  >
                    {alert.employee_name} ({alert.employee_code})
                  </span>
                  <span>- {alert.message}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
