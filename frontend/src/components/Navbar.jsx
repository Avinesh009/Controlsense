import React from 'react';
import { Shield, LogOut } from 'lucide-react';

export default function Navbar({ isWsConnected, onLogout }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-dark-900/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Live Pulse */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-blue shadow-glow-emerald">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  ControlSense
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Employee Activity & Productivity Intelligence</p>
            </div>
          </div>

          {/* Realtime Stream Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-dark-800 border border-slate-700/60 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse-fast shadow-glow-emerald' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-medium hidden sm:inline">
                {isWsConnected ? 'Realtime Stream Live' : 'Connecting to Server...'}
              </span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
