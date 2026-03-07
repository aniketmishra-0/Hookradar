import { Webhook, Activity, Zap, Radio, Plus, Trash2, ArrowRight } from 'lucide-react';
import { getWebhookUrl, formatTime } from '../utils/api';

export default function Dashboard({ stats, endpoints, onCreateEndpoint, onSelectEndpoint, onDeleteEndpoint }) {
    return (
        <div className="dashboard">
            {/* Hero Section */}
            <div className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <h1>Welcome to HookRadar</h1>
                    <p>Inspect, debug, and replay your webhooks in real-time. Create an endpoint to get started.</p>
                    <button className="btn btn-primary" onClick={onCreateEndpoint}>
                        <Plus className="icon" />
                        Create Webhook Endpoint
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-icon purple">
                        <Webhook size={24} />
                    </div>
                    <div>
                        <div className="stat-card-value">{stats.total_endpoints}</div>
                        <div className="stat-card-label">Total Endpoints</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon blue">
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="stat-card-value">{stats.total_requests}</div>
                        <div className="stat-card-label">Total Requests</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green">
                        <Zap size={24} />
                    </div>
                    <div>
                        <div className="stat-card-value">{stats.requests_today}</div>
                        <div className="stat-card-label">Requests Today</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <div className="quick-action-card" onClick={onCreateEndpoint}>
                    <div className="quick-action-icon" style={{ background: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}>
                        <Plus size={20} />
                    </div>
                    <h4>New Endpoint</h4>
                    <p>Generate a unique webhook URL to receive and inspect HTTP requests</p>
                </div>
                <div className="quick-action-card" onClick={onCreateEndpoint}>
                    <div className="quick-action-icon" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>
                        <Radio size={20} />
                    </div>
                    <h4>Live Monitor</h4>
                    <p>Watch incoming webhook requests in real-time with WebSocket updates</p>
                </div>
                <div className="quick-action-card" onClick={onCreateEndpoint}>
                    <div className="quick-action-icon" style={{ background: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}>
                        <Zap size={20} />
                    </div>
                    <h4>Custom Responses</h4>
                    <p>Configure custom status codes, headers, and response bodies</p>
                </div>
            </div>

            {/* Endpoints List */}
            {endpoints.length > 0 && (
                <div className="endpoints-list">
                    <div className="endpoints-list-header">
                        <h2>Your Endpoints</h2>
                        <button className="btn btn-secondary btn-sm" onClick={onCreateEndpoint}>
                            <Plus className="icon" />
                            Create New
                        </button>
                    </div>

                    {endpoints.map(ep => (
                        <div key={ep.id} className="endpoint-card" onClick={() => onSelectEndpoint(ep)}>
                            <div className={`endpoint-card-dot ${ep.is_active ? 'active' : 'inactive'}`} />
                            <div className="endpoint-card-info">
                                <div className="endpoint-card-name">{ep.name || `Endpoint ${ep.slug}`}</div>
                                <div className="endpoint-card-slug">{getWebhookUrl(ep.slug)}</div>
                            </div>
                            <div className="endpoint-card-stats">
                                <div className="endpoint-card-stat">
                                    <div className="endpoint-card-stat-value">{ep.request_count || 0}</div>
                                    <div className="endpoint-card-stat-label">Requests</div>
                                </div>
                                <div className="endpoint-card-stat">
                                    <div className="endpoint-card-stat-value">{ep.last_request_at ? formatTime(ep.last_request_at) : '—'}</div>
                                    <div className="endpoint-card-stat-label">Last Hit</div>
                                </div>
                            </div>
                            <div className="endpoint-card-actions" onClick={e => e.stopPropagation()}>
                                <button className="btn btn-ghost btn-icon" onClick={() => onDeleteEndpoint(ep.id)} title="Delete">
                                    <Trash2 className="icon" size={16} />
                                </button>
                                <button className="btn btn-ghost btn-icon" onClick={() => onSelectEndpoint(ep)} title="Open">
                                    <ArrowRight className="icon" size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
