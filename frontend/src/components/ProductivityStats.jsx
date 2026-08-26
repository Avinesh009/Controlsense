import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { ShieldCheck, PlayCircle, Code, Clock } from 'lucide-react';

const COLORS = {
  control_id: '#10b981', // Emerald
  youtube: '#f43f5e',    // Rose
  other_prod: '#38bdf8', // Sky Blue
  idle: '#f59e0b'        // Amber
};

export default function ProductivityStats({ employees, summary }) {
  // Format bar chart data comparing Control ID Tool hours vs YouTube hours per employee
  const employeeComparisonData = employees.map((emp) => ({
    name: emp.full_name.split(' ')[0],
    control_id_hours: Number((emp.control_id_seconds / 3600).toFixed(2)),
    youtube_hours: Number((emp.youtube_seconds / 3600).toFixed(2)),
    other_prod_hours: Number((emp.other_productive_seconds / 3600).toFixed(2)),
  }));

  // Aggregate pie chart data
  const pieData = [
    { name: 'Control ID Tool (Core Work)', value: summary?.total_control_id_hours || 0.1, color: COLORS.control_id },
    { name: 'YouTube & Distraction', value: summary?.total_youtube_hours || 0.05, color: COLORS.youtube },
    { name: 'Other Work / Dev Tools', value: summary?.total_other_productive_hours || 0.1, color: COLORS.other_prod },
    { name: 'Idle / Away Time', value: summary?.total_idle_hours || 0.05, color: COLORS.idle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Productivity & Time Allocation Analytics</h2>
        <p className="text-xs text-slate-400">Detailed metric comparison: Control ID utilization vs. non-work streaming time</p>
      </div>

      {/* Top 2 Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Employee Side-by-Side Comparison */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-white">Employee Tool Usage Breakdown</h3>
              <p className="text-xs text-slate-400">Control ID Tool hours vs. YouTube streaming per employee</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Control ID Tool</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>YouTube</span>
              </span>
              <span className="flex items-center space-x-1 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
                <span>Other Dev / Work</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Bar dataKey="control_id_hours" name="Control ID Tool (h)" fill={COLORS.control_id} radius={[4, 4, 0, 0]} />
                <Bar dataKey="youtube_hours" name="YouTube (h)" fill={COLORS.youtube} radius={[4, 4, 0, 0]} />
                <Bar dataKey="other_prod_hours" name="Other Work (h)" fill={COLORS.other_prod} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Overall Organization Time Share Pie */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm text-white">Overall Time Share</h3>
            <p className="text-xs text-slate-400">Total organization hours distribution</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(val) => [`${val} Hours`, 'Time']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-mono font-semibold">{item.value}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-white">Employee Productivity Leaderboard</h3>
          <span className="text-xs text-slate-400">Ranked by Control ID & Work Efficiency</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-800/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5 pl-5">Employee</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Control ID Tool</th>
                <th className="p-3.5">YouTube Time</th>
                <th className="p-3.5">Idle Time</th>
                <th className="p-3.5 pr-5 text-right">Productivity Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {employees
                .sort((a, b) => b.productivity_score - a.productivity_score)
                .map((emp) => (
                  <tr key={emp.employee_code} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 pl-5 font-medium text-white flex items-center space-x-2">
                      <img
                        src={emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=0D8ABC&color=fff`}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      <span>{emp.full_name}</span>
                    </td>
                    <td className="p-3.5 text-slate-400">{emp.department}</td>
                    <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                      {(emp.control_id_seconds / 3600).toFixed(1)}h
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className={emp.youtube_seconds > 1800 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {(emp.youtube_seconds / 3600).toFixed(1)}h
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {(emp.total_idle_seconds / 3600).toFixed(1)}h
                    </td>
                    <td className="p-3.5 pr-5 text-right font-mono font-bold text-accent-blue">
                      {emp.productivity_score}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
