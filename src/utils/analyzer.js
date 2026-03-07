// Smart Webhook Analyzer — AI-powered analysis without external API
// Detects webhook sources, validates payloads, generates handler code, and finds issues

// ==================== Webhook Source Detection ====================
const WEBHOOK_SIGNATURES = {
    stripe: {
        name: 'Stripe',
        icon: '💳',
        color: '#635BFF',
        headerPatterns: {
            'stripe-signature': true,
        },
        bodyPatterns: ['type', 'data.object', 'livemode', 'api_version'],
        eventPrefix: ['charge.', 'customer.', 'invoice.', 'payment_intent.', 'checkout.session.'],
    },
    github: {
        name: 'GitHub',
        icon: '🐙',
        color: '#24292e',
        headerPatterns: {
            'x-github-event': true,
            'x-github-delivery': true,
            'x-hub-signature-256': true,
        },
        bodyPatterns: ['action', 'sender', 'repository'],
        eventPrefix: ['push', 'pull_request', 'issues', 'star', 'fork'],
    },
    razorpay: {
        name: 'Razorpay',
        icon: '💰',
        color: '#072654',
        headerPatterns: {
            'x-razorpay-signature': true,
        },
        bodyPatterns: ['entity', 'account_id', 'event'],
        eventPrefix: ['payment.', 'order.', 'invoice.', 'subscription.'],
    },
    slack: {
        name: 'Slack',
        icon: '💬',
        color: '#4A154B',
        headerPatterns: {
            'x-slack-signature': true,
            'x-slack-request-timestamp': true,
        },
        bodyPatterns: ['token', 'team_id', 'event', 'type'],
        eventPrefix: ['message', 'app_mention', 'reaction_added'],
    },
    shopify: {
        name: 'Shopify',
        icon: '🛒',
        color: '#96bf48',
        headerPatterns: {
            'x-shopify-topic': true,
            'x-shopify-hmac-sha256': true,
            'x-shopify-shop-domain': true,
        },
        bodyPatterns: ['id', 'admin_graphql_api_id'],
        eventPrefix: ['orders/', 'products/', 'customers/'],
    },
    twilio: {
        name: 'Twilio',
        icon: '📱',
        color: '#F22F46',
        headerPatterns: {
            'x-twilio-signature': true,
        },
        bodyPatterns: ['AccountSid', 'ApiVersion', 'SmsSid', 'SmsStatus'],
        eventPrefix: [],
    },
    sendgrid: {
        name: 'SendGrid',
        icon: '📧',
        color: '#1A82E2',
        headerPatterns: {},
        bodyPatterns: ['email', 'event', 'sg_event_id', 'sg_message_id'],
        eventPrefix: ['delivered', 'bounce', 'open', 'click'],
    },
    discord: {
        name: 'Discord',
        icon: '🎮',
        color: '#5865F2',
        headerPatterns: {
            'x-signature-ed25519': true,
            'x-signature-timestamp': true,
        },
        bodyPatterns: ['type', 'token', 'guild_id'],
        eventPrefix: [],
    },
    paypal: {
        name: 'PayPal',
        icon: '💵',
        color: '#003087',
        headerPatterns: {
            'paypal-transmission-id': true,
            'paypal-transmission-sig': true,
        },
        bodyPatterns: ['event_type', 'resource', 'summary'],
        eventPrefix: ['PAYMENT.', 'BILLING.', 'CHECKOUT.ORDER.'],
    },
    jira: {
        name: 'Jira',
        icon: '📋',
        color: '#0052CC',
        headerPatterns: {
            'x-atlassian-webhook-identifier': true,
        },
        bodyPatterns: ['webhookEvent', 'issue', 'user'],
        eventPrefix: ['jira:issue_', 'project_'],
    },
};

// ==================== Source Detection ====================
export function detectWebhookSource(headers, body) {
    const headerObj = typeof headers === 'string' ? JSON.parse(headers) : headers;
    let bodyObj = {};
    try {
        bodyObj = typeof body === 'string' ? JSON.parse(body) : (body || {});
    } catch {
        bodyObj = {};
    }

    const scores = {};

    for (const [key, sig] of Object.entries(WEBHOOK_SIGNATURES)) {
        let score = 0;

        // Check headers
        for (const headerKey of Object.keys(sig.headerPatterns)) {
            if (headerObj[headerKey] || headerObj[headerKey.toLowerCase()]) {
                score += 30;
            }
        }

        // Check body patterns
        for (const pattern of sig.bodyPatterns) {
            const keys = pattern.split('.');
            let val = bodyObj;
            for (const k of keys) {
                if (val && typeof val === 'object') val = val[k];
                else { val = undefined; break; }
            }
            if (val !== undefined) score += 10;
        }

        // Check event prefix
        const eventField = bodyObj.type || bodyObj.event || bodyObj.event_type || bodyObj.webhookEvent || '';
        for (const prefix of sig.eventPrefix) {
            if (typeof eventField === 'string' && eventField.startsWith(prefix)) {
                score += 20;
            }
        }

        if (score > 0) scores[key] = score;
    }

    // Get top match
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] >= 20) {
        const match = WEBHOOK_SIGNATURES[sorted[0][0]];
        return {
            detected: true,
            source: match.name,
            icon: match.icon,
            color: match.color,
            confidence: Math.min(sorted[0][1], 100),
            allMatches: sorted.map(([key, score]) => ({
                source: WEBHOOK_SIGNATURES[key].name,
                icon: WEBHOOK_SIGNATURES[key].icon,
                confidence: Math.min(score, 100),
            })),
        };
    }

    return { detected: false, source: 'Unknown', icon: '🔗', confidence: 0, allMatches: [] };
}

// ==================== Payload Validation ====================
export function validatePayload(headers, body) {
    const issues = [];
    const warnings = [];
    const info = [];

    const headerObj = typeof headers === 'string' ? JSON.parse(headers) : headers;

    // Check content type
    const contentType = headerObj['content-type'] || '';
    if (!contentType) {
        warnings.push({
            type: 'warning',
            title: 'No Content-Type Header',
            message: 'Request is missing Content-Type header. This is common for GET requests.',
            fix: 'Add Content-Type: application/json header',
        });
    }

    // Validate JSON body
    if (body && contentType.includes('json')) {
        try {
            JSON.parse(body);
            info.push({
                type: 'info',
                title: 'Valid JSON',
                message: 'Request body is valid JSON',
            });
        } catch (e) {
            issues.push({
                type: 'error',
                title: 'Invalid JSON Body',
                message: `JSON parse error: ${e.message}`,
                fix: 'Validate your JSON payload at jsonlint.com',
            });
        }
    }

    // Check for signature headers (security)
    const signatureHeaders = [
        'x-hub-signature-256', 'stripe-signature', 'x-razorpay-signature',
        'x-slack-signature', 'x-shopify-hmac-sha256', 'x-twilio-signature',
    ];
    const hasSignature = signatureHeaders.some(h => headerObj[h]);

    if (hasSignature) {
        info.push({
            type: 'info',
            title: '🔐 Signature Present',
            message: 'This webhook includes a cryptographic signature for verification',
        });
    } else if (body) {
        warnings.push({
            type: 'warning',
            title: '⚠️ No Signature Verification',
            message: 'No HMAC/signature header detected. In production, always verify webhook signatures!',
            fix: 'Implement HMAC verification to prevent spoofed webhook requests',
        });
    }

    // Check user agent
    const userAgent = headerObj['user-agent'] || '';
    if (userAgent) {
        info.push({
            type: 'info',
            title: 'User Agent',
            message: userAgent,
        });
    }

    // Body size analysis
    if (body) {
        const sizeBytes = new TextEncoder().encode(body).length;
        if (sizeBytes > 1000000) {
            warnings.push({
                type: 'warning',
                title: 'Large Payload',
                message: `Payload is ${(sizeBytes / 1024 / 1024).toFixed(2)} MB. Consider chunking large payloads.`,
            });
        }
        info.push({
            type: 'info',
            title: 'Payload Size',
            message: `${sizeBytes} bytes (${(sizeBytes / 1024).toFixed(1)} KB)`,
        });
    }

    // Check for idempotency key
    const idempotencyHeaders = ['idempotency-key', 'x-idempotency-key', 'x-request-id'];
    const hasIdempotency = idempotencyHeaders.some(h => headerObj[h]);
    if (hasIdempotency) {
        info.push({
            type: 'info',
            title: '🔑 Idempotency Key',
            message: 'Request includes idempotency key — safe for retry',
        });
    }

    return {
        issues,
        warnings,
        info,
        score: issues.length === 0 ? (warnings.length === 0 ? 100 : 80) : 50,
        summary: issues.length === 0
            ? (warnings.length === 0 ? '✅ All checks passed' : `⚠️ ${warnings.length} warning(s)`)
            : `❌ ${issues.length} issue(s) found`,
    };
}

// ==================== Code Generator ====================
export function generateHandlerCode(method, headers, body, language = 'node') {
    const headerObj = typeof headers === 'string' ? JSON.parse(headers) : headers;
    let bodyObj = {};
    try {
        bodyObj = typeof body === 'string' ? JSON.parse(body) : (body || {});
    } catch {
        bodyObj = {};
    }

    const source = detectWebhookSource(headers, body);
    const eventType = bodyObj.type || bodyObj.event || bodyObj.event_type || 'webhook_event';

    if (language === 'node') {
        return generateNodeHandler(method, headerObj, bodyObj, source, eventType);
    } else if (language === 'python') {
        return generatePythonHandler(method, headerObj, bodyObj, source, eventType);
    }

    return generateNodeHandler(method, headerObj, bodyObj, source, eventType);
}

function generateNodeHandler(method, headers, body, source, eventType) {
    const signatureHeader = Object.keys(headers).find(h =>
        h.includes('signature') || h.includes('hmac')
    );

    const bodyFields = Object.keys(body);
    const destructureFields = bodyFields.slice(0, 6).join(', ');

    let code = `// ${source.detected ? source.icon + ' ' + source.source : '🪝'} Webhook Handler
// Auto-generated by HookRadar AI

import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

`;

    if (signatureHeader) {
        code += `// Verify webhook signature
function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

`;
    }

    code += `app.${method.toLowerCase()}('/webhook', (req, res) => {
  try {
`;

    if (signatureHeader) {
        code += `    // Verify signature
    const signature = req.headers['${signatureHeader}'];
    const isValid = verifySignature(
      JSON.stringify(req.body),
      signature,
      process.env.WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('Invalid webhook signature!');
      return res.status(401).json({ error: 'Invalid signature' });
    }

`;
    }

    if (bodyFields.length > 0) {
        code += `    const { ${destructureFields} } = req.body;

`;
    }

    // Add event-specific handling
    const typeField = body.type ? 'type' : (body.event ? 'event' : (body.event_type ? 'event_type' : null));
    if (typeField) {
        code += `    // Handle different event types
    switch (req.body.${typeField}) {
      case '${eventType}':
        console.log('Received ${eventType}');
        // TODO: Add your business logic here
        break;
      default:
        console.log('Unhandled event:', req.body.${typeField});
    }

`;
    } else {
        code += `    console.log('Webhook received:', req.body);
    // TODO: Add your business logic here

`;
    }

    code += `    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
`;

    return code;
}

function generatePythonHandler(method, headers, body, source, eventType) {
    const signatureHeader = Object.keys(headers).find(h =>
        h.includes('signature') || h.includes('hmac')
    );

    let code = `# ${source.detected ? source.icon + ' ' + source.source : '🪝'} Webhook Handler
# Auto-generated by HookRadar AI

from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = "your-secret-here"

`;

    if (signatureHeader) {
        code += `def verify_signature(payload, signature, secret):
    """Verify webhook signature"""
    mac = hmac.new(
        secret.encode('utf-8'),
        msg=payload,
        digestmod=hashlib.sha256
    )
    return hmac.compare_digest(mac.hexdigest(), signature)

`;
    }

    code += `@app.route('/webhook', methods=['${method}'])
def handle_webhook():
    try:
`;

    if (signatureHeader) {
        code += `        # Verify signature
        signature = request.headers.get('${signatureHeader}', '')
        if not verify_signature(request.data, signature, WEBHOOK_SECRET):
            return jsonify({"error": "Invalid signature"}), 401

`;
    }

    code += `        data = request.get_json()
        print(f"Webhook received: {data}")

        # TODO: Add your business logic here

        return jsonify({"received": True}), 200
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({"error": "Processing failed"}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)
`;

    return code;
}

// ==================== Pattern Analysis ====================
export function analyzePatterns(requests) {
    if (!requests || requests.length === 0) {
        return { patterns: [], summary: 'No requests to analyze' };
    }

    const patterns = [];

    // Method distribution
    const methodCounts = {};
    requests.forEach(r => {
        methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
    });
    patterns.push({
        type: 'method_distribution',
        title: '📊 Method Distribution',
        data: methodCounts,
        description: Object.entries(methodCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([m, c]) => `${m}: ${c} (${((c / requests.length) * 100).toFixed(0)}%)`)
            .join(', '),
    });

    // Time distribution
    const hourCounts = {};
    requests.forEach(r => {
        const hour = new Date(r.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
        patterns.push({
            type: 'peak_time',
            title: '⏰ Peak Activity',
            data: hourCounts,
            description: `Most active at ${peakHour[0]}:00 (${peakHour[1]} requests)`,
        });
    }

    // Content type usage
    const contentTypes = {};
    requests.forEach(r => {
        const ct = r.content_type || 'none';
        contentTypes[ct] = (contentTypes[ct] || 0) + 1;
    });
    patterns.push({
        type: 'content_types',
        title: '📝 Content Types',
        data: contentTypes,
        description: Object.entries(contentTypes)
            .map(([ct, c]) => `${ct}: ${c}`)
            .join(', '),
    });

    // Average size
    const avgSize = requests.reduce((sum, r) => sum + (r.size || 0), 0) / requests.length;
    patterns.push({
        type: 'avg_size',
        title: '📏 Average Payload Size',
        data: { avgSize },
        description: `${avgSize.toFixed(0)} bytes (${(avgSize / 1024).toFixed(1)} KB)`,
    });

    // Response time analysis
    const times = requests.map(r => r.response_time || 0).filter(t => t > 0);
    if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        patterns.push({
            type: 'response_time',
            title: '⚡ Response Time',
            data: { avg: avgTime, max: maxTime },
            description: `Avg: ${avgTime.toFixed(0)}ms, Max: ${maxTime}ms`,
        });
    }

    // Source detection from recent requests
    const sources = {};
    requests.slice(0, 20).forEach(r => {
        const detection = detectWebhookSource(r.headers, r.body);
        if (detection.detected) {
            sources[detection.source] = (sources[detection.source] || 0) + 1;
        }
    });
    if (Object.keys(sources).length > 0) {
        patterns.push({
            type: 'sources',
            title: '🔍 Detected Sources',
            data: sources,
            description: Object.entries(sources)
                .map(([s, c]) => `${s}: ${c} requests`)
                .join(', '),
        });
    }

    return {
        patterns,
        totalRequests: requests.length,
        summary: `Analyzed ${requests.length} requests — ${patterns.length} patterns detected`,
    };
}

// ==================== Full Analysis ====================
export function fullAnalysis(request) {
    const sourceDetection = detectWebhookSource(request.headers, request.body);
    const validation = validatePayload(request.headers, request.body);
    const handlerCode = generateHandlerCode(
        request.method,
        request.headers,
        request.body,
        'node'
    );
    const pythonCode = generateHandlerCode(
        request.method,
        request.headers,
        request.body,
        'python'
    );

    return {
        source: sourceDetection,
        validation,
        handlerCode: {
            node: handlerCode,
            python: pythonCode,
        },
        analyzedAt: new Date().toISOString(),
    };
}
