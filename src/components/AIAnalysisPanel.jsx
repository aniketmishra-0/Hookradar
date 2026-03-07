import { useState, useEffect } from 'react';
import {
    Brain, Sparkles, Shield, Code, BarChart3, AlertTriangle,
    CheckCircle, Info, Copy, Check, ChevronDown, ChevronUp,
    Zap, Globe, FileCode, Bug
} from 'lucide-react';
import { fullAnalysis, analyzePatterns, detectWebhookSource, validatePayload, generateHandlerCode } from '../utils/analyzer';

export default function AIAnalysisPanel({ request, requests, endpoint }) {
    const [analysis, setAnalysis] = useState(null);
    const [patterns, setPatterns] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [codeLanguage, setCodeLanguage] = useState('node');
    const [copied, setCopied] = useState(false);
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        if (request) {
            const result = fullAnalysis(request);
            setAnalysis(result);
        }
    }, [request]);

    useEffect(() => {
        if (requests && requests.length > 0) {
            const result = analyzePatterns(requests);
            setPatterns(result);
        }
    }, [requests]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleSection = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!request && !requests) {
        return (
            <div className="ai-panel-empty">
                <Brain size={48} strokeWidth={1.5} />
                <h3>AI Analysis</h3>
                <p>Select a request to analyze or view endpoint patterns</p>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Sparkles },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'code', label: 'Code Gen', icon: Code },
        { id: 'patterns', label: 'Patterns', icon: BarChart3 },
    ];

    return (
        <div className="ai-panel">
            <div className="ai-panel-header">
                <div className="ai-panel-title">
                    <Brain size={18} />
                    <span>AI Analysis</span>
                    <span className="ai-badge">Smart</span>
                </div>
            </div>

            <div className="ai-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="ai-content">
                {/* ====== OVERVIEW TAB ====== */}
                {activeTab === 'overview' && analysis && (
                    <div className="ai-overview">
                        {/* Source Detection */}
                        <div className="ai-card ai-source-card">
                            <div className="ai-card-header">
                                <Globe size={16} />
                                <span>Source Detection</span>
                            </div>
                            <div className="ai-source-result">
                                <span className="ai-source-icon">{analysis.source.icon}</span>
                                <div className="ai-source-info">
                                    <span className="ai-source-name">
                                        {analysis.source.detected ? analysis.source.source : 'Unknown Source'}
                                    </span>
                                    {analysis.source.detected && (
                                        <div className="ai-confidence-bar">
                                            <div
                                                className="ai-confidence-fill"
                                                style={{ width: `${analysis.source.confidence}%` }}
                                            />
                                            <span>{analysis.source.confidence}% confidence</span>
                                        </div>
                                    )}
                                    {!analysis.source.detected && (
                                        <span className="ai-source-hint">Could not identify webhook source</span>
                                    )}
                                </div>
                            </div>
                            {analysis.source.allMatches.length > 1 && (
                                <div className="ai-other-matches">
                                    <span className="ai-label">Other possible matches:</span>
                                    {analysis.source.allMatches.slice(1).map((m, i) => (
                                        <span key={i} className="ai-match-tag">
                                            {m.icon} {m.source} ({m.confidence}%)
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Validation Summary */}
                        <div className="ai-card">
                            <div className="ai-card-header">
                                <CheckCircle size={16} />
                                <span>Payload Health</span>
                                <span className={`ai-score ${analysis.validation.score >= 80 ? 'good' : analysis.validation.score >= 50 ? 'warn' : 'bad'}`}>
                                    {analysis.validation.score}/100
                                </span>
                            </div>
                            <div className="ai-validation-summary">{analysis.validation.summary}</div>

                            {analysis.validation.issues.map((issue, i) => (
                                <div key={i} className="ai-issue error">
                                    <Bug size={14} />
                                    <div>
                                        <strong>{issue.title}</strong>
                                        <p>{issue.message}</p>
                                        {issue.fix && <span className="ai-fix">💡 Fix: {issue.fix}</span>}
                                    </div>
                                </div>
                            ))}

                            {analysis.validation.warnings.map((warn, i) => (
                                <div key={i} className="ai-issue warning">
                                    <AlertTriangle size={14} />
                                    <div>
                                        <strong>{warn.title}</strong>
                                        <p>{warn.message}</p>
                                        {warn.fix && <span className="ai-fix">💡 Fix: {warn.fix}</span>}
                                    </div>
                                </div>
                            ))}

                            {analysis.validation.info.map((info, i) => (
                                <div key={i} className="ai-issue info">
                                    <Info size={14} />
                                    <div>
                                        <strong>{info.title}</strong>
                                        <p>{info.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ====== SECURITY TAB ====== */}
                {activeTab === 'security' && analysis && (
                    <div className="ai-security">
                        <div className="ai-card">
                            <div className="ai-card-header">
                                <Shield size={16} />
                                <span>Security Analysis</span>
                            </div>

                            {/* Signature check */}
                            {(() => {
                                const headers = typeof request.headers === 'string' ? JSON.parse(request.headers) : request.headers;
                                const sigHeaders = [
                                    'x-hub-signature-256', 'stripe-signature', 'x-razorpay-signature',
                                    'x-slack-signature', 'x-shopify-hmac-sha256', 'x-twilio-signature',
                                    'paypal-transmission-sig', 'x-signature-ed25519'
                                ];
                                const foundSig = sigHeaders.find(h => headers[h]);

                                return (
                                    <>
                                        <div className={`ai-security-item ${foundSig ? 'pass' : 'fail'}`}>
                                            <div className="ai-security-icon">
                                                {foundSig ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                            </div>
                                            <div>
                                                <strong>Webhook Signature</strong>
                                                <p>{foundSig
                                                    ? `✅ Signature present: ${foundSig}`
                                                    : '⚠️ No signature header detected'
                                                }</p>
                                            </div>
                                        </div>

                                        <div className={`ai-security-item ${headers['content-type']?.includes('json') ? 'pass' : 'warn'}`}>
                                            <div className="ai-security-icon">
                                                {headers['content-type']?.includes('json') ? <CheckCircle size={20} /> : <Info size={20} />}
                                            </div>
                                            <div>
                                                <strong>Content Type</strong>
                                                <p>{headers['content-type'] || 'Not specified'}</p>
                                            </div>
                                        </div>

                                        <div className="ai-security-item info">
                                            <div className="ai-security-icon"><Info size={20} /></div>
                                            <div>
                                                <strong>IP Address</strong>
                                                <p>{request.ip_address || 'Unknown'}</p>
                                            </div>
                                        </div>

                                        <div className="ai-security-item info">
                                            <div className="ai-security-icon"><Info size={20} /></div>
                                            <div>
                                                <strong>User Agent</strong>
                                                <p>{headers['user-agent'] || 'Not specified'}</p>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="ai-card">
                            <div className="ai-card-header">
                                <Zap size={16} />
                                <span>Security Recommendations</span>
                            </div>
                            <div className="ai-recommendations">
                                <div className="ai-rec-item">
                                    <span className="ai-rec-num">1</span>
                                    <div>
                                        <strong>Always verify signatures</strong>
                                        <p>Use HMAC-SHA256 to verify webhook authenticity in production</p>
                                    </div>
                                </div>
                                <div className="ai-rec-item">
                                    <span className="ai-rec-num">2</span>
                                    <div>
                                        <strong>Use HTTPS endpoints</strong>
                                        <p>Never expose webhook endpoints over plain HTTP</p>
                                    </div>
                                </div>
                                <div className="ai-rec-item">
                                    <span className="ai-rec-num">3</span>
                                    <div>
                                        <strong>Implement rate limiting</strong>
                                        <p>Protect against webhook flooding attacks</p>
                                    </div>
                                </div>
                                <div className="ai-rec-item">
                                    <span className="ai-rec-num">4</span>
                                    <div>
                                        <strong>Process asynchronously</strong>
                                        <p>Queue webhook processing — respond 200 immediately</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ====== CODE GEN TAB ====== */}
                {activeTab === 'code' && analysis && (
                    <div className="ai-codegen">
                        <div className="ai-card">
                            <div className="ai-card-header">
                                <FileCode size={16} />
                                <span>Generated Handler</span>
                                <div className="ai-lang-toggle">
                                    <button
                                        className={codeLanguage === 'node' ? 'active' : ''}
                                        onClick={() => setCodeLanguage('node')}
                                    >
                                        Node.js
                                    </button>
                                    <button
                                        className={codeLanguage === 'python' ? 'active' : ''}
                                        onClick={() => setCodeLanguage('python')}
                                    >
                                        Python
                                    </button>
                                </div>
                            </div>

                            <div className="ai-code-block">
                                <button
                                    className="ai-copy-btn"
                                    onClick={() => copyToClipboard(analysis.handlerCode[codeLanguage])}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <pre><code>{analysis.handlerCode[codeLanguage]}</code></pre>
                            </div>

                            <div className="ai-code-info">
                                <Info size={14} />
                                <span>
                                    Auto-generated from the captured {request.method} request
                                    {analysis.source.detected && ` for ${analysis.source.source}`}.
                                    Includes signature verification and error handling.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ====== PATTERNS TAB ====== */}
                {activeTab === 'patterns' && (
                    <div className="ai-patterns">
                        {patterns ? (
                            <>
                                <div className="ai-card">
                                    <div className="ai-card-header">
                                        <BarChart3 size={16} />
                                        <span>Request Patterns</span>
                                        <span className="ai-pattern-count">{patterns.totalRequests} requests analyzed</span>
                                    </div>
                                </div>

                                {patterns.patterns.map((pattern, i) => (
                                    <div key={i} className="ai-card ai-pattern-card">
                                        <div
                                            className="ai-pattern-header"
                                            onClick={() => toggleSection(`pattern-${i}`)}
                                        >
                                            <span>{pattern.title}</span>
                                            {expandedSections[`pattern-${i}`] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                        <div className="ai-pattern-desc">{pattern.description}</div>

                                        {expandedSections[`pattern-${i}`] && pattern.data && (
                                            <div className="ai-pattern-data">
                                                {typeof pattern.data === 'object' && Object.entries(pattern.data).map(([key, val]) => (
                                                    <div key={key} className="ai-pattern-row">
                                                        <span className="ai-pattern-key">{key}</span>
                                                        <span className="ai-pattern-val">{typeof val === 'number' ? val : JSON.stringify(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="ai-card">
                                <div className="ai-empty-patterns">
                                    <BarChart3 size={32} />
                                    <p>Need more requests to detect patterns</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
