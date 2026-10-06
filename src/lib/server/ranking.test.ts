import { describe, expect, it } from 'vitest';
import type { Movie } from '#lib/types.js';
import { combined, theirView } from './ranking';

const movie = (id: string): Movie => ({ id, title: id, year: null, overview: null });
const list = (...ids: string[]) => ids.map(movie);

describe('theirView', () => {
	it('ranks shared movies within the shared set only', () => {
		const view = theirView(list('a', 'b', 'c'), list('x', 'c', 'y', 'a'));
		expect(view.shared).toEqual([
			{ movie: movie('c'), rank: 1 },
			{ movie: movie('a'), rank: 2 }
		]);
	});

	it('lists unshared movies alphabetically, without ranks', () => {
		const view = theirView(list('a'), list('z', 'a', 'm', 'b'));
		expect(view.unranked).toEqual(list('b', 'm', 'z'));
		expect(view.unranked.every((m) => !('rank' in m))).toBe(true);
	});

	it('hides everything when nothing is shared', () => {
		const view = theirView([], list('a', 'b'));
		expect(view.shared).toEqual([]);
		expect(view.unranked).toEqual(list('a', 'b'));
	});
});

describe('combined', () => {
	it('only includes shared movies, sorted by average shared rank', () => {
		const result = combined(list('a', 'b', 'c', 'mine-only'), list('c', 'theirs-only', 'a', 'b'));
		expect(result.map((e) => [e.movie.id, e.myRank, e.theirRank, e.average])).toEqual([
			['a', 1, 2, 1.5],
			['c', 3, 1, 2],
			['b', 2, 3, 2.5]
		]);
	});

	it('gives draws a shared place and skips the following places', () => {
		const result = combined(list('a', 'b', 'c', 'd'), list('a', 'd', 'c', 'b'));
		expect(result.map((e) => [e.movie.id, e.average, e.place, e.tied])).toEqual([
			['a', 1, 1, false],
			['b', 3, 2, true],
			['d', 3, 2, true],
			['c', 3, 2, true]
		]);
		expect(combined(list('a', 'b', 'c', 'd', 'e'), list('a', 'c', 'b', 'd', 'e')).map((e) => e.place)).toEqual([
			1, 2, 2, 4, 5
		]);
	});

	it('breaks average ties by best single rank, then title', () => {
		expect(combined(list('a', 'b', 'c'), list('c', 'b', 'a')).map((e) => e.movie.id)).toEqual(['a', 'c', 'b']);
		expect(combined(list('b', 'a'), list('a', 'b')).map((e) => e.movie.id)).toEqual(['a', 'b']);
	});
});
