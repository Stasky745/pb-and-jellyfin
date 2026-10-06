<script lang="ts">
	import MovieCard from '#lib/MovieCard.svelte';
	import type { Movie } from '#lib/types.js';

	let { movie, list, ondone }: { movie: Movie; list: Movie[]; ondone: (index: number | null) => void } = $props();

	let lo = $state(0);
	let hi = $state(0);
	$effect.pre(() => {
		lo = 0;
		hi = list.length;
	});
	const mid = $derived(Math.floor((lo + hi) / 2));
	const remaining = $derived(Math.ceil(Math.log2(hi - lo + 1)));

	function answer(better: boolean) {
		if (better) hi = mid;
		else lo = mid + 1;
		if (lo >= hi) ondone(lo);
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && ondone(null)} />

<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
	<div class="w-full max-w-xl rounded-xl bg-zinc-900 p-5 shadow-2xl">
		<h2 class="text-lg font-semibold">Which did you like more?</h2>
		<p class="mb-4 text-sm text-zinc-500">Placing {movie.title} — about {remaining} more to go.</p>
		{#if list[mid]}
			<div class="grid grid-cols-2 gap-3">
				{#each [{ m: movie, better: true }, { m: list[mid], better: false }] as { m, better } (m.id)}
					<button
						class="flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-zinc-800 p-3 text-center hover:bg-violet-900"
						onclick={() => answer(better)}
					>
						<img
							src="/poster/{encodeURIComponent(m.id)}"
							alt=""
							onerror={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
							class="aspect-2/3 w-32 rounded bg-zinc-700 object-cover"
						/>
						<span class="font-medium">{m.title}</span>
						{#if m.year}<span class="text-sm text-zinc-400">{m.year}</span>{/if}
					</button>
				{/each}
			</div>
		{/if}
		<button class="mt-4 cursor-pointer text-sm text-zinc-500 hover:text-zinc-300" onclick={() => ondone(null)}
			>Skip, leave it at the bottom</button
		>
	</div>
</div>
