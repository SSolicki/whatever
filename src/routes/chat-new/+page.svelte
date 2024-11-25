<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { chatId, chats } from '$lib/stores';

	import Chat from '$lib/components/chat/Chat.new.svelte';

	let loaded = false;

	onMount(() => {
		loaded = true;
	});
</script>

{#if loaded}
	<Chat />
{:else}
	<div class="w-full h-screen flex items-center justify-center">
		<div class="loading loading-spinner loading-lg" />
	</div>
{/if}
