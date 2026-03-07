import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ResponseConfig({ endpoint, onUpdate }) {
    const [status, setStatus] = useState(200);
    const [headers, setHeaders] = useState('{"Content-Type": "application/json"}');
    const [body, setBody] = useState('{"success": true, "message": "Webhook received by HookRadar"}');
    const [delay, setDelay] = useState(0);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (endpoint) {
            setStatus(endpoint.response_status || 200);
            setHeaders(endpoint.response_headers || '{"Content-Type": "application/json"}');
            setBody(endpoint.response_body || '');
            setDelay(endpoint.response_delay || 0);
            setIsActive(endpoint.is_active === 1 || endpoint.is_active === true);
        }
    }, [endpoint]);

    const handleSave = () => {
        // Validate headers JSON
        try {
            JSON.parse(headers);
        } catch {
            toast.error('Headers must be valid JSON');
            return;
        }

        onUpdate(endpoint.id, {
            response_status: parseInt(status),
            response_headers: headers,
            response_body: body,
            response_delay: parseInt(delay),
            is_active: isActive ? 1 : 0,
        });
    };

    const handleReset = () => {
        setStatus(200);
        setHeaders('{"Content-Type": "application/json"}');
        setBody('{"success": true, "message": "Webhook received by HookRadar"}');
        setDelay(0);
        setIsActive(true);
    };

    if (!endpoint) {
        return (
            <div className="settings-panel">
                <div className="empty-state">
                    <p>Select an endpoint to configure its response</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-panel">
            <div className="settings-section">
                <h3>Response Configuration</h3>
                <div className="settings-card">
                    <div className="response-config-grid">
                        <div className="form-group">
                            <label className="form-label">Status Code</label>
                            <select
                                className="form-input"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                            >
                                <option value="200">200 - OK</option>
                                <option value="201">201 - Created</option>
                                <option value="202">202 - Accepted</option>
                                <option value="204">204 - No Content</option>
                                <option value="301">301 - Moved Permanently</option>
                                <option value="302">302 - Found</option>
                                <option value="400">400 - Bad Request</option>
                                <option value="401">401 - Unauthorized</option>
                                <option value="403">403 - Forbidden</option>
                                <option value="404">404 - Not Found</option>
                                <option value="500">500 - Internal Server Error</option>
                                <option value="502">502 - Bad Gateway</option>
                                <option value="503">503 - Service Unavailable</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Response Delay (ms)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={delay}
                                onChange={e => setDelay(e.target.value)}
                                min="0"
                                max="30000"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Response Headers (JSON)</label>
                        <textarea
                            className="form-input mono"
                            value={headers}
                            onChange={e => setHeaders(e.target.value)}
                            rows={4}
                            placeholder='{"Content-Type": "application/json"}'
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Response Body</label>
                        <textarea
                            className="form-input mono"
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            rows={6}
                            placeholder="Response body..."
                        />
                    </div>

                    <div className="toggle-row" style={{ border: 'none', padding: '8px 0' }}>
                        <div>
                            <div className="toggle-label">Endpoint Active</div>
                            <div className="toggle-desc">When disabled, the endpoint will return a 410 Gone response</div>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save className="icon" />
                            Save Configuration
                        </button>
                        <button className="btn btn-secondary" onClick={handleReset}>
                            <RotateCcw className="icon" />
                            Reset Defaults
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
