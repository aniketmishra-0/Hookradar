import { useState, useEffect, useCallback } from 'react';
import {
    Copy, Check, Trash2, Settings, Radio, Clock, Hash,
    Search, Inbox, ArrowRight, RefreshCw, ExternalLink
} from 'lucide-react';
import RequestDetail from './RequestDetail';
import ResponseConfig from './ResponseConfig';
import { api, formatTime, getMethodClass, getStatusClass, getWebhookUrl } from '../utils/api';
import { toast } from 'react-hot-toast';

export default function EndpointView({ endpoint, onUpdate, onDelete, newRequestTrigger }) {
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [totalRequests, setTotalRequests] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [loading, setLoading] = useState(true);

    const webhookUrl = getWebhookUrl(endpoint.slug);

    // Load requests
    const loadRequests = useCallback(async () => {
        try {
            const res = await api.getRequests(endpoint.id);
            setRequests(res.data);
            setTotalRequests(res.total);
        } catch (err) {
            console.error('Failed to load requests:', err);
        } finally {
            setLoading(false);
        }
    }, [endpoint.id]);

    useEffect(() => {
        setLoading(true);
        setSelectedRequest(null);
        setShowConfig(false);
        loadRequests();
    }, [endpoint.id, loadRequests]);

    // Reload when new request comes in
    useEffect(() => {
        if (newRequestTrigger > 0) {
            loadRequests();
        }
    }, [newRequestTrigger, loadRequests]);

    // Copy webhook URL
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            setCopied(true);
            toast.success('URL copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    // Clear all requests
    const handleClearRequests = async () => {
        if (!confirm('Clear all requests for this endpoint?')) return;
        try {
            await api.clearRequests(endpoint.id);
            setRequests([]);
            setTotalRequests(0);
            setSelectedRequest(null);
            toast.success('Requests cleared');
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Delete single request
    const handleDeleteRequest = async (id) => {
        try {
            await api.deleteRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
            setTotalRequests(prev => prev - 1);
            if (selectedRequest?.id === id) setSelectedRequest(null);
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Filter requests
    const filteredRequests = requests.filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return r.method.toLowerCase().includes(q) ||
            r.path.toLowerCase().includes(q) ||
            r.body?.toLowerCase().includes(q);
    });

    if (showConfig) {
        return (
            <div className="endpoint-view">
                {/* Header */}
                <div className="endpoint-header">
                    <div className="endpoint-url-bar">
                        <span className="endpoint-url-method method-POST" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>ANY</span>
                        <span className="endpoint-url-text">
                            {window.location.origin}/hook/<span>{endpoint.slug}</span>
                        </span>
                        <button className="copy-btn" onClick={handleCopy}>
                            {copied ? <Check className="icon" /> : <Copy className="icon" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="top-bar">
                    <div className="top-bar-title">
                        <Settings className="icon" size={18} />
                        Response Configuration
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(false)}>
                        ← Back to Requests
                    </button>
                </div>

                <ResponseConfig endpoint={endpoint} onUpdate={onUpdate} />
            </div>
        );
    }

    return (
        <div className="endpoint-view">
            {/* Header */}
            <div className="endpoint-header">
                <div className="endpoint-url-bar">
                    <span className="endpoint-url-method method-POST" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>ANY</span>
                    <span className="endpoint-url-text">
                        {window.location.origin}/hook/<span>{endpoint.slug}</span>
                    </span>
                    <button className="copy-btn" onClick={handleCopy}>
                        {copied ? <Check className="icon" /> : <Copy className="icon" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <div className="endpoint-meta">
                    <div className="endpoint-meta-item">
                        <Hash className="icon" />
                        {endpoint.name || endpoint.slug}
                    </div>
                    <div className="endpoint-meta-item">
                        <Clock className="icon" />
                        Created {formatTime(endpoint.created_at)}
                    </div>
                    <div className="endpoint-meta-item">
                        <Activity className="icon" />
                        {totalRequests} requests
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowConfig(true)}>
                            <Settings className="icon" size={14} />
                            Configure
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={loadRequests}>
                            <RefreshCw className="icon" size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={handleClearRequests}>
                            <Trash2 className="icon" size={14} />
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Body: Request List + Detail */}
            <div className="endpoint-body">
                {/* Request List Panel */}
                <div className="request-list-panel">
                    <div className="request-list-header">
                        <div className="request-list-title">
                            <Inbox size={16} />
                            Incoming Requests
                            {totalRequests > 0 && (
                                <span className="request-list-count">{totalRequests}</span>
                            )}
                        </div>
                        <div className="live-indicator">
                            <div className="live-dot" />
                            Live
                        </div>
                    </div>

                    <div className="request-list-search">
                        <input
                            type="text"
                            placeholder="Search by method, path, body..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="request-list-items">
                        {loading ? (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <RefreshCw className="icon animate-spin" size={24} />
                                <p>Loading requests...</p>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="empty-state" style={{ padding: '32px' }}>
                                <Inbox className="icon" size={36} />
                                <h3>{searchQuery ? 'No matching requests' : 'No requests yet'}</h3>
                                <p>
                                    {searchQuery
                                        ? 'Try a different search query'
                                        : 'Send a webhook to your URL to see it appear here in real-time'
                                    }
                                </p>
                            </div>
                        ) : (
                            filteredRequests.map((req, index) => (
                                <div
                                    key={req.id}
                                    className={`request-item ${selectedRequest?.id === req.id ? 'active' : ''} ${index === 0 ? 'new-request' : ''}`}
                                    onClick={() => setSelectedRequest(req)}
                                >
                                    <span className={`request-method ${getMethodClass(req.method)}`}>
                                        {req.method}
                                    </span>
                                    <div className="request-info">
                                        <div className="request-path">{req.path || '/'}</div>
                                        <div className="request-time">{formatTime(req.created_at)}</div>
                                    </div>
                                    <span className={`request-status ${getStatusClass(req.response_status)}`}>
                                        {req.response_status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Request Detail Panel */}
                <div className="request-detail">
                    {selectedRequest ? (
                        <RequestDetail
                            request={selectedRequest}
                            onDelete={handleDeleteRequest}
                            webhookUrl={webhookUrl}
                        />
                    ) : (
                        <div className="request-detail-empty">
                            <ArrowRight className="icon" size={48} />
                            <p>Select a request to view its details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Activity({ className, size }) {
    return (
        <svg className={className} width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
    );
}
