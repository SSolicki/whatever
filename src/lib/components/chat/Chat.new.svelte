<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import { toast } from 'svelte-sonner';
	import mermaid from 'mermaid';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import { getContext, onDestroy, onMount, tick } from 'svelte';
	import type { Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import { getChatById } from '$lib/apis/chats';

	// Define TypeScript types for history
	type Message = {
    	done: boolean;
    	[key: string]: any;
	};

	type History = {
    	currentId: string | null;
    	messages: Record<string, Message>;
	};

	// Initialize history with default values
	export let history: History = {
    	currentId: null,
    	messages: {}
	};

	let prompt = '';
	let files = [];
	let webSearchEnabled = false;
	let selectedToolIds = [];

	import {
		chatId,
		chats,
		config,
		models,
		tags as allTags,
		settings,
		showSidebar,
		WEBUI_NAME,
		banners,
		user,
		socket,
		showControls,
		showCallOverlay,
		currentChatPage,
		temporaryChatEnabled,
		mobile,
		showOverview,
		chatTitle,
		showArtifacts,
		tools
	} from '$lib/stores';

	import Banner from '../common/Banner.svelte';
	import MessageInput from '$lib/components/chat/MessageInput.svelte';
	import Messages from '$lib/components/chat/Messages.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import ChatControls from './ChatControls.svelte';
	import EventConfirmDialog from '../common/ConfirmDialog.svelte';
	import Placeholder from './Placeholder.svelte';

	const i18n: Writable<i18nType> = getContext('i18n');

	export let chatIdProp = '';

	let loaded = false;
	const eventTarget = new EventTarget();
	let chat = null;
	let chatFiles = [];
	let selectedModels = [''];
	let atSelectedModel: Model | undefined;
	let selectedModelIds = [];
	$: selectedModelIds = atSelectedModel !== undefined ? [atSelectedModel.id] : selectedModels;

	$: if (selectedModels && chatIdProp !== '') {
		saveSessionSelectedModels();
	}

	const saveSessionSelectedModels = () => {
		if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === '')) {
			return;
		}
		sessionStorage.selectedModels = JSON.stringify(selectedModels);
		console.log('saveSessionSelectedModels', selectedModels, sessionStorage.selectedModels);
	};

	$: if (selectedModels) {
		setToolIds();
	}

	const setToolIds = async () => {
		if (!$tools) {
			tools.set(await getTools(localStorage.token));
		}

		if (selectedModels.length !== 1) {
			return;
		}
		const model = $models.find((m) => m.id === selectedModels[0]);
		if (model) {
			selectedToolIds = (model?.info?.meta?.toolIds ?? []).filter((id) =>
				$tools.find((t) => t.id === id)
			);
		}
	};

	// Debug logging for model store
	$: if ($models) {
		console.log('Models store updated:', $models);
		console.log('Selected models:', selectedModels);
		console.log('Available model IDs:', $models.map(m => m.id));
	}

	// Subscribe to model changes
	$: if ($models.length > 0 && selectedModels.length === 1 && selectedModels[0] === '') {
		console.log('Setting default model from available models');
		selectedModels = [$models[0].id];
	}

	let stopResponseFlag = false;
	let processing = false;
	let tags = [];
	let params = {};
	let controlPane;
	let controlPaneComponent;
	let autoScroll = true;
	let messagesContainerElement;
	let navbarElement;

	// Declare unsubscriber variables
	let chatIdUnsubscriber: () => void;
	let chatsUnsubscriber: () => void;
	let configUnsubscriber: () => void;
	let modelsUnsubscriber: () => void;
	let allTagsUnsubscriber: () => void;
	let settingsUnsubscriber: () => void;
	let showSidebarUnsubscriber: () => void;
	let bannersUnsubscriber: () => void;
	let userUnsubscriber: () => void;
	let showControlsUnsubscriber: () => void;
	let showCallOverlayUnsubscriber: () => void;
	let currentChatPageUnsubscriber: () => void;
	let temporaryChatEnabledUnsubscriber: () => void;
	let mobileUnsubscriber: () => void;
	let showOverviewUnsubscriber: () => void;
	let socketUnsubscriber: () => void;
	let chatTitleUnsubscriber: () => void;
	let showArtifactsUnsubscriber: () => void;
	let toolsUnsubscriber: () => void;

	let showEventConfirmation = false;
	let eventConfirmationTitle = '';
	let eventConfirmationMessage = '';
	let eventConfirmationInput = false;

	// Add toolIds state
	let toolIds: string[] = [];

	// Initialize new chat function
	const initNewChat = async () => {
		console.log('Initializing new chat');
		console.log('Current models:', $models);
		console.log('Current selected models:', selectedModels);

		// Initialize selected models
		if (sessionStorage.selectedModels) {
			selectedModels = JSON.parse(sessionStorage.selectedModels);
			sessionStorage.removeItem('selectedModels');
			console.log('Loaded models from session storage:', selectedModels);
		} else {
			if ($page.url.searchParams.get('models')) {
				selectedModels = $page.url.searchParams.get('models')?.split(',');
				console.log('Loaded models from URL models param:', selectedModels);
			} else if ($page.url.searchParams.get('model')) {
				const urlModels = $page.url.searchParams.get('model')?.split(',');
				console.log('URL model param models:', urlModels);

				if (urlModels.length === 1) {
					const m = $models.find((m) => m.id === urlModels[0]);
					if (!m) {
						console.log('Model not found, opening selector');
						const modelSelectorButton = document.getElementById('model-selector-0-button');
						if (modelSelectorButton) {
							modelSelectorButton.click();
							await tick();

							const modelSelectorInput = document.getElementById('model-search-input');
							if (modelSelectorInput) {
								modelSelectorInput.focus();
								modelSelectorInput.value = urlModels[0];
								modelSelectorInput.dispatchEvent(new Event('input'));
							}
						}
					} else {
						selectedModels = urlModels;
						console.log('Set model from URL:', selectedModels);
					}
				} else {
					selectedModels = urlModels;
					console.log('Set models from URL:', selectedModels);
				}
			} else if ($settings?.models) {
				selectedModels = $settings?.models;
				console.log('Set models from settings:', selectedModels);
			} else if ($config?.default_models) {
				console.log('Default models config:', $config?.default_models);
				selectedModels = $config?.default_models.split(',');
				console.log('Set models from config:', selectedModels);
			}
		}

		// Filter out invalid models
		const validModelIds = $models.map((m) => m.id);
		console.log('Valid model IDs:', validModelIds);
		selectedModels = selectedModels.filter((modelId) => validModelIds.includes(modelId));
		console.log('Filtered models:', selectedModels);

		if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === '')) {
			if ($models.length > 0) {
				selectedModels = [$models[0].id];
				console.log('Set default model:', selectedModels);
			} else {
				selectedModels = [''];
				console.log('No models available, using empty model');
			}
		}

		// Initialize chat if chatIdProp is provided
		if (chatIdProp) {
			try {
				chat = await getChatById(localStorage.token, chatIdProp);
				if (chat) {
					chatId.set(chat.id);
					if (chat.models) {
						selectedModels = chat.models;
					}
					if (chat.tags) {
						tags = chat.tags;
					}
					if (chat.files) {
						chatFiles = chat.files;
					}
				}
			} catch (error) {
				console.error('Error getting chat:', error);
				goto('/');
			}
		}

		await showControls.set(false);
		await showCallOverlay.set(false);
		await showOverview.set(false);
		await showArtifacts.set(false);
		loaded = true;
	};

	// Event handler for socket messages
	const onMessageHandler = async (event: MessageEvent) => {
    if (event.origin !== window.origin) {
        return;
    }

    // Handle prompt input
    if (event.data.type === 'input:prompt') {
        console.debug(event.data.text);
        const inputElement = document.getElementById('chat-input');
        if (inputElement) {
            prompt = event.data.text;
            inputElement.focus();
        }
    }

    // Handle submit action
    if (event.data.type === 'action:submit') {
        console.debug(event.data.text);
        if (prompt !== '') {
            await tick();
            submitPrompt(prompt);
        }
    }

    // Handle prompt submit
    if (event.data.type === 'input:prompt:submit') {
        console.debug(event.data.text);
        if (prompt !== '') {
            await tick();
            submitPrompt(event.data.text);
        }
    }
};

// Chat event handler function
const chatEventHandler = async (event: any) => {
    if (event.type === 'chat-updated' && event.chatId === $chatId) {
        chat = await getChatById(localStorage.token, event.chatId);
    }
};

	// Lifecycle functions
	onMount(async () => {
		console.log('Chat.new.svelte mounted');
		
		// Initialize mermaid for diagram rendering
		mermaid.initialize({
			startOnLoad: true,
			theme: 'default',
			securityLevel: 'loose',
			fontFamily: 'var(--font-sans)'
		});

		// Initialize models from store
		console.log('Initial models:', $models);
		if ($models.length > 0 && selectedModels.length === 1 && selectedModels[0] === '') {
			selectedModels = [$models[0].id];
			console.log('Set initial model:', selectedModels);
		}

		// Initialize event listeners
		window.addEventListener('message', onMessageHandler);
		$socket?.on('chat-events', chatEventHandler);

		// Initialize chat if chatIdProp is provided
		if (chatIdProp) {
			await loadChat();
		} else {
			await initNewChat();
		}

		// Focus chat input
		const chatInput = document.getElementById('chat-input');
		chatInput?.focus();

		// Mark component as loaded
		loaded = true;

		// Subscribe to showControls changes
		showControls.subscribe(async (value) => {
			if (controlPane && !$mobile) {
				try {
					if (value) {
						controlPaneComponent.openPane();
					} else {
						controlPane.collapse();
					}
				} catch (e) {
					// ignore
				}
			}

			if (!value) {
				showCallOverlay.set(false);
				showOverview.set(false);
				showArtifacts.set(false);
			}
		});
	});

	onDestroy(() => {
		// Clean up event listeners
		window.removeEventListener('message', onMessageHandler);
		$socket?.off('chat-events', chatEventHandler);

		// Clean up store subscriptions
		chatIdUnsubscriber?.();
		chatsUnsubscriber?.();
		configUnsubscriber?.();
		modelsUnsubscriber?.();
		allTagsUnsubscriber?.();
		settingsUnsubscriber?.();
		showSidebarUnsubscriber?.();
		bannersUnsubscriber?.();
		userUnsubscriber?.();
		socketUnsubscriber?.();
		showControlsUnsubscriber?.();
		showCallOverlayUnsubscriber?.();
		currentChatPageUnsubscriber?.();
		temporaryChatEnabledUnsubscriber?.();
		mobileUnsubscriber?.();
		showOverviewUnsubscriber?.();
		chatTitleUnsubscriber?.();
		showArtifactsUnsubscriber?.();
		toolsUnsubscriber?.();
	});

	// Chat loading function
	const loadChat = async () => {
		if (!chatIdProp) return false;

		try {
			const res = await getChatById(localStorage.token, chatIdProp);
			if (!res) {
				toast.error('Chat not found');
				return false;
			}

			chat = res;
			tags = await getTagsById(localStorage.token, chatIdProp);
			history = convertMessagesToHistory(chat.messages);
			selectedModels = chat.models;

			await setToolIds();
			await chatId.set(chatIdProp);
			await chatTitle.set(chat.title);

			return true;
		} catch (e) {
			console.error('Error loading chat:', e);
			toast.error('Error loading chat');
			return false;
		}
	};

	// Store subscriptions setup
	chatIdUnsubscriber = chatId.subscribe(() => {});
	chatsUnsubscriber = chats.subscribe(() => {});
	configUnsubscriber = config.subscribe(() => {});
	modelsUnsubscriber = models.subscribe(() => {});
	allTagsUnsubscriber = allTags.subscribe(() => {});
	settingsUnsubscriber = settings.subscribe(() => {});
	showSidebarUnsubscriber = showSidebar.subscribe(() => {});
	bannersUnsubscriber = banners.subscribe(() => {});
	userUnsubscriber = user.subscribe(() => {});
	socketUnsubscriber = socket.subscribe(() => {});
	showControlsUnsubscriber = showControls.subscribe(() => {});
	showCallOverlayUnsubscriber = showCallOverlay.subscribe(() => {});
	currentChatPageUnsubscriber = currentChatPage.subscribe(() => {});
	temporaryChatEnabledUnsubscriber = temporaryChatEnabled.subscribe(() => {});
	mobileUnsubscriber = mobile.subscribe(() => {});
	showOverviewUnsubscriber = showOverview.subscribe(() => {});
	chatTitleUnsubscriber = chatTitle.subscribe(() => {});
	showArtifactsUnsubscriber = showArtifacts.subscribe(() => {});
	toolsUnsubscriber = tools.subscribe(() => {});

	$: if (chatIdProp) {
		(async () => {
			console.log(chatIdProp);
			if (chatIdProp && (await loadChat())) {
				await tick();
				loaded = true;

				window.setTimeout(() => scrollToBottom(), 0);
				const chatInput = document.getElementById('chat-input');
				chatInput?.focus();
			} else {
				await goto('/');
			}
		})();
	}

	$: {
		chatIdUnsubscriber = chatId.subscribe((value) => {
			// Handle chatId changes
		});

		chatsUnsubscriber = chats.subscribe((value) => {
			// Handle chats changes
		});

		configUnsubscriber = config.subscribe((value) => {
			// Handle config changes
		});

		modelsUnsubscriber = models.subscribe((value) => {
			// Handle models changes
		});

		allTagsUnsubscriber = allTags.subscribe((value) => {
			// Handle allTags changes
		});

		settingsUnsubscriber = settings.subscribe((value) => {
			// Handle settings changes
		});

		showSidebarUnsubscriber = showSidebar.subscribe((value) => {
			// Handle showSidebar changes
		});

		bannersUnsubscriber = banners.subscribe((value) => {
			// Handle banners changes
		});

		userUnsubscriber = user.subscribe((value) => {
			// Handle user changes
		});

		socketUnsubscriber = socket.subscribe((value) => {
			// Handle socket changes
		});

		showControlsUnsubscriber = showControls.subscribe((value) => {
			// Handle showControls changes
		});

		showCallOverlayUnsubscriber = showCallOverlay.subscribe((value) => {
			// Handle showCallOverlay changes
		});

		currentChatPageUnsubscriber = currentChatPage.subscribe((value) => {
			// Handle currentChatPage changes
		});

		temporaryChatEnabledUnsubscriber = temporaryChatEnabled.subscribe((value) => {
			// Handle temporaryChatEnabled changes
		});

		mobileUnsubscriber = mobile.subscribe((value) => {
			// Handle mobile changes
		});

		showOverviewUnsubscriber = showOverview.subscribe((value) => {
			// Handle showOverview changes
		});

		chatTitleUnsubscriber = chatTitle.subscribe((value) => {
			// Handle chatTitle changes
		});

		showArtifactsUnsubscriber = showArtifacts.subscribe((value) => {
			// Handle showArtifacts changes
		});

		toolsUnsubscriber = tools.subscribe((value) => {
			// Handle tools changes
		});
	}

	$: {
		if ($chatId) {
			chatTitle.set(chat?.title || '');
		}
	}

	$: {
		if (messagesContainerElement && autoScroll) {
			messagesContainerElement.scrollTop = messagesContainerElement.scrollHeight;
		}
	}

	// Error handling
	const handleError = (error: any, context: string) => {
		console.error(`Error in ${context}:`, error);
		const errorMessage = error?.message || 'An unexpected error occurred';
		toast.error(errorMessage);
		processing = '';
		stopResponseFlag = false;
	};

	// Event handlers
	const handleSubmit = async (event: CustomEvent) => {
		try {
			const { prompt } = event.detail;
			if (!prompt?.trim()) return;

			await submitPrompt(prompt);
		} catch (error) {
			handleError(error, 'handleSubmit');
		}
	};

	const handleStop = () => {
		stopResponseFlag = true;
		processing = '';
	};

	const handleModelSelect = async (event: CustomEvent) => {
		try {
			const { model } = event.detail;
			if (!model) return;

			selectedModels = [model];
			if (chat?.id) {
				await saveChatHandler(chat.id);
			}
		} catch (error) {
			handleError(error, 'handleModelSelect');
		}
	};

	const handleToolSelect = async (event: CustomEvent) => {
		try {
			const { toolId } = event.detail;
			await setToolIds([toolId]);
		} catch (error) {
			handleError(error, 'handleToolSelect');
		}
	};

	const handleWebSearchToggle = async (event: CustomEvent) => {
		try {
			const { enabled } = event.detail;
			webSearchEnabled = enabled;
		} catch (error) {
			handleError(error, 'handleWebSearchToggle');
		}
	};

	const handleChatDelete = () => {
		eventConfirmationTitle = 'Delete Chat';
		eventConfirmationMessage = 'Are you sure you want to delete this chat?';
		eventConfirmationInput = false;
		showEventConfirmation = true;
	};

	const handleChatClear = () => {
		eventConfirmationTitle = 'Clear Chat';
		eventConfirmationMessage = 'Are you sure you want to clear this chat?';
		eventConfirmationInput = false;
		showEventConfirmation = true;
	};

	const handleEventConfirm = async (event: CustomEvent) => {
		try {
			const { action } = event.detail;
			if (action === 'delete') {
				await deleteChatHandler();
			} else if (action === 'clear') {
				await clearChatHandler();
			}
		} catch (error) {
			handleError(error, 'handleEventConfirm');
		} finally {
			showEventConfirmation = false;
		}
	};

	const handleEventCancel = () => {
		showEventConfirmation = false;
	};

	const handleTagAdd = async (event: CustomEvent) => {
		try {
			const { tag } = event.detail;
			if (!tag?.trim() || !chat?.id) return;

			await addTagById(localStorage.token, chat.id, tag);
			tags = await getTagsById(localStorage.token, chat.id);
		} catch (error) {
			handleError(error, 'handleTagAdd');
		}
	};

	const handleTagDelete = async (event: CustomEvent) => {
		try {
			const { tagId } = event.detail;
			if (!tagId || !chat?.id) return;

			await deleteTagById(localStorage.token, chat.id, tagId);
			tags = await getTagsById(localStorage.token, chat.id);
		} catch (error) {
			handleError(error, 'handleTagDelete');
		}
	};

	onDestroy(() => {
		chatIdUnsubscriber?.();
		chatsUnsubscriber?.();
		configUnsubscriber?.();
		modelsUnsubscriber?.();
		allTagsUnsubscriber?.();
		settingsUnsubscriber?.();
		showSidebarUnsubscriber?.();
		bannersUnsubscriber?.();
		userUnsubscriber?.();
		socketUnsubscriber?.();
		showControlsUnsubscriber?.();
		showCallOverlayUnsubscriber?.();
		currentChatPageUnsubscriber?.();
		temporaryChatEnabledUnsubscriber?.();
		mobileUnsubscriber?.();
		showOverviewUnsubscriber?.();
		chatTitleUnsubscriber?.();
		showArtifactsUnsubscriber?.();
		toolsUnsubscriber?.();
	});
</script>

<svelte:head>
	<title>
		{$chatTitle
			? `${$chatTitle} - ${WEBUI_NAME}`
			: WEBUI_NAME}
	</title>
</svelte:head>

{#if !chatIdProp || (loaded && chatIdProp)}
	<div
		class="h-screen max-h-[100dvh] w-full max-w-full flex flex-col {$showSidebar
			? 'md:max-w-[calc(100%-260px)] md:ml-[260px]'
			: ''} {$mobile ? 'overflow-hidden' : ''}"
	>
		{#if $settings?.backgroundImageUrl}
			<div
				class="absolute {$showSidebar
					? 'md:max-w-[calc(100%-260px)] md:translate-x-[260px]'
					: ''} w-full h-full bg-cover bg-center opacity-10 -z-10"
				style="background-image: url({$settings.backgroundImageUrl})"
			/>
		{/if}

		<PaneGroup
			direction="horizontal"
			class="w-full h-full {$mobile ? 'flex-col' : 'flex-row'}"
		>
			<Pane
				defaultSize={$mobile ? 100 : 50}
				class="h-full flex w-full relative {$mobile ? 'min-h-[60vh]' : ''}"
			>
				{#if $banners.length > 0 && !history.currentId && !$chatId && selectedModels.length <= 1}
					<div class="absolute top-12 left-0 right-0 w-full z-30">
						<div class="flex flex-col gap-1 w-full px-4">
							{#each $banners as banner}
								<Banner {banner} />
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex flex-col w-full h-full">
					<Navbar
						bind:this={navbarElement}
						class="{$mobile ? 'sticky top-0 z-50 bg-base-100' : ''}"
					/>
					
					<div class="flex-1 overflow-hidden relative">
						{#if loaded}
							{#if !history?.currentId || history.messages[history.currentId]?.done === true}
								<Messages
									bind:messagesContainerElement
									{history}
									{selectedModels}
									{stopResponseFlag}
									{processing}
									class="h-full overflow-y-auto {$mobile ? 'pb-16' : ''}"
								/>
							{:else}
								<Placeholder class="h-full" />
							{/if}
						{:else}
							<div class="w-full h-full flex items-center justify-center">
								<div class="loading loading-spinner loading-lg" />
							</div>
						{/if}

						{#if processing}
							<div class="absolute bottom-4 right-4 z-50">
								<button
									class="btn btn-circle btn-sm btn-error"
									on:click={handleStop}
								>
									<span class="i-lucide-square-dot text-lg" />
								</button>
							</div>
						{/if}
					</div>

					<MessageInput
						{selectedModels}
						{stopResponseFlag}
						{processing}
						on:submit={handleSubmit}
						on:stop={handleStop}
						class="{$mobile ? 'fixed bottom-0 left-0 right-0 z-50 bg-base-100' : ''}"
					/>
				</div>
			</Pane>

			{#if $showControls}
				{#if !$mobile}
					<PaneResizer />
				{/if}
				<Pane
					defaultSize={$mobile ? 100 : 50}
					minSize={$mobile ? 100 : 20}
					maxSize={$mobile ? 100 : 80}
					class="{$mobile ? 'min-h-[40vh]' : ''}"
				>
					<ChatControls
						bind:this={controlPaneComponent}
						bind:element={controlPane}
						{selectedModels}
						{tags}
						on:modelSelect={handleModelSelect}
						on:toolSelect={handleToolSelect}
						on:webSearchToggle={handleWebSearchToggle}
						on:chatDelete={handleChatDelete}
						on:chatClear={handleChatClear}
						on:tagAdd={handleTagAdd}
						on:tagDelete={handleTagDelete}
					/>
				</Pane>
			{/if}
		</PaneGroup>
	</div>
{:else}
	<div class="w-full h-full flex items-center justify-center">
		<div class="loading loading-spinner loading-lg" />
	</div>
{/if}

{#if showEventConfirmation}
	<EventConfirmDialog
		title={eventConfirmationTitle}
		message={eventConfirmationMessage}
		showInput={eventConfirmationInput}
		on:confirm={handleEventConfirm}
		on:cancel={handleEventCancel}
	/>
{/if}
