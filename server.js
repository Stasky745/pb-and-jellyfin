import http from 'node:http';

process.env.PROTOCOL_HEADER ??= 'x-forwarded-proto';
const protocolHeader = process.env.PROTOCOL_HEADER.toLowerCase();
const { handler } = await import('./build/handler.js');
const { register } = await import('prom-client');

const port = Number(process.env.PORT ?? 3000);
const metricsPort = Number(process.env.METRICS_PORT ?? 9091);

const log = (level, msg, fields = {}) =>
	console.log(JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields }));

const app = http.createServer((req, res) => {
	// adapter-node assumes https when no proxy sets the header; fill in the real protocol for direct requests.
	req.headers[protocolHeader] ??= req.socket.encrypted ? 'https' : 'http';
	handler(req, res, () => res.writeHead(404).end());
});

// Separate port so /metrics is never exposed through the app's ingress.
const metricsServer = http.createServer(async (req, res) => {
	if (req.url !== '/metrics') return res.writeHead(404).end();
	try {
		res.writeHead(200, { 'Content-Type': register.contentType }).end(await register.metrics());
	} catch (e) {
		res.writeHead(500).end(String(e));
	}
});

app.listen(port, () => log('info', 'listening', { port }));
metricsServer.listen(metricsPort, () => log('info', 'metrics listening', { port: metricsPort }));

function shutdown(signal) {
	log('info', 'shutting down', { signal });
	metricsServer.close();
	app.close(() => process.exit(0));
	app.closeIdleConnections();
	setTimeout(() => process.exit(0), 10_000).unref();
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
