import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  Calendar,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Eye,
  X,
  Smartphone,
  Laptop,
  Globe,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, getValidSession } from '../services/supabase';
import { UserProfile } from '../services/api';
import { GlassPanel, Button, Skeleton } from '../components/ui';
import { LogIn } from 'lucide-react';

interface AdminViewProps {
  currentUser: UserProfile | null;
  onBack: () => void;
}

interface AdminUserRow {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_sign_in: string | null;
  inspection_count: number;
  login_count: number;
}

interface LoginEventItem {
  id: string;
  created_at: string;
  platform: string;
  app_version: string;
  device_model: string;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, onBack }) => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Selected user for viewing detailed login audit trail
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [loginEvents, setLoginEvents] = useState<LoginEventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured in client environment.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 0. Verify valid active session
      const session = await getValidSession();
      if (!session?.user) {
        setError('Administrator authentication session required. Please sign in with your admin credentials to access multi-tenant audit records.');
        setUsers([]);
        setLoading(false);
        return;
      }

      // 1. Try calling the security definer RPC function 'get_admin_users'
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_admin_users',
        {
          page_offset: page * pageSize,
          page_limit: pageSize,
        }
      );

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        setUsers(rpcData as AdminUserRow[]);
        setLoading(false);
        return;
      }

      if (rpcError) {
        console.warn('RPC get_admin_users failed, attempting direct table select:', rpcError.message);
      }

      // 2. Fallback: Query profiles table directly with RLS
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (profilesError) {
        throw new Error(
          profilesError.message ||
            'Database denied access. Ensure your user has role="admin" in profiles table.'
        );
      }

      if (!profilesData || profilesData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch aggregated counts for each profile
      const userRows: AdminUserRow[] = await Promise.all(
        profilesData.map(async (p: any) => {
          const { count: inspCount } = await supabase
            .from('inspections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', p.id);

          const { data: latestLogins, count: logCount } = await supabase
            .from('login_events')
            .select('created_at', { count: 'exact' })
            .eq('user_id', p.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            user_id: p.id,
            email: p.email || '—',
            full_name: p.full_name || 'Anonymous',
            role: p.role || 'user',
            created_at: p.created_at,
            last_sign_in: latestLogins?.[0]?.created_at || null,
            inspection_count: inspCount || 0,
            login_count: logCount || 0,
          };
        })
      );

      setUsers(userRows);
    } catch (err: any) {
      console.error('Admin users query error:', err);
      setError(
        err.message ||
          'Failed to load admin user roster. RLS policies require administrator privileges.'
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load detailed login events for selected user
  const handleOpenUserEvents = async (user: AdminUserRow) => {
    setSelectedUser(user);
    setLoadingEvents(true);
    setEventsError(null);

    try {
      const { data, error: evError } = await supabase
        .from('login_events')
        .select('id, created_at, platform, app_version, device_model')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (evError) throw evError;
      setLoginEvents(data || []);
    } catch (err: any) {
      setEventsError(err.message || 'Failed to retrieve login events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'android':
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case 'electron':
        return <Laptop className="w-4 h-4 text-cyan-400" />;
      default:
        return <Globe className="w-4 h-4 text-sky-400" />;
    }
  };

  // Enforce role guard at UI level (Database RLS enforces at storage level)
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto p-6 animate-fade-rise">
        <GlassPanel className="p-8 text-center border-rose-500/30">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
            Restricted Administrator Console
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-3)' }}>
            Access to user audit logs and inspection statistics is restricted to accounts with
            the <code className="px-1.5 py-0.5 rounded bg-white/10 text-rose-300">admin</code> role.
            PostgreSQL Row Level Security strictly rejects queries from standard users.
          </p>
          <Button variant="secondary" onClick={onBack}>
            Return to Dashboard
          </Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-rise max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--glass-sunken-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
              Administrator Audit Console
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Multi-tenant user activity, login sessions, and cloud inspection records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchUsers}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      {/* Database Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-rose-300">Database Access Error</div>
              <div className="text-rose-200/80">{error}</div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={LogIn}
            onClick={() => window.dispatchEvent(new CustomEvent('cracksense:open_login'))}
          >
            Sign In as Admin
          </Button>
        </div>
      )}

      {/* Main Users Table */}
      <GlassPanel className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--glass-sunken-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <th className="py-3 px-4 font-semibold" style={{ color: 'var(--text-2)' }}>User / Identity</th>
                <th className="py-3 px-4 font-semibold" style={{ color: 'var(--text-2)' }}>Email</th>
                <th className="py-3 px-4 font-semibold" style={{ color: 'var(--text-2)' }}>Role</th>
                <th className="py-3 px-4 font-semibold" style={{ color: 'var(--text-2)' }}>Inspections</th>
                <th className="py-3 px-4 font-semibold" style={{ color: 'var(--text-2)' }}>Total Logins</th>
                <th className="py-3 px-4 font-semibold" style={{ color: 'var(--text-2)' }}>Last Active</th>
                <th className="py-3 px-4 font-semibold text-right" style={{ color: 'var(--text-2)' }}>Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--glass-sunken-border)' }}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center" style={{ color: 'var(--text-3)' }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Loading authenticated user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center" style={{ color: 'var(--text-3)' }}>
                    No user accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium" style={{ color: 'var(--text-1)' }}>
                        {u.full_name}
                      </div>
                      <div className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {u.user_id.slice(0, 8)}...{u.user_id.slice(-4)}
                      </div>
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-2)' }}>
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[11px] ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold" style={{ color: 'var(--text-1)' }}>
                      {u.inspection_count}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-2)' }}>
                      {u.login_count}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-3)' }}>
                      {u.last_sign_in
                        ? new Date(u.last_sign_in).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={Eye}
                        onClick={() => handleOpenUserEvents(u)}
                      >
                        Events
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between p-3 border-t text-xs" style={{ borderColor: 'var(--glass-sunken-border)' }}>
          <div style={{ color: 'var(--text-3)' }}>
            Showing page {page + 1} ({users.length} records)
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="xs"
              variant="secondary"
              icon={ChevronLeft}
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <Button
              size="xs"
              variant="secondary"
              icon={ChevronRight}
              disabled={users.length < pageSize || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* Login Events Drawer / Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          />
          <GlassPanel className="relative z-10 w-full max-w-xl max-h-[80vh] flex flex-col p-6 animate-fade-rise">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--glass-sunken-border)' }}>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                  Login Audit History
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {selectedUser.full_name} ({selectedUser.email})
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg hover:bg-white/10"
                style={{ color: 'var(--text-3)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {loadingEvents ? (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                  Loading audit log from Supabase...
                </div>
              ) : eventsError ? (
                <div className="p-3 rounded-lg bg-rose-500/10 text-rose-300 text-xs">
                  {eventsError}
                </div>
              ) : loginEvents.length === 0 ? (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>
                  No login events recorded for this user yet.
                </div>
              ) : (
                loginEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg border flex items-center justify-between text-xs"
                    style={{ borderColor: 'var(--glass-sunken-border)', background: 'rgba(255, 255, 255, 0.02)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5">
                        {getPlatformIcon(ev.platform)}
                      </div>
                      <div>
                        <div className="font-medium capitalize" style={{ color: 'var(--text-1)' }}>
                          {ev.platform} {ev.app_version && `v${ev.app_version}`}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                          {ev.device_model || 'Unknown Device'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[11px]" style={{ color: 'var(--text-3)' }}>
                      {new Date(ev.created_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t text-right" style={{ borderColor: 'var(--glass-sunken-border)' }}>
              <Button size="sm" variant="secondary" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};
