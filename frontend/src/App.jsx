import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import LiveMonitor from './components/LiveMonitor';
import EmployeeDetailModal from './components/EmployeeDetailModal';
import KPICards from './components/KPICards';
import HistoryCharts from './components/HistoryCharts';
import AlertsPanel from './components/AlertsPanel';
import { X } from 'lucide-react';
import { fetchEmployees, fetchSummary, fetchAlerts } from './services/api';
import { realtimeHub } from './services/websocket';
import { isAuthenticated, logout } from './services/auth';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    realtimeHub.disconnect();
    setEmployees([]);
    setSummary(null);
    setAlerts([]);
    setAuthed(false);
  }, []);

  // If the backend rejects our token (expired/invalid), drop back to login.
  useEffect(() => {
    window.addEventListener('emt-session-expired', handleLogout);
    return () => window.removeEventListener('emt-session-expired', handleLogout);
  }, [handleLogout]);

  // Initial load via REST API (only once authenticated)
  useEffect(() => {
    if (!authed) return;
    async function loadData() {
      const [emps, sum, initialAlerts] = await Promise.all([
        fetchEmployees(),
        fetchSummary(),
        fetchAlerts(),
      ]);
      setEmployees(emps);
      setSummary(sum);
      setAlerts(initialAlerts || []);
    }
    loadData();
  }, [authed]);

  // Connect to Realtime WebSocket (only once authenticated)
  useEffect(() => {
    if (!authed) return;

    realtimeHub.connect();

    const unsubscribe = realtimeHub.subscribe((message) => {
      if (message.event === 'CONNECTION_STATUS') {
        setIsWsConnected(message.connected);
      } else if (message.event === 'INITIAL_STATE') {
        setEmployees(message.data.employees || []);
        setSummary(message.data.summary || null);
        setAlerts(message.data.alerts || []);
      } else if (message.event === 'HEARTBEAT') {
        const updatedEmp = message.data.employee;
        setEmployees((prev) => {
          const exists = prev.some((e) => e.employee_code === updatedEmp.employee_code);
          if (exists) {
            return prev.map((e) => (e.employee_code === updatedEmp.employee_code ? updatedEmp : e));
          } else {
            return [...prev, updatedEmp];
          }
        });
        if (message.data.summary) {
          setSummary(message.data.summary);
        }
        if (message.data.alerts) {
          setAlerts(message.data.alerts);
        }
      } else if (message.event === 'ALERT_RESOLVED') {
        setAlerts((prev) =>
          prev.map((a) => (a.id === message.alert_id ? { ...a, is_resolved: true } : a))
        );
      }
    });

    return () => {
      unsubscribe();
      realtimeHub.disconnect();
    };
  }, [authed]);

  if (!authed) {
    return <Login onLoginSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      <Navbar isWsConnected={isWsConnected} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Summary Cards */}
        <KPICards employees={employees} alerts={alerts} onAlertsClick={() => setIsAlertsModalOpen(true)} />

        {/* Live Active Workstations Grid */}
        <LiveMonitor
          employees={employees}
          summary={summary}
          onSelectEmployee={(code) => setSelectedEmployeeCode(code)}
        />

        {/* Historical Analytics Section */}
        <HistoryCharts />
      </main>

      {/* Alerts Overview Modal Popup */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-2xl rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col p-6 max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 bg-dark-800/60">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-white">Active System Warnings</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Real-time
                </span>
              </div>
              <button
                onClick={() => setIsAlertsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto pr-1 flex-1">
              <AlertsPanel
                alerts={alerts}
                onSelectEmployee={(code) => {
                  setSelectedEmployeeCode(code);
                  setIsAlertsModalOpen(false);
                }}
                onAlertResolved={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Simplified Employee Detail Modal */}
      {selectedEmployeeCode && (
        <EmployeeDetailModal
          employeeCode={selectedEmployeeCode}
          employees={employees}
          onClose={() => setSelectedEmployeeCode(null)}
        />
      )}
    </div>
  );
}
