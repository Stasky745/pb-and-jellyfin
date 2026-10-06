<script lang="ts">
	import './layout.css';
	import logo from '#lib/assets/logo.svg';
	import { APP_NAME } from '#lib/app.js';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>{APP_NAME}</title>
</svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
	{#if data.me}
		<header class="border-b border-zinc-800">
			<div class="flex items-center px-4 py-3 lg:px-8">
				<img src={logo} alt="" class="mr-2 size-8" />
				<span class="text-lg font-bold">{APP_NAME}</span>
				<form method="POST" action="/logout" class="ml-auto">
					<button class="cursor-pointer text-sm text-zinc-500 hover:text-zinc-300">Log out {data.me.name}</button>
				</form>
			</div>
		</header>
	{/if}
	{@render children()}
</div>
