import React, { useEffect, useState } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchHistory } from '../services/api';
import { BarChart2, TrendingUp, RefreshCw } from 'lucide-react';

export default function HistoryCharts() {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchHistory();
    setHistoryData(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80 flex items-center justify-center space-x-2 text-slate-400 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
        <span>Loading historical analytics...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* 1. Bar Chart: Daily Work Hours */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4.5 h-4.5 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Daily Work Hours Trend</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">LAST 7 DAYS</span>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="h" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                itemStyle={{ color: '#38bdf8', fontSize: '11px' }}
                formatter={(value) => [`${value} hrs`, 'Work Hours']}
              />
              <Bar dataKey="work_hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Area Chart: Daily Productivity Trend */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col h-[320px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4.5 h-4.5 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Daily Productivity Score</h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">LAST 7 DAYS</span>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="prodColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                itemStyle={{ color: '#10b981', fontSize: '11px' }}
                formatter={(value) => [`${value}%`, 'Productivity']}
              />
              <Area type="monotone" dataKey="productivity" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#prodColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
