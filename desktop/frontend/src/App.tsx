import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { UploadAnalyze } from './pages/UploadAnalyze';
import { ResultView } from './pages/ResultView';
import { History } from './pages/History';
import { LoginModal } from './components/LoginModal';
import {
  getSystemHealth,
  getCurrentUser,
  HealthData,
  AnalyzeResult,
  UserProfile,
} from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'upload' | 'result' | 'history'>('dashboard');
  const [currentResult, setCurrentResult] = useState<AnalyzeResult | null>(null);
  const [recentInspections, setRecentInspections] = useState<AnalyzeResult[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Poll system health
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await getSystemHealth();
        setHealth(data);
      } catch {
        setHealth(null);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check persisted user session
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      }
    };
    checkUser();
  }, []);

  const handleAnalysisSuccess = (result: AnalyzeResult) => {
    setCurrentResult(result);
    setRecentInspections((prev) => [result, ...prev]);
    setCurrentPage('result');
  };

  const handleSelectRecentResult = (result: AnalyzeResult) => {
    setCurrentResult(result);
    setCurrentPage('result');
  };

  const handleLogout = () => {
    localStorage.removeItem('cracksense_token');
    setUser(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        health={health}
        hasResult={currentResult !== null}
        user={user}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {currentPage === 'dashboard' && (
          <Dashboard
            onStartUpload={() => setCurrentPage('upload')}
            onSelectResult={handleSelectRecentResult}
            recentInspections={recentInspections}
            health={health}
          />
        )}

        {currentPage === 'upload' && (
          <UploadAnalyze onAnalysisSuccess={handleAnalysisSuccess} />
        )}

        {currentPage === 'history' && (
          <History
            onSelectResult={handleSelectRecentResult}
            onNavigateUpload={() => setCurrentPage('upload')}
          />
        )}

        {currentPage === 'result' && currentResult && (
          <ResultView
            result={currentResult}
            onNewInspection={() => setCurrentPage('upload')}
            onBackToDashboard={() => setCurrentPage('dashboard')}
          />
        )}
      </main>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
      />

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        CrackSense AI &bull; Electron + React + FastAPI + PostgreSQL Concrete Surface Health Monitor
      </footer>
    </div>
  );
}
