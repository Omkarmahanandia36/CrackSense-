import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileHeader, MobileBottomBar } from './components/MobileNav';
import { Dashboard } from './pages/Dashboard';
import { UploadAnalyze } from './pages/UploadAnalyze';
import { ResultView } from './pages/ResultView';
import { History } from './pages/History';
import { DevComponents } from './pages/DevComponents';
import { AdminView } from './pages/AdminView';
import { LoginModal } from './components/LoginModal';
import { EditProfileModal } from './components/EditProfileModal';
import {
  supabase,
  isSupabaseConfigured,
  signOutSupabase,
  getUserProfile,
  getValidSession,
  getCachedUserProfile,
  setCachedUserProfile,
} from './services/supabase';
import {
  getSystemHealth,
  fetchInspections,
  HealthData,
  AnalyzeResult,
  UserProfile,
} from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'upload' | 'result' | 'history' | 'dev' | 'admin'>('dashboard');
  const [currentResult, setCurrentResult] = useState<AnalyzeResult | null>(null);
  const [recentInspections, setRecentInspections] = useState<AnalyzeResult[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);

  // Initialize directly from persisted local cache so user remains logged in across app restarts
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = getCachedUserProfile();
    if (!cached) return null;
    return {
      id: cached.id,
      email: cached.email,
      full_name: cached.full_name,
      role: cached.role,
      is_active: true,
      created_at: cached.created_at,
    };
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialFileForUpload, setInitialFileForUpload] = useState<File | null>(null);

  const handleSetUser = useCallback((newUser: UserProfile | null) => {
    setUser(newUser);
    if (newUser) {
      setCachedUserProfile({
        id: String(newUser.id),
        email: newUser.email,
        full_name: newUser.full_name || 'Inspector',
        role: newUser.role || 'user',
        created_at: newUser.created_at,
      });
    } else {
      setCachedUserProfile(null);
    }
  }, []);

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

  // Check active Supabase cloud session on app start & subscribe to auth updates
  useEffect(() => {
    const checkUser = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const session = await getValidSession();
        if (session?.user) {
          const profile = await getUserProfile(session.user.id);
          handleSetUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name:
              profile?.full_name ||
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.username ||
              session.user.email?.split('@')[0] ||
              'Inspector',
            role: profile?.role || 'user',
            is_active: true,
            created_at: session.user.created_at,
          });
        }
      } catch (supaErr) {
        console.warn('Supabase session check error:', supaErr);
        // Do NOT log out on temporary network blips; retained cached profile stays active
      }
    };

    checkUser();

    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await getUserProfile(session.user.id);
          handleSetUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name:
              profile?.full_name ||
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.username ||
              session.user.email?.split('@')[0] ||
              'Inspector',
            role: profile?.role || 'user',
            is_active: true,
            created_at: session.user.created_at,
          });
        } else if (event === 'SIGNED_OUT') {
          handleSetUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [handleSetUser]);

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

  const handleLogout = async () => {
    handleSetUser(null);
    await signOutSupabase();
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

      {/* ── App Shell: Responsive Mobile Header + Main + Floating Sidebar ── */}
      <div className="relative z-10 flex flex-col md:flex-row h-full p-0 md:p-4 overflow-hidden">
        {/* Mobile top header (phones only) */}
        <MobileHeader
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          health={health}
          hasResult={currentResult !== null}
          user={user}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Floating glass sidebar (tablets & desktop only) */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          health={health}
          hasResult={currentResult !== null}
          user={user}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Main content — scrolls independently */}
        <main
          className="flex-1 overflow-y-auto ml-0 md:ml-4 pb-20 md:pb-0"
          style={{ borderRadius: 'var(--r-panel)' }}
        >
          <div className={currentPage === 'result' ? 'flex flex-col h-full' : 'p-3.5 sm:p-6 md:p-8 max-w-6xl w-full mx-auto'}>
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

            {currentPage === 'admin' && (
              <AdminView
                currentUser={user}
                onBack={() => setCurrentPage('dashboard')}
              />
            )}

            {currentPage === 'dev' && <DevComponents />}
          </div>
        </main>

        {/* Mobile bottom navigation bar (phones only) */}
        <MobileBottomBar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          health={health}
          hasResult={currentResult !== null}
          user={user}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(loggedInUser) => handleSetUser(loggedInUser)}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        onProfileUpdated={(updated) => handleSetUser(updated)}
      />
    </div>
  );
}
