<script lang="ts">
	import { page } from '$app/stores';

	import Chat from '$lib/components/chat/Prototyper.svelte';
	import Help from '$lib/components/layout/Help.svelte';
</script>

<Help />
<Chat chatIdProp={$page.params.id} />
