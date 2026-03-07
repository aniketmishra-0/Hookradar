#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import WebSocket from 'ws';

const program = new Command();

// Default server URL
const DEFAULT_SERVER = process.env.HOOKRADAR_SERVER || 'http://localhost:3001';

function getServer() {
    return program.opts().server || DEFAULT_SERVER;
}

async function apiCall(path, options = {}) {
    const server = getServer();
    try {
        const res = await fetch(`${server}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        return await res.json();
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.error(chalk.red('\n  ✖ Cannot connect to HookRadar server at ' + server));
            console.error(chalk.gray('    Make sure the server is running: npm run dev:server\n'));
            process.exit(1);
        }
        throw err;
    }
}

// ==================== ASCII Art Banner ====================
function showBanner() {
    console.log(chalk.hex('#6366f1')(`
  ╦ ╦╔═╗╔═╗╦╔═╦═╗╔═╗╔╦╗╔═╗╦═╗
  ╠═╣║ ║║ ║╠╩╗╠╦╝╠═╣ ║║╠═╣╠╦╝
  ╩ ╩╚═╝╚═╝╩ ╩╩╚═╩ ╩═╩╝╩ ╩╩╚═
  `));
    console.log(chalk.gray('  Open Source Webhook Tester & Debugger\n'));
}

// ==================== Commands ====================

program
    .name('hookradar')
    .description('🛰️  HookRadar CLI — Open Source Webhook Tester & Debugger')
    .version('1.0.0')
    .option('-s, --server <url>', 'HookRadar server URL', DEFAULT_SERVER);

// === CREATE ===
program
    .command('create')
    .description('Create a new webhook endpoint')
    .option('-n, --name <name>', 'Endpoint name')
    .option('-d, --description <desc>', 'Endpoint description')
    .action(async (options) => {
        showBanner();
        const spinner = ora('Creating webhook endpoint...').start();

        try {
            const result = await apiCall('/api/endpoints', {
                method: 'POST',
                body: JSON.stringify({
                    name: options.name || '',
                    description: options.description || '',
                }),
            });

            if (result.success) {
                const endpoint = result.data;
                spinner.succeed('Endpoint created!');

                console.log('');
                console.log(chalk.green('  ✔ Webhook URL:'));
                console.log(chalk.cyan.bold(`    ${getServer()}/hook/${endpoint.slug}`));
                console.log('');
                console.log(chalk.gray('  Endpoint ID: ') + endpoint.id);
                console.log(chalk.gray('  Slug:        ') + endpoint.slug);
                if (endpoint.name) console.log(chalk.gray('  Name:        ') + endpoint.name);
                console.log('');
                console.log(chalk.yellow('  💡 Try it:'));
                console.log(chalk.gray(`    curl -X POST ${getServer()}/hook/${endpoint.slug} \\`));
                console.log(chalk.gray(`      -H "Content-Type: application/json" \\`));
                console.log(chalk.gray(`      -d '{"test": true}'`));
                console.log('');
                console.log(chalk.gray(`  📡 Listen: hookradar listen ${endpoint.slug}`));
                console.log('');
            } else {
                spinner.fail('Failed: ' + result.error);
            }
        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

// === LIST ===
program
    .command('list')
    .alias('ls')
    .description('List all webhook endpoints')
    .action(async () => {
        showBanner();
        const spinner = ora('Fetching endpoints...').start();

        try {
            const result = await apiCall('/api/endpoints');

            if (result.success && result.data.length > 0) {
                spinner.succeed(`Found ${result.data.length} endpoint(s)`);

                const table = new Table({
                    head: [
                        chalk.cyan('Name'),
                        chalk.cyan('Slug'),
                        chalk.cyan('URL'),
                        chalk.cyan('Requests'),
                        chalk.cyan('Status'),
                        chalk.cyan('Created'),
                    ],
                    style: { head: [], border: ['gray'] },
                });

                result.data.forEach(ep => {
                    table.push([
                        ep.name || chalk.gray('(unnamed)'),
                        ep.slug,
                        chalk.gray(`/hook/${ep.slug}`),
                        ep.request_count || '0',
                        ep.is_active ? chalk.green('● Active') : chalk.red('● Inactive'),
                        new Date(ep.created_at).toLocaleDateString(),
                    ]);
                });

                console.log(table.toString());
                console.log('');
            } else if (result.success) {
                spinner.info('No endpoints found');
                console.log(chalk.gray('\n  Create one: hookradar create -n "My Webhook"\n'));
            } else {
                spinner.fail('Error: ' + result.error);
            }
        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

// === LISTEN ===
program
    .command('listen <slug>')
    .description('Listen for incoming webhooks in real-time')
    .option('--json', 'Output raw JSON for piping')
    .action(async (slug, options) => {
        if (!options.json) showBanner();

        // First verify the endpoint exists
        const spinner = ora('Connecting to endpoint...').start();

        try {
            const endpointsResult = await apiCall('/api/endpoints');
            const endpoint = endpointsResult.data?.find(ep => ep.slug === slug);

            if (!endpoint) {
                spinner.fail(`Endpoint with slug "${slug}" not found`);
                return;
            }

            spinner.succeed(`Connected to "${endpoint.name || slug}"`);

            const webhookUrl = `${getServer()}/hook/${slug}`;
            console.log(chalk.cyan(`\n  📡 Webhook URL: ${webhookUrl}`));
            console.log(chalk.gray('  Waiting for incoming webhooks...\n'));
            console.log(chalk.gray('  ' + '─'.repeat(60)));

            // Connect WebSocket
            const wsUrl = getServer().replace('http', 'ws') + `/ws?endpointId=${endpoint.id}`;
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                if (!options.json) {
                    console.log(chalk.green('  ● WebSocket connected — listening live\n'));
                }
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'new_request' && msg.request) {
                        const req = msg.request;

                        if (options.json) {
                            console.log(JSON.stringify(req));
                            return;
                        }

                        const methodColors = {
                            GET: chalk.green,
                            POST: chalk.blue,
                            PUT: chalk.yellow,
                            PATCH: chalk.magenta,
                            DELETE: chalk.red,
                        };
                        const colorFn = methodColors[req.method] || chalk.white;
                        const timestamp = new Date(req.created_at).toLocaleTimeString();

                        console.log(chalk.gray(`  ┌─ ${timestamp} ─────────────────────`));
                        console.log(`  │ ${colorFn.bold(req.method.padEnd(7))} ${req.path} ${chalk.gray(`[${req.status_code}]`)}`);
                        console.log(`  │ ${chalk.gray('Size:')} ${req.size}B  ${chalk.gray('IP:')} ${req.ip_address}  ${chalk.gray('Type:')} ${req.content_type || 'none'}`);

                        // Show headers count
                        try {
                            const headers = JSON.parse(req.headers);
                            console.log(`  │ ${chalk.gray('Headers:')} ${Object.keys(headers).length} headers`);
                        } catch { }

                        // Show body preview
                        if (req.body) {
                            let bodyPreview = req.body;
                            try {
                                const parsed = JSON.parse(req.body);
                                bodyPreview = JSON.stringify(parsed, null, 2);
                            } catch { }

                            const lines = bodyPreview.split('\n').slice(0, 8);
                            lines.forEach(line => {
                                console.log(chalk.gray(`  │ `) + chalk.white(line));
                            });
                            if (bodyPreview.split('\n').length > 8) {
                                console.log(chalk.gray(`  │ ... (truncated)`));
                            }
                        }

                        // Show query params
                        try {
                            const query = JSON.parse(req.query_params);
                            if (Object.keys(query).length > 0) {
                                console.log(`  │ ${chalk.gray('Query:')} ${JSON.stringify(query)}`);
                            }
                        } catch { }

                        console.log(chalk.gray('  └' + '─'.repeat(40)));
                        console.log('');
                    }
                } catch { }
            });

            ws.on('close', () => {
                console.log(chalk.yellow('\n  ⚠ WebSocket disconnected. Reconnecting...'));
                setTimeout(() => {
                    console.log(chalk.gray('  Attempting reconnection...'));
                }, 2000);
            });

            ws.on('error', (err) => {
                console.error(chalk.red(`\n  ✖ WebSocket error: ${err.message}`));
            });

            // Keep alive
            process.on('SIGINT', () => {
                console.log(chalk.gray('\n\n  👋 Stopping listener...'));
                ws.close();
                process.exit(0);
            });

        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

// === INSPECT ===
program
    .command('inspect <slug>')
    .description('View recent requests for an endpoint')
    .option('-l, --limit <n>', 'Number of requests to show', '10')
    .action(async (slug, options) => {
        showBanner();
        const spinner = ora('Fetching requests...').start();

        try {
            const endpointsResult = await apiCall('/api/endpoints');
            const endpoint = endpointsResult.data?.find(ep => ep.slug === slug);

            if (!endpoint) {
                spinner.fail(`Endpoint with slug "${slug}" not found`);
                return;
            }

            const result = await apiCall(`/api/endpoints/${endpoint.id}/requests?limit=${options.limit}`);

            if (result.success && result.data.length > 0) {
                spinner.succeed(`${result.total} total requests for "${endpoint.name || slug}"`);

                const table = new Table({
                    head: [
                        chalk.cyan('Method'),
                        chalk.cyan('Path'),
                        chalk.cyan('Status'),
                        chalk.cyan('Size'),
                        chalk.cyan('Content-Type'),
                        chalk.cyan('Time'),
                    ],
                    style: { head: [], border: ['gray'] },
                });

                result.data.forEach(req => {
                    const methodColors = {
                        GET: chalk.green,
                        POST: chalk.blue,
                        PUT: chalk.yellow,
                        PATCH: chalk.magenta,
                        DELETE: chalk.red,
                    };
                    const colorFn = methodColors[req.method] || chalk.white;

                    table.push([
                        colorFn.bold(req.method),
                        req.path,
                        req.status_code,
                        `${req.size}B`,
                        req.content_type || '-',
                        new Date(req.created_at).toLocaleTimeString(),
                    ]);
                });

                console.log(table.toString());
                console.log('');
            } else if (result.success) {
                spinner.info('No requests found for this endpoint');
                console.log(chalk.gray(`\n  Send a test: curl ${getServer()}/hook/${slug}\n`));
            } else {
                spinner.fail('Error: ' + result.error);
            }
        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

// === DELETE ===
program
    .command('delete <slug>')
    .description('Delete a webhook endpoint')
    .action(async (slug) => {
        showBanner();
        const spinner = ora('Deleting endpoint...').start();

        try {
            const endpointsResult = await apiCall('/api/endpoints');
            const endpoint = endpointsResult.data?.find(ep => ep.slug === slug);

            if (!endpoint) {
                spinner.fail(`Endpoint with slug "${slug}" not found`);
                return;
            }

            const result = await apiCall(`/api/endpoints/${endpoint.id}`, {
                method: 'DELETE',
            });

            if (result.success) {
                spinner.succeed(`Deleted endpoint "${endpoint.name || slug}"`);
            } else {
                spinner.fail('Failed: ' + result.error);
            }
        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

// === REPLAY ===
program
    .command('replay <slug> <target-url>')
    .description('Replay the latest request from an endpoint to a target URL')
    .action(async (slug, targetUrl) => {
        showBanner();
        const spinner = ora('Replaying request...').start();

        try {
            const endpointsResult = await apiCall('/api/endpoints');
            const endpoint = endpointsResult.data?.find(ep => ep.slug === slug);

            if (!endpoint) {
                spinner.fail(`Endpoint with slug "${slug}" not found`);
                return;
            }

            // Get the latest request
            const reqResult = await apiCall(`/api/endpoints/${endpoint.id}/requests?limit=1`);
            if (!reqResult.success || reqResult.data.length === 0) {
                spinner.fail('No requests to replay');
                return;
            }

            const request = reqResult.data[0];
            const replayResult = await apiCall(`/api/requests/${request.id}/replay`, {
                method: 'POST',
                body: JSON.stringify({ target_url: targetUrl }),
            });

            if (replayResult.success) {
                spinner.succeed('Request replayed!');
                console.log('');
                console.log(chalk.gray('  Response:'));
                console.log(chalk.gray('    Status: ') + chalk.cyan(replayResult.data.status));
                console.log(chalk.gray('    Body:'));

                let body = replayResult.data.body;
                try {
                    body = JSON.stringify(JSON.parse(body), null, 2);
                } catch { }

                body.split('\n').forEach(line => {
                    console.log(chalk.gray('      ') + line);
                });
                console.log('');
            } else {
                spinner.fail('Replay failed: ' + replayResult.error);
            }
        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

// === STATS ===
program
    .command('stats')
    .description('Show server statistics')
    .action(async () => {
        showBanner();
        const spinner = ora('Fetching stats...').start();

        try {
            const result = await apiCall('/api/stats');

            if (result.success) {
                spinner.succeed('Server Statistics');
                console.log('');

                const stats = result.data;
                console.log(chalk.gray('  ┌────────────────────────────────┐'));
                console.log(chalk.gray('  │') + chalk.cyan(' 📊 HookRadar Statistics        ') + chalk.gray('│'));
                console.log(chalk.gray('  ├────────────────────────────────┤'));
                console.log(chalk.gray('  │') + ` Total Endpoints:  ${chalk.bold(stats.total_endpoints || 0)}`.padEnd(40) + chalk.gray('│'));
                console.log(chalk.gray('  │') + ` Total Requests:   ${chalk.bold(stats.total_requests || 0)}`.padEnd(40) + chalk.gray('│'));
                console.log(chalk.gray('  │') + ` Requests Today:   ${chalk.bold(stats.requests_today || 0)}`.padEnd(40) + chalk.gray('│'));
                console.log(chalk.gray('  └────────────────────────────────┘'));
                console.log('');
            } else {
                spinner.fail('Error: ' + result.error);
            }
        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

// === QUICK (create + listen in one go) ===
program
    .command('quick')
    .description('Quickly create an endpoint and start listening')
    .option('-n, --name <name>', 'Endpoint name', 'CLI Webhook')
    .action(async (options) => {
        showBanner();
        const spinner = ora('Creating endpoint...').start();

        try {
            const result = await apiCall('/api/endpoints', {
                method: 'POST',
                body: JSON.stringify({
                    name: options.name,
                    description: 'Created from CLI',
                }),
            });

            if (!result.success) {
                spinner.fail('Failed to create: ' + result.error);
                return;
            }

            const endpoint = result.data;
            spinner.succeed('Endpoint ready!');

            const webhookUrl = `${getServer()}/hook/${endpoint.slug}`;
            console.log(chalk.cyan(`\n  📡 Webhook URL: ${webhookUrl}`));
            console.log(chalk.gray('  Waiting for incoming webhooks...\n'));
            console.log(chalk.yellow('  💡 Send a test in another terminal:'));
            console.log(chalk.gray(`    curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '{"test": true}'\n`));
            console.log(chalk.gray('  ' + '─'.repeat(60)));

            // Connect WebSocket 
            const wsUrl = getServer().replace('http', 'ws') + `/ws?endpointId=${endpoint.id}`;
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                console.log(chalk.green('  ● Live — listening for webhooks\n'));
            });

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === 'new_request' && msg.request) {
                        const req = msg.request;
                        const methodColors = {
                            GET: chalk.green,
                            POST: chalk.blue,
                            PUT: chalk.yellow,
                            PATCH: chalk.magenta,
                            DELETE: chalk.red,
                        };
                        const colorFn = methodColors[req.method] || chalk.white;
                        const timestamp = new Date(req.created_at).toLocaleTimeString();

                        console.log(chalk.gray(`  ┌─ ${timestamp} ─────────────────────`));
                        console.log(`  │ ${colorFn.bold(req.method.padEnd(7))} ${req.path} ${chalk.gray(`[${req.status_code}]`)}`);

                        if (req.body) {
                            let bodyPreview = req.body;
                            try { bodyPreview = JSON.stringify(JSON.parse(req.body), null, 2); } catch { }
                            const lines = bodyPreview.split('\n').slice(0, 10);
                            lines.forEach(line => console.log(chalk.gray('  │ ') + chalk.white(line)));
                        }

                        console.log(chalk.gray('  └' + '─'.repeat(40)));
                        console.log('');
                    }
                } catch { }
            });

            ws.on('error', (err) => {
                console.error(chalk.red(`  ✖ Connection error: ${err.message}`));
            });

            process.on('SIGINT', () => {
                console.log(chalk.gray('\n  👋 Bye!'));
                ws.close();
                process.exit(0);
            });

        } catch (err) {
            spinner.fail('Error: ' + err.message);
        }
    });

program.parse();
