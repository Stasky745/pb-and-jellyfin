import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE } from '#lib/server/auth.js';
import { errorFields, log } from '#lib/server/log.js';
import { metrics } from '#lib/server/metrics.js';
import { getSession } from '#lib/server/store.js';

const PUBLIC_PATHS = new Set(['/login', '/healthz']);

export const handle: Handle = async ({ event, resolve }) => {
	const start = performance.now();
	const sessionId = event.cookies.get(SESSION_COOKIE);
	event.locals.session = sessionId ? getSession(sessionId) : null;

	const { pathname } = event.url;
	let response: Response;
	if (!event.locals.session && !PUBLIC_PATHS.has(pathname)) {
		response =
			pathname.startsWith('/api/') || pathname.startsWith('/poster/') || pathname.startsWith('/jellyfin-poster/')
				? new Response('Unauthorized', { status: 401 })
				: new Response(null, { status: 303, headers: { location: '/login' } });
	} else {
		response = await resolve(event);
	}

	if (pathname === '/healthz') return response;
	const route = event.route.id ?? 'unmatched';
	const seconds = (performance.now() - start) / 1000;
	metrics.httpRequests.observe({ method: event.request.method, route, status: response.status }, seconds);
	log.info('request', {
		method: event.request.method,
		route,
		path: pathname,
		status: response.status,
		durationMs: Math.round(seconds * 1000),
		user: event.locals.session?.user.name
	});
	return response;
};

export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (kind === 'unknown') log.error('unhandled error', { route: event.route.id, ...errorFields(error) });
};
