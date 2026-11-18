import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { UploadAnalyze } from './pages/UploadAnalyze';
import { ResultView } from './pages/ResultView';
import { History } from './pages/History';
import { DevComponents } from './pages/DevComponents';
import { LoginModal } from './components/LoginModal';
import {
  getSystemHealth,
  getCurrentUser,
  fetchInspections,
  HealthData,
  AnalyzeResult,
  UserProfile,
} from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'upload' | 'result' | 'history' | 'dev'>('dashboard');
  const [currentResult, setCurrentResult] = useState<AnalyzeResult | null>(null);
  const [recentInspections, setRecentInspections] = useState<AnalyzeResult[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialFileForUpload, setInitialFileForUpload] = useState<File | null>(null);

  // Theme: read from <html data-theme>, toggle between dark/light
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

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

  // Load existing inspections into dashboard on initial load
  useEffect(() => {
    const loadRecentHistory = async () => {
      try {
        const items = await fetchInspections(0, 10);
        const mapped: AnalyzeResult[] = items.map((i) => ({
          id: i.uuid || String(i.id),
          filename: i.filename,
          is_crack: i.is_crack,
          predicted_class: i.predicted_class,
          confidence: i.confidence,
          probabilities: {
            positive_crack: i.is_crack ? i.confidence : 1 - i.confidence,
            negative_clear: i.is_crack ? 1 - i.confidence : i.confidence,
          },
          image_url: i.image_url,
          created_at: i.created_at,
        }));
        setRecentInspections(mapped);
      } catch {
        // history empty or offline
      }
    };
    loadRecentHistory();
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
    setInitialFileForUpload(null);
    setCurrentPage('result');
  };

  const handleSelectRecentResult = (result: AnalyzeResult) => {
    setCurrentResult(result);
    setCurrentPage('result');
  };

  const handleStartUploadWithFile = (file: File) => {
    setInitialFileForUpload(file);
    setCurrentPage('upload');
  };

  const handleLogout = () => {
    localStorage.removeItem('cracksense_token');
    setUser(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* ── Ambient Navy & Coral Background ── */}
      <div className="ambient-bg" aria-hidden="true">
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />
        <div className="ambient-blob blob-3" />
        <div className="ambient-noise" />
      </div>

      {/* ── App Shell: Floating Sidebar + Viewport ── */}
      <div className="relative z-10 flex h-full" style={{ padding: 16 }}>
        {/* Floating glass sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          health={health}
          hasResult={currentResult !== null}
          user={user}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Main content — scrolls independently */}
        <main
          className="flex-1 overflow-y-auto ml-4"
          style={{ borderRadius: 'var(--r-panel)' }}
        >
          <div className={currentPage === 'result' ? 'flex flex-col h-full' : 'p-8 max-w-6xl w-full mx-auto'}>
            {currentPage === 'dashboard' && (
              <Dashboard
                onStartUpload={() => {
                  setInitialFileForUpload(null);
                  setCurrentPage('upload');
                }}
                onStartUploadWithFile={handleStartUploadWithFile}
                onSelectResult={handleSelectRecentResult}
                recentInspections={recentInspections}
                health={health}
              />
            )}

            {currentPage === 'upload' && (
              <UploadAnalyze
                initialFile={initialFileForUpload}
                onAnalysisSuccess={handleAnalysisSuccess}
              />
            )}

            {currentPage === 'history' && (
              <History
                onSelectResult={handleSelectRecentResult}
                onNavigateUpload={() => {
                  setInitialFileForUpload(null);
                  setCurrentPage('upload');
                }}
              />
            )}

            {currentPage === 'result' && currentResult && (
              <ResultView
                result={currentResult}
                onNewInspection={() => {
                  setInitialFileForUpload(null);
                  setCurrentPage('upload');
                }}
                onBackToDashboard={() => setCurrentPage('dashboard')}
              />
            )}

            {currentPage === 'dev' && <DevComponents />}
          </div>
        </main>
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
      />
    </div>
  );
}
