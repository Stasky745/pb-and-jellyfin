import { getDb } from '#lib/server/db.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	getDb().prepare('SELECT 1').get();
	return new Response('ok');
};
