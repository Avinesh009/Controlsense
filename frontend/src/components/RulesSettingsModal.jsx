import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';
import { fetchClassifierRules, saveClassifierRule, deleteClassifierRule } from '../services/api';

export default function RulesSettingsModal({ onClose }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New rule form states
  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState('PROCESS');
  const [category, setCategory] = useState('PRODUCTIVE');
  const [displayName, setDisplayName] = useState('');
  const [weight, setWeight] = useState('50');

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    const data = await fetchClassifierRules();
    setRules(data || []);
    setLoading(false);
  }

  async function handleAddRule(e) {
    e.preventDefault();
    if (!pattern || !displayName) return;

    setSaving(true);
    const payload = {
      pattern,
      match_type: matchType,
      category,
      display_name: displayName,
      weight: parseInt(weight, 10) || 0
    };

    const res = await saveClassifierRule(payload);
    if (res) {
      setPattern('');
      setDisplayName('');
      setWeight('50');
      await loadRules();
    }
    setSaving(false);
  }

  async function handleDeleteRule(id) {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    setLoading(true);
    await deleteClassifierRule(id);
    await loadRules();
  }

  const categoryColors = {
    CORE_WORK: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    PRODUCTIVE: 'text-sky-400 bg-sky-500/10 border border-sky-500/20',
    NEUTRAL: 'text-slate-400 bg-slate-500/10 border border-slate-500/20',
    ENTERTAINMENT: 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-4xl rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col p-6 max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 bg-dark-800/60">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-brand-500 animate-pulse" />
            <div>
              <span className="font-bold text-base text-white">Productivity Rules Editor</span>
              <p className="text-[10px] text-slate-400">Classify processes, window titles, or web domains into productivity categories.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add New Rule Form */}
        <form onSubmit={handleAddRule} className="p-4 rounded-2xl bg-dark-900 border border-slate-800 mb-5 space-y-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Add Custom Classification Rule</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Match Type</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono cursor-pointer"
              >
                <option value="PROCESS">PROCESS (e.g. excel.exe)</option>
                <option value="TITLE">TITLE (e.g. sheet-1)</option>
                <option value="DOMAIN">DOMAIN (e.g. google.com)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Pattern (Regex / Exact Match)</label>
              <input
                type="text"
                placeholder="e.g. ^photoshop(\.exe)?$"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono cursor-pointer"
              >
                <option value="CORE_WORK">CORE WORK</option>
                <option value="PRODUCTIVE">PRODUCTIVE</option>
                <option value="NEUTRAL">NEUTRAL</option>
                <option value="ENTERTAINMENT">ENTERTAINMENT</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Photoshop"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <label className="text-[10px] text-slate-400 uppercase font-mono">Productivity Weight (-100 to 100):</label>
              <input
                type="number"
                min="-100"
                max="100"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-200 font-mono text-center focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Custom Rule</span>
            </button>
          </div>
        </form>

        {/* Existing Rules List */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
              <span>Fetching classification rules...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center text-slate-500 text-xs italic py-8">No classification rules configured.</div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase font-mono">
                    <th className="p-3">Display Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Matching Pattern</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Weight</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {rules.map((rule, idx) => (
                    <tr key={rule.id || idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-200">{rule.display_name}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">{rule.match_type}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-300 break-all">{rule.pattern}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${categoryColors[rule.category] || categoryColors.NEUTRAL}`}>
                          {rule.category === 'CORE_WORK' ? 'CORE' : rule.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-300">{rule.weight}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
