<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { showSidebar, mobile } from '$lib/stores';

	import Sidebar from '$lib/components/layout/Sidebar.svelte';

	let loaded = false;

	onMount(() => {
		loaded = true;
	});
</script>

<div class="flex min-h-screen">
	{#if loaded}
		<div
			class="fixed top-0 left-0 bottom-0 w-[260px] z-50 {$showSidebar
				? 'translate-x-0'
				: '-translate-x-full'} transition-transform duration-200 ease-in-out"
			transition:fade={{ duration: 200 }}
		>
			<Sidebar />
		</div>

		<div class="flex-1">
			<slot />
		</div>
	{:else}
		<div class="w-full h-screen flex items-center justify-center">
			<div class="loading loading-spinner loading-lg" />
		</div>
	{/if}
</div>
