import client from 'prom-client';
import { getDb } from './db.js';

// Module state survives dev-server HMR via globalThis, so metrics aren't registered twice.
const globals = globalThis as typeof globalThis & { __metrics?: ReturnType<typeof create> };

function create() {
	client.collectDefaultMetrics();
	return {
		httpRequests: new client.Histogram({
			name: 'http_request_duration_seconds',
			help: 'HTTP request duration by route',
			labelNames: ['method', 'route', 'status'],
			buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
		}),
		jellyfinRequests: new client.Histogram({
			name: 'jellyfin_request_duration_seconds',
			help: 'Duration of requests to Jellyfin',
			labelNames: ['endpoint', 'status'],
			buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
		}),
		logins: new client.Counter({
			name: 'logins_total',
			help: 'Login attempts by result',
			labelNames: ['result']
		}),
		rankedMovies: new client.Gauge({
			name: 'ranked_movies',
			help: 'Movies in each user ranking',
			labelNames: ['user'],
			collect() {
				this.reset();
				const rows = getDb()
					.prepare('SELECT u.name, COUNT(r.movie_id) AS n FROM users u LEFT JOIN rankings r ON r.user_id = u.id GROUP BY u.id')
					.all() as { name: string; n: number }[];
				for (const { name, n } of rows) this.set({ user: name }, n);
			}
		})
	};
}

export const metrics = (globals.__metrics ??= create());
