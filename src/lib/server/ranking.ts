import type { Movie } from '#lib/types.js';

export type RankedMovie = { movie: Movie; rank: number };
export type TheirView = { shared: RankedMovie[]; unranked: Movie[] };
export type CombinedEntry = {
	movie: Movie;
	myRank: number;
	theirRank: number;
	average: number;
	/** Competition-style place: movies with the same average share it (1, 2, 2, 4). */
	place: number;
	tied: boolean;
};

function sharedRanks(list: Movie[], sharedIds: Set<string>): Map<string, number> {
	const ranks = new Map<string, number>();
	for (const movie of list) {
		if (sharedIds.has(movie.id)) ranks.set(movie.id, ranks.size + 1);
	}
	return ranks;
}

function sharedIds(mine: Movie[], theirs: Movie[]): Set<string> {
	const mineIds = new Set(mine.map((m) => m.id));
	return new Set(theirs.filter((m) => mineIds.has(m.id)).map((m) => m.id));
}

export function theirView(mine: Movie[], theirs: Movie[]): TheirView {
	const shared = sharedIds(mine, theirs);
	const ranks = sharedRanks(theirs, shared);
	return {
		shared: theirs.filter((m) => shared.has(m.id)).map((movie) => ({ movie, rank: ranks.get(movie.id)! })),
		unranked: theirs.filter((m) => !shared.has(m.id)).sort((a, b) => a.title.localeCompare(b.title))
	};
}

export function combined(mine: Movie[], theirs: Movie[]): CombinedEntry[] {
	const shared = sharedIds(mine, theirs);
	const myRanks = sharedRanks(mine, shared);
	const theirRanks = sharedRanks(theirs, shared);
	const sorted = mine
		.filter((m) => shared.has(m.id))
		.map((movie) => {
			const myRank = myRanks.get(movie.id)!;
			const theirRank = theirRanks.get(movie.id)!;
			return { movie, myRank, theirRank, average: (myRank + theirRank) / 2 };
		})
		.sort(
			(a, b) =>
				a.average - b.average ||
				Math.min(a.myRank, a.theirRank) - Math.min(b.myRank, b.theirRank) ||
				a.movie.title.localeCompare(b.movie.title)
		);
	return sorted.map((entry) => {
		const place = sorted.findIndex((e) => e.average === entry.average) + 1;
		const tied = sorted.filter((e) => e.average === entry.average).length > 1;
		return { ...entry, place, tied };
	});
}
