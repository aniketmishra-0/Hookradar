import { useEffect, useRef, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import AuthScreen from './components/AuthScreen';
import CreateEndpointModal from './components/CreateEndpointModal';
import Dashboard from './components/Dashboard';
import EndpointView from './components/EndpointView';
import ResponseConfig from './components/ResponseConfig';
import Sidebar from './components/Sidebar';
import { api, createWebSocket, isLocalHostname } from './utils/api';
import './index.css';

const defaultStats = { total_endpoints: 0, total_requests: 0, requests_today: 0 };
const compactLayoutQuery = '(max-width: 1180px)';

export default function App() {
  const [endpoints, setEndpoints] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequestTrigger, setNewRequestTrigger] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(compactLayoutQuery).matches : false
  ));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(compactLayoutQuery);
    const handleChange = (event) => {
      setIsCompactLayout(event.matches);
      if (!event.matches) {
        setIsSidebarOpen(false);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!isCompactLayout || !isSidebarOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCompactLayout, isSidebarOpen]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const closeSidebar = () => setIsSidebarOpen(false);
  const openCreateModal = () => {
    setShowCreateModal(true);
    closeSidebar();
  };
  const handleNavigate = (view) => {
    setCurrentView(view);
    closeSidebar();
  };

  const resetWorkspaceState = () => {
    setEndpoints([]);
    setStats(defaultStats);
    setSelectedEndpoint(null);
    setCurrentView('dashboard');
    setShowCreateModal(false);
  };

  useEffect(() => {
    let cancelled = false;

    api.getSession()
      .then((session) => {
        if (cancelled) return;
        setAuthUser(session.data.user || null);
        setSetupRequired(Boolean(session.data.setup_required));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load session:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setSessionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authUser) return;

    let cancelled = false;

    Promise.all([
      api.getEndpoints(),
      api.getStats(),
    ]).then(([endpointsRes, statsRes]) => {
      if (cancelled) return;
      setEndpoints(endpointsRes.data);
      setStats(statsRes.data);
    }).catch((err) => {
      if (cancelled) return;
      console.error('Failed to load data:', err);
      if (err.message === 'Authentication required') {
        resetWorkspaceState();
        setAuthUser(null);
      } else {
        toast.error(err.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      wsRef.current?.close();
      wsRef.current = null;
      return undefined;
    }

    let reconnectTimer = null;
    let disposed = false;

    const connect = () => {
      const ws = createWebSocket();
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_request') {
            setEndpoints(prev => prev.map(ep => {
              if (ep.id === data.endpoint_id) {
                return {
                  ...ep,
                  request_count: (ep.request_count || 0) + 1,
                  last_request_at: data.request?.created_at,
                };
              }
              return ep;
            }));

            setStats(prev => ({
              ...prev,
              total_requests: prev.total_requests + 1,
              requests_today: prev.requests_today + 1,
            }));

            setNewRequestTrigger(prev => prev + 1);
          }
        } catch (err) {
          console.error('WS message error:', err);
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          if (!disposed) {
            connect();
          }
        }, 3000);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [authUser]);

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    setSetupRequired(false);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      closeSidebar();
      resetWorkspaceState();
      setAuthUser(null);
      toast.success('Signed out');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateEndpoint = async (data) => {
    const { expose_publicly, ...endpointData } = data;
    const appIsLocal = isLocalHostname(window.location.hostname);

    try {
      const res = await api.createEndpoint(endpointData);
      let publicTunnelError = null;

      if (expose_publicly && appIsLocal) {
        try {
          await api.startPublicTunnel(window.location.origin);
        } catch (err) {
          publicTunnelError = err.message;
        }
      }

      setEndpoints(prev => [res.data, ...prev]);
      setStats(prev => ({ ...prev, total_endpoints: prev.total_endpoints + 1 }));
      setShowCreateModal(false);
      setSelectedEndpoint(res.data);
      setCurrentView('endpoint');
      toast.success(expose_publicly && (!appIsLocal || !publicTunnelError) ? 'Endpoint created with a public URL' : 'Endpoint created');
      if (publicTunnelError) {
        toast.error(`Endpoint created, but public URL could not start: ${publicTunnelError}`);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteEndpoint = async (id) => {
    try {
      await api.deleteEndpoint(id);
      setEndpoints(prev => prev.filter(ep => ep.id !== id));
      setStats(prev => ({ ...prev, total_endpoints: Math.max(0, prev.total_endpoints - 1) }));
      if (selectedEndpoint?.id === id) {
        setSelectedEndpoint(null);
        setCurrentView('dashboard');
      }
      toast.success('Endpoint deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateEndpoint = async (id, data) => {
    try {
      const res = await api.updateEndpoint(id, data);
      setEndpoints(prev => prev.map(ep => ep.id === id ? { ...ep, ...res.data } : ep));
      setSelectedEndpoint(prev => prev?.id === id ? { ...prev, ...res.data } : prev);
      toast.success('Endpoint updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSelectEndpoint = (endpoint) => {
    setSelectedEndpoint(endpoint);
    setCurrentView('endpoint');
    closeSidebar();
  };

  const currentPanelTitle = currentView === 'settings'
    ? 'Response studio'
    : currentView === 'endpoint'
      ? (selectedEndpoint?.name || selectedEndpoint?.slug || 'Endpoint workspace')
      : 'Workspace overview';

  const currentPanelMeta = currentView === 'settings'
    ? 'Tune headers, status, delay, and forwarding'
    : currentView === 'endpoint'
      ? `/hook/${selectedEndpoint?.slug || 'route'}`
      : `${stats.total_endpoints} routes and ${stats.total_requests} events`;

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            endpoints={endpoints}
            onCreateEndpoint={openCreateModal}
            onSelectEndpoint={handleSelectEndpoint}
            onDeleteEndpoint={handleDeleteEndpoint}
          />
        );
      case 'endpoint':
        return selectedEndpoint ? (
          <EndpointView
            key={selectedEndpoint.id}
            endpoint={selectedEndpoint}
            onUpdate={handleUpdateEndpoint}
            newRequestTrigger={newRequestTrigger}
          />
        ) : null;
      case 'settings':
        return (
          <ResponseConfig
            key={selectedEndpoint ? `${selectedEndpoint.id}:${selectedEndpoint.updated_at}` : 'settings'}
            endpoint={selectedEndpoint}
            onUpdate={handleUpdateEndpoint}
          />
        );
      default:
        return (
          <Dashboard
            stats={stats}
            endpoints={endpoints}
            onCreateEndpoint={openCreateModal}
            onSelectEndpoint={handleSelectEndpoint}
            onDeleteEndpoint={handleDeleteEndpoint}
          />
        );
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'toast-custom',
          duration: 3000,
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.85rem',
          },
        }}
      />

      {sessionLoading ? (
        <div className="auth-loading-screen">
          <div className="auth-loading-card">
            <div className="spinner" />
            <p>Loading workspace...</p>
          </div>
        </div>
      ) : !authUser ? (
        <AuthScreen
          theme={theme}
          toggleTheme={toggleTheme}
          setupRequired={setupRequired}
          onAuthSuccess={handleAuthSuccess}
        />
      ) : (
        <>
          <div className="app-layout">
            {isCompactLayout && (
              <button
                className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`}
                onClick={closeSidebar}
                aria-label="Close navigation"
              />
            )}

            <Sidebar
              currentUser={authUser}
              endpoints={endpoints}
              selectedEndpoint={selectedEndpoint}
              currentView={currentView}
              stats={stats}
              theme={theme}
              toggleTheme={toggleTheme}
              isCompactLayout={isCompactLayout}
              isOpen={isSidebarOpen}
              onClose={closeSidebar}
              onNavigate={handleNavigate}
              onSelectEndpoint={handleSelectEndpoint}
              onCreateEndpoint={openCreateModal}
              onLogout={handleLogout}
            />

            <main className="main-content">
              {isCompactLayout && (
                <div className="mobile-shell-bar">
                  <button
                    className="mobile-shell-menu"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu size={18} />
                  </button>

                  <div className="mobile-shell-context">
                    <span className="mobile-shell-label">HookRadar</span>
                    <strong>{currentPanelTitle}</strong>
                    <span>{currentPanelMeta}</span>
                  </div>

                  <button className="mobile-shell-create" onClick={openCreateModal}>
                    <Plus size={16} />
                    New
                  </button>
                </div>
              )}

              {renderContent()}
            </main>
          </div>

          {showCreateModal && (
            <CreateEndpointModal
              onClose={() => setShowCreateModal(false)}
              onCreate={handleCreateEndpoint}
            />
          )}
        </>
      )}
    </>
  );
}
