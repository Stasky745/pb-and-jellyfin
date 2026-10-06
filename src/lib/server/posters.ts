import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { databasePath } from './config.js';

const posterPath = (movieId: string) =>
	join(dirname(databasePath()), 'posters', `${movieId.replace(/[^a-zA-Z0-9-]/g, '_')}.jpg`);

export const hasPoster = (movieId: string) => existsSync(posterPath(movieId));

export async function savePoster(movieId: string, res: Response) {
	if (!res.ok) return;
	const path = posterPath(movieId);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

export async function readPoster(movieId: string): Promise<Buffer | null> {
	return hasPoster(movieId) ? readFile(posterPath(movieId)) : null;
}
