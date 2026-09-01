import React from 'react';
import { Monitor, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

export default function KPICards({ employees, alerts, onAlertsClick }) {
  // 1. Calculate Active Workstations
  const activeStations = employees.filter((emp) => {
    if (!emp.last_heartbeat) return false;
    const elapsed = (new Date() - new Date(emp.last_heartbeat)) / 1000;
    return elapsed < 20;
  }).length;

  // 2. Calculate Average Team Productivity Score
  const scoredEmployees = employees.filter((emp) => emp.total_active_seconds > 0);
  const avgProductivity = scoredEmployees.length > 0
    ? Math.round(scoredEmployees.reduce((sum, emp) => sum + (emp.productivity_score || 0), 0) / scoredEmployees.length)
    : 0;

  // 3. Calculate Cumulative Work Hours Today
  const totalActiveSeconds = employees.reduce((sum, emp) => sum + (emp.total_active_seconds || 0), 0);
  const totalWorkHours = (totalActiveSeconds / 3600).toFixed(1);

  // 4. Calculate Unresolved Red-Flag Alerts
  const activeAlerts = (alerts || []).filter((alert) => !alert.is_resolved).length;

  const cardData = [
    {
      title: 'Active Stations',
      value: `${activeStations} Online`,
      subtext: 'Live connected workstations',
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: Monitor,
    },
    
    //{
      //title: 'Avg Productivity',
      //value: `${avgProductivity}%`,
     // subtext: 'Team efficiency score today',
     // colorClass: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
     // icon: ShieldCheck,
    //},
    
    {
      title: 'Team Work Hours',
      value: `${totalWorkHours} hrs`,
      subtext: 'Logged time today',
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      icon: Clock,
    },
    {
      title: 'Active Red Flags',
      value: `${activeAlerts} Alerts`,
      subtext: 'Entertainment warnings today',
      colorClass: activeAlerts > 0 
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse' 
        : 'text-slate-400 bg-slate-800/50 border-slate-700/30',
      icon: AlertCircle,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cardData.map((card) => {
        const IconComponent = card.icon;
        const isAlertCard = card.title === 'Active Red Flags';
        return (
          <div
            key={card.title}
            onClick={isAlertCard ? onAlertsClick : undefined}
            className={`glass-card rounded-2xl p-5 border border-slate-800/80 flex items-center justify-between transition-all ${
              isAlertCard
                ? 'cursor-pointer hover:border-rose-500/40 hover:scale-[1.015]'
                : ''
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {card.title}
              </p>
              <h3 className="text-xl font-bold text-white mt-1.5">{card.value}</h3>
              <p className="text-[10px] text-slate-400 mt-1">{card.subtext}</p>
            </div>
            <div className={`p-3 rounded-xl border ${card.colorClass}`}>
              <IconComponent className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
