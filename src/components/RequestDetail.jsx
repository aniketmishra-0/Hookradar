import { useState } from 'react';
import { Copy, Check, Trash2, Send, Clock, Hash, ArrowUpRight, FileText, Code2, Globe } from 'lucide-react';
import { api, getMethodClass, getStatusClass, formatTime, formatBytes, prettyJSON, tryParseJSON } from '../utils/api';
import { toast } from 'react-hot-toast';

export default function RequestDetail({ request, onDelete, webhookUrl }) {
    const [activeTab, setActiveTab] = useState('headers');
    const [showReplay, setShowReplay] = useState(false);
    const [replayUrl, setReplayUrl] = useState('');
    const [replayResult, setReplayResult] = useState(null);
    const [replaying, setReplaying] = useState(false);
    const [copied, setCopied] = useState('');

    const headers = tryParseJSON(request.headers) || {};
    const queryParams = tryParseJSON(request.query_params) || {};
    const headerEntries = Object.entries(headers);
    const queryEntries = Object.entries(queryParams);

    const handleCopy = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied(''), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleReplay = async () => {
        if (!replayUrl) {
            toast.error('Enter a target URL');
            return;
        }
        setReplaying(true);
        try {
            const res = await api.replayRequest(request.id, replayUrl);
            setReplayResult(res.data);
            toast.success('Request replayed successfully!');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setReplaying(false);
        }
    };

    const generateCurlCommand = () => {
        let curl = `curl -X ${request.method}`;

        // Add important headers
        ['content-type', 'authorization', 'x-api-key', 'accept'].forEach(h => {
            if (headers[h]) {
                curl += ` \\\n  -H "${h}: ${headers[h]}"`;
            }
        });

        if (request.body && !['GET', 'HEAD'].includes(request.method)) {
            curl += ` \\\n  -d '${request.body.replace(/'/g, "\\'")}'`;
        }

        curl += ` \\\n  "${webhookUrl}${request.path !== '/' ? request.path : ''}"`;

        return curl;
    };

    const tabs = [
        { id: 'headers', label: 'Headers', count: headerEntries.length },
        { id: 'body', label: 'Body', count: request.body ? 1 : 0 },
        { id: 'query', label: 'Query', count: queryEntries.length },
        { id: 'curl', label: 'cURL', count: null },
    ];

    return (
        <div>
            {/* Header */}
            <div className="request-detail-header">
                <div className="request-detail-title">
                    <span className={`request-method ${getMethodClass(request.method)}`} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        {request.method}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {request.path || '/'}
                    </span>
                    <span className={`request-status ${getStatusClass(request.response_status)}`}>
                        {request.response_status}
                    </span>
                </div>
                <div className="request-detail-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowReplay(!showReplay)} title="Replay/Forward">
                        <Send className="icon" size={14} />
                        Replay
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(request.id)} title="Delete">
                        <Trash2 className="icon" size={14} />
                    </button>
                </div>
            </div>

            {/* Replay Panel */}
            {showReplay && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowUpRight size={14} />
                        Forward this request to another URL
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="url"
                            placeholder="https://example.com/webhook"
                            value={replayUrl}
                            onChange={e => setReplayUrl(e.target.value)}
                            className="form-input mono"
                            style={{ flex: 1, padding: '8px 12px' }}
                        />
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleReplay}
                            disabled={replaying}
                        >
                            {replaying ? 'Sending...' : 'Send'}
                        </button>
                    </div>

                    {replayResult && (
                        <div className="replay-result">
                            <div className="replay-result-status">
                                <span className={`request-status ${getStatusClass(replayResult.status)}`}>
                                    {replayResult.status}
                                </span>
                                Response received
                            </div>
                            <div className="replay-result-body">{prettyJSON(replayResult.body)}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Meta info */}
            <div style={{ padding: '10px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-primary)', flexWrap: 'wrap' }}>
                <div className="endpoint-meta-item">
                    <Clock className="icon" />
                    {formatTime(request.created_at)}
                </div>
                <div className="endpoint-meta-item">
                    <FileText className="icon" />
                    {formatBytes(request.size)}
                </div>
                <div className="endpoint-meta-item">
                    <Globe className="icon" />
                    {request.ip_address || 'Unknown'}
                </div>
                {request.response_time > 0 && (
                    <div className="endpoint-meta-item">
                        <Clock className="icon" />
                        {request.response_time}ms
                    </div>
                )}
                {request.content_type && (
                    <div className="endpoint-meta-item">
                        <Code2 className="icon" />
                        {request.content_type}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="detail-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                            <span className="detail-tab-badge">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="detail-content">
                {activeTab === 'headers' && (
                    <div>
                        {headerEntries.length > 0 ? (
                            <table className="kv-table">
                                <tbody>
                                    {headerEntries.map(([key, value]) => (
                                        <tr key={key}>
                                            <td>{key}</td>
                                            <td>
                                                {typeof value === 'string' ? value : JSON.stringify(value)}
                                                <button
                                                    className="copy-btn"
                                                    onClick={() => handleCopy(typeof value === 'string' ? value : JSON.stringify(value), key)}
                                                    style={{ marginLeft: '8px' }}
                                                >
                                                    {copied === key ? <Check className="icon" size={12} /> : <Copy className="icon" size={12} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state" style={{ padding: '24px' }}>
                                <p>No headers</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'body' && (
                    <div>
                        {request.body ? (
                            <div className="code-block">
                                <div className="code-block-header">
                                    <span>{request.content_type || 'Raw body'}</span>
                                    <button
                                        className="copy-btn"
                                        onClick={() => handleCopy(prettyJSON(request.body), 'body')}
                                    >
                                        {copied === 'body' ? <Check className="icon" /> : <Copy className="icon" />}
                                        {copied === 'body' ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <pre className="code-block-body">{prettyJSON(request.body)}</pre>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '24px' }}>
                                <p>No request body</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'query' && (
                    <div>
                        {queryEntries.length > 0 ? (
                            <table className="kv-table">
                                <tbody>
                                    {queryEntries.map(([key, value]) => (
                                        <tr key={key}>
                                            <td>{key}</td>
                                            <td>{typeof value === 'string' ? value : JSON.stringify(value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state" style={{ padding: '24px' }}>
                                <p>No query parameters</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'curl' && (
                    <div className="code-block">
                        <div className="code-block-header">
                            <span>cURL command</span>
                            <button
                                className="copy-btn"
                                onClick={() => handleCopy(generateCurlCommand(), 'curl')}
                            >
                                {copied === 'curl' ? <Check className="icon" /> : <Copy className="icon" />}
                                {copied === 'curl' ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <pre className="code-block-body">{generateCurlCommand()}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}
