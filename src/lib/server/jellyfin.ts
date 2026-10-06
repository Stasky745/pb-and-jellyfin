import { redirect } from '@sveltejs/kit';
import { APP_NAME } from '#lib/app.js';
import type { Candidate } from '#lib/types.js';
import { jellyfinUrl } from './config.js';
import { log } from './log.js';
import { metrics } from './metrics.js';
import { deleteSession, type Session } from './store.js';

function authorization(deviceId: string, token?: string) {
	const header = `MediaBrowser Client="${APP_NAME}", Device="${APP_NAME}", DeviceId="${deviceId}", Version="1.0"`;
	return token ? `${header}, Token="${token}"` : header;
}

// One Jellyfin device per user, so re-logins replace the same device entry.
const deviceId = (userName: string) => `rank-${userName.toLowerCase()}`;

async function timedFetch(endpoint: string, url: string, init: RequestInit) {
	const end = metrics.jellyfinRequests.startTimer({ endpoint });
	try {
		const res = await fetch(url, init);
		end({ status: res.status });
		if (!res.ok) log.warn('jellyfin request failed', { endpoint, status: res.status });
		return res;
	} catch (e) {
		end({ status: 'error' });
		throw e;
	}
}

export async function authenticate(username: string, password: string) {
	const res = await timedFetch('/Users/AuthenticateByName', `${jellyfinUrl()}/Users/AuthenticateByName`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: authorization(deviceId(username)) },
		body: JSON.stringify({ Username: username, Pw: password })
	});
	if (!res.ok) return null;
	const body = await res.json();
	return { token: body.AccessToken as string, user: { id: body.User.Id as string, name: body.User.Name as string } };
}

async function request(session: Session, endpoint: string, path: string, init: RequestInit = {}) {
	const res = await timedFetch(endpoint, `${jellyfinUrl()}${path}`, {
		...init,
		headers: {
			...init.headers,
			Authorization: authorization(deviceId(session.user.name), session.token)
		}
	});
	if (res.status === 401) {
		deleteSession(session.id);
		redirect(303, '/login');
	}
	return res;
}

type ProviderIds = { Tmdb?: string };
type Item = { Id: string; Name: string; ProductionYear?: number; Overview?: string; ProviderIds?: ProviderIds };
type RemoteResult = { Name: string; ProductionYear?: number; Overview?: string; ImageUrl?: string; ProviderIds?: ProviderIds };

const fromItem = (item: Item): Candidate => ({
	id: item.ProviderIds?.Tmdb ? `tmdb:${item.ProviderIds.Tmdb}` : `jf:${item.Id}`,
	title: item.Name,
	year: item.ProductionYear ?? null,
	overview: item.Overview ?? null,
	source: 'jellyfin',
	sourceId: item.Id,
	posterUrl: `/jellyfin-poster/${item.Id}`
});

// Jellyfin returns full-size TMDB images; ask TMDB's CDN for a smaller rendition instead.
const tmdbImage = (url: string | undefined, size: string) => url?.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`) ?? null;

const fromRemote = (result: RemoteResult): (Candidate & { imageUrl: string | null }) | null => {
	const tmdbId = result.ProviderIds?.Tmdb;
	if (!tmdbId) return null;
	return {
		id: `tmdb:${tmdbId}`,
		title: result.Name,
		year: result.ProductionYear ?? null,
		overview: result.Overview ?? null,
		source: 'tmdb',
		sourceId: tmdbId,
		posterUrl: tmdbImage(result.ImageUrl, 'w185'),
		imageUrl: tmdbImage(result.ImageUrl, 'w500')
	};
};

async function items(session: Session, params: Record<string, string>): Promise<Candidate[]> {
	const query = new URLSearchParams({
		userId: session.user.id,
		includeItemTypes: 'Movie',
		recursive: 'true',
		fields: 'Overview,ProviderIds',
		...params
	});
	const res = await request(session, '/Items', `/Items?${query}`);
	if (!res.ok) throw new Error(`Jellyfin /Items failed: ${res.status}`);
	const body = (await res.json()) as { Items: Item[] };
	return body.Items.map(fromItem);
}

async function remoteSearch(session: Session, searchInfo: Record<string, unknown>) {
	const res = await request(session, '/Items/RemoteSearch/Movie', '/Items/RemoteSearch/Movie', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ SearchInfo: searchInfo, SearchProviderName: 'TheMovieDb', IncludeDisabledProviders: true })
	});
	if (!res.ok) throw new Error(`Jellyfin remote search failed: ${res.status}`);
	return ((await res.json()) as RemoteResult[]).map(fromRemote).filter((r) => r !== null);
}

export const searchLibrary = (session: Session, term: string) => items(session, { searchTerm: term, limit: '20' });

export const watchedMovies = (session: Session) =>
	items(session, { isPlayed: 'true', sortBy: 'DatePlayed', sortOrder: 'Descending', limit: '100' });

export const searchTmdb = (session: Session, term: string) => remoteSearch(session, { Name: term });

export async function getLibraryMovie(session: Session, itemId: string) {
	return (await items(session, { ids: itemId }))[0] ?? null;
}

export async function getTmdbMovie(session: Session, tmdbId: string) {
	return (await remoteSearch(session, { ProviderIds: { Tmdb: tmdbId } })).find((r) => r.sourceId === tmdbId) ?? null;
}

export async function logout(session: Session) {
	await request(session, '/Sessions/Logout', '/Sessions/Logout', { method: 'POST' }).catch(() => {});
}

export const fetchItemPoster = (session: Session, itemId: string) =>
	request(session, '/Items/{id}/Images/Primary', `/Items/${encodeURIComponent(itemId)}/Images/Primary?maxHeight=450&quality=90`);
