// Bumped after a successful retry so every card showing that movie reloads its poster.
export const posterVersions = $state<Record<string, number>>({});

export async function retryPoster(movieId: string): Promise<boolean> {
	const res = await fetch(`/api/movies/${encodeURIComponent(movieId)}/poster`, { method: 'POST' });
	if (res.ok) posterVersions[movieId] = (posterVersions[movieId] ?? 0) + 1;
	return res.ok;
}
