import { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EndpointView from './components/EndpointView';
import ResponseConfig from './components/ResponseConfig';
import CreateEndpointModal from './components/CreateEndpointModal';
import { api, createWebSocket } from './utils/api';
import './index.css';

export default function App() {
  const [endpoints, setEndpoints] = useState([]);
  const [stats, setStats] = useState({ total_endpoints: 0, total_requests: 0, requests_today: 0 });
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequestTrigger, setNewRequestTrigger] = useState(0);
  const wsRef = useRef(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [endpointsRes, statsRes] = await Promise.all([
        api.getEndpoints(),
        api.getStats()
      ]);
      setEndpoints(endpointsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global WebSocket connection
  useEffect(() => {
    const ws = createWebSocket();
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_request') {
          // Update endpoints list
          setEndpoints(prev => prev.map(ep => {
            if (ep.id === data.endpoint_id) {
              return {
                ...ep,
                request_count: (ep.request_count || 0) + 1,
                last_request_at: data.request?.created_at
              };
            }
            return ep;
          }));

          // Update stats
          setStats(prev => ({
            ...prev,
            total_requests: prev.total_requests + 1,
            requests_today: prev.requests_today + 1
          }));

          // Trigger request list refresh
          setNewRequestTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current === ws) {
          const newWs = createWebSocket();
          wsRef.current = newWs;
        }
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Handle endpoint creation
  const handleCreateEndpoint = async (data) => {
    try {
      const res = await api.createEndpoint(data);
      setEndpoints(prev => [res.data, ...prev]);
      setStats(prev => ({ ...prev, total_endpoints: prev.total_endpoints + 1 }));
      setShowCreateModal(false);
      setSelectedEndpoint(res.data);
      setCurrentView('endpoint');
      toast.success('Endpoint created!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handle endpoint deletion
  const handleDeleteEndpoint = async (id) => {
    try {
      await api.deleteEndpoint(id);
      setEndpoints(prev => prev.filter(ep => ep.id !== id));
      setStats(prev => ({ ...prev, total_endpoints: prev.total_endpoints - 1 }));
      if (selectedEndpoint?.id === id) {
        setSelectedEndpoint(null);
        setCurrentView('dashboard');
      }
      toast.success('Endpoint deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Handle endpoint update
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

  // Navigate to endpoint
  const handleSelectEndpoint = (endpoint) => {
    setSelectedEndpoint(endpoint);
    setCurrentView('endpoint');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            endpoints={endpoints}
            onCreateEndpoint={() => setShowCreateModal(true)}
            onSelectEndpoint={handleSelectEndpoint}
            onDeleteEndpoint={handleDeleteEndpoint}
          />
        );
      case 'endpoint':
        return selectedEndpoint ? (
          <EndpointView
            endpoint={selectedEndpoint}
            onUpdate={handleUpdateEndpoint}
            onDelete={handleDeleteEndpoint}
            newRequestTrigger={newRequestTrigger}
          />
        ) : null;
      case 'settings':
        return (
          <ResponseConfig
            endpoint={selectedEndpoint}
            onUpdate={handleUpdateEndpoint}
          />
        );
      default:
        return <Dashboard stats={stats} endpoints={endpoints} onCreateEndpoint={() => setShowCreateModal(true)} onSelectEndpoint={handleSelectEndpoint} onDeleteEndpoint={handleDeleteEndpoint} />;
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
            background: '#22222e',
            color: '#f1f1f4',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.85rem'
          },
        }}
      />

      <div className="app-layout">
        <Sidebar
          endpoints={endpoints}
          selectedEndpoint={selectedEndpoint}
          currentView={currentView}
          stats={stats}
          onNavigate={setCurrentView}
          onSelectEndpoint={handleSelectEndpoint}
          onCreateEndpoint={() => setShowCreateModal(true)}
        />

        <main className="main-content">
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
  );
}
