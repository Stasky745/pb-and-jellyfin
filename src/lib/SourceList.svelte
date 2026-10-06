<script lang="ts">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import MovieCard from '#lib/MovieCard.svelte';
	import { dndOptions, flipDurationMs } from '#lib/dnd.js';
	import { toDraggable, type Candidate } from '#lib/types.js';

	let { movies, action }: { movies: Candidate[]; action: Snippet<[Candidate]> } = $props();

	let items = $derived(movies.map(toDraggable));
</script>

<ul
	use:dndzone={{ ...dndOptions, items, dropFromOthersDisabled: true }}
	onconsider={(e) => (items = e.detail.items)}
	onfinalize={() => (items = movies.map(toDraggable))}
	class="flex flex-col gap-2"
>
	{#each items as item (item.id)}
		{@const movie = { ...item, id: item.movieId }}
		<li animate:flip={{ duration: flipDurationMs }} class="cursor-grab">
			<MovieCard {movie} posterUrl={item.posterUrl}>
				{@render action(movie)}
			</MovieCard>
		</li>
	{/each}
</ul>
