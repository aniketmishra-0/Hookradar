import {
    Activity,
    Clock3,
    LayoutDashboard,
    LogOut,
    Moon,
    Plus,
    Radio,
    ShieldCheck,
    Sparkles,
    Sun,
    Webhook,
    X,
} from 'lucide-react';
import { formatTime } from '../utils/api';

const isEndpointActive = (endpoint) => endpoint.is_active === 1 || endpoint.is_active === true;

export default function Sidebar({
    currentUser,
    endpoints,
    selectedEndpoint,
    currentView,
    stats,
    theme,
    toggleTheme,
    isCompactLayout,
    isOpen,
    onClose,
    onNavigate,
    onSelectEndpoint,
    onCreateEndpoint,
    onLogout,
}) {
    const activeEndpoints = endpoints.filter(isEndpointActive).length;
    const leadingEndpoint = [...endpoints].sort((a, b) => (b.request_count || 0) - (a.request_count || 0))[0] || null;
    const recentEndpoints = [...endpoints]
        .sort((a, b) => new Date(b.last_request_at || b.created_at || 0) - new Date(a.last_request_at || a.created_at || 0))
        .slice(0, 6);

    const handleNavigate = (view) => {
        onNavigate(view);
        if (isCompactLayout) {
            onClose();
        }
    };

    const handleSelectRoute = (endpoint) => {
        onSelectEndpoint(endpoint);
        if (isCompactLayout) {
            onClose();
        }
    };

    const handleCreate = () => {
        onCreateEndpoint();
        if (isCompactLayout) {
            onClose();
        }
    };

    const handleLogout = () => {
        onLogout();
        if (isCompactLayout) {
            onClose();
        }
    };

    return (
        <aside className={`sidebar ${isCompactLayout ? 'sidebar-compact' : ''} ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-header-row">
                    <button className="sidebar-logo" onClick={() => handleNavigate('dashboard')}>
                        <div className="sidebar-logo-icon">
                            <Webhook className="sidebar-logo-glyph" />
                        </div>
                        <div>
                            <div className="sidebar-logo-text">HookRadar</div>
                            <span className="sidebar-logo-badge">Control deck</span>
                        </div>
                    </button>

                    {isCompactLayout && (
                        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation">
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="sidebar-nav">
                <div className="sidebar-workspace-card">
                    <div className="sidebar-workspace-header">
                        <span>Workspace pulse</span>
                        <strong>{stats.requests_today} today</strong>
                    </div>

                    <div className="sidebar-stats">
                        <div className="sidebar-stat">
                            <div className="sidebar-stat-value">{stats.total_endpoints}</div>
                            <div className="sidebar-stat-label">Routes</div>
                        </div>
                        <div className="sidebar-stat">
                            <div className="sidebar-stat-value">{stats.total_requests}</div>
                            <div className="sidebar-stat-label">Events</div>
                        </div>
                        <div className="sidebar-stat">
                            <div className="sidebar-stat-value">{activeEndpoints}</div>
                            <div className="sidebar-stat-label">Live</div>
                        </div>
                    </div>

                    {leadingEndpoint ? (
                        <div className="sidebar-workspace-copy">
                            <Sparkles size={14} />
                            <span>{leadingEndpoint.name || leadingEndpoint.slug} is currently your busiest endpoint.</span>
                        </div>
                    ) : (
                        <div className="sidebar-workspace-copy">
                            <Radio size={14} />
                            <span>Create a route to start receiving live webhook traffic.</span>
                        </div>
                    )}

                    <button className="sidebar-primary-link" onClick={handleCreate}>
                        <Plus className="icon" />
                        New endpoint
                    </button>
                </div>

                <div className="sidebar-section-title">Navigate</div>

                <button
                    className={`sidebar-link ${currentView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => handleNavigate('dashboard')}
                >
                    <LayoutDashboard className="icon" />
                    <span>Workspace overview</span>
                </button>

                <button className="sidebar-link" onClick={handleCreate}>
                    <Plus className="icon" />
                    <span>Create route</span>
                </button>

                {selectedEndpoint && (
                    <button
                        className={`sidebar-link ${currentView === 'settings' ? 'active' : ''}`}
                        onClick={() => handleNavigate('settings')}
                    >
                        <ShieldCheck className="icon" />
                        <span>Response studio</span>
                    </button>
                )}

                <div className="sidebar-section-title">
                    Hot routes
                    <span className="sidebar-link-badge">{endpoints.length}</span>
                </div>

                <div className="sidebar-endpoints">
                    {recentEndpoints.length === 0 ? (
                        <div className="sidebar-empty-copy">
                            No endpoints yet. Build one to start the live request stream.
                        </div>
                    ) : (
                        recentEndpoints.map((endpoint) => {
                            const active = isEndpointActive(endpoint);

                            return (
                                <button
                                    key={endpoint.id}
                                    className={`sidebar-endpoint-item ${selectedEndpoint?.id === endpoint.id ? 'active' : ''}`}
                                    onClick={() => handleSelectRoute(endpoint)}
                                >
                                    <div className={`sidebar-endpoint-dot ${active ? '' : 'inactive'}`} />
                                    <div className="sidebar-endpoint-copy">
                                        <span className="sidebar-endpoint-slug">{endpoint.name || endpoint.slug}</span>
                                        <span className="sidebar-endpoint-meta">
                                            {endpoint.last_request_at
                                                ? `Last hit ${formatTime(endpoint.last_request_at)}`
                                                : `Created ${formatTime(endpoint.created_at)}`}
                                        </span>
                                    </div>
                                    <span className="sidebar-endpoint-count">{endpoint.request_count || 0}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="sidebar-account-card">
                    <div className="sidebar-account-label">Signed in as</div>
                    <div className="sidebar-account-name">{currentUser.name || currentUser.email}</div>
                    <div className="sidebar-account-email">{currentUser.email}</div>
                    <div className="sidebar-account-plan">{currentUser.plan || 'free'} plan</div>
                    {selectedEndpoint && (
                        <div className="sidebar-account-context">
                            <Activity size={14} />
                            <span>{selectedEndpoint.name || selectedEndpoint.slug} is open in the workspace.</span>
                        </div>
                    )}
                </div>

                <div className="sidebar-account-actions">
                    <button
                        className="sidebar-link"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {theme === 'dark' ? <Sun className="icon" /> : <Moon className="icon" />}
                        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </button>

                    <button className="sidebar-link" onClick={handleLogout}>
                        <LogOut className="icon" />
                        <span>Sign out</span>
                    </button>
                </div>
            </div>

            <div className="sidebar-footer">
                <div className="sidebar-footer-copy">
                    <Clock3 size={14} />
                    <span>{leadingEndpoint?.last_request_at ? `Last event ${formatTime(leadingEndpoint.last_request_at)}` : 'Waiting for the first event'}</span>
                </div>
            </div>
        </aside>
    );
}
