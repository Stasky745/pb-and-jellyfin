export type Movie = {
	id: string;
	title: string;
	year: number | null;
	overview: string | null;
};

export type Source = 'jellyfin' | 'tmdb' | 'rank';

export type Candidate = Movie & {
	source: Source;
	sourceId: string;
	posterUrl: string | null;
};

// A copy of a candidate living in a drag source list; `id` is prefixed so it never collides with a ranked movie.
export type DraggableCandidate = Candidate & { movieId: string };

export const DRAG_ID_PREFIX = 'add:';

export const toDraggable = (movie: Candidate): DraggableCandidate => ({
	...movie,
	id: `${DRAG_ID_PREFIX}${movie.id}`,
	movieId: movie.id
});

export const isDraggableCandidate = (item: Movie): item is DraggableCandidate => item.id.startsWith(DRAG_ID_PREFIX);
