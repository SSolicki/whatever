<script lang="ts">
	import { getContext, onDestroy, onMount, tick } from 'svelte';
	import { get, type Unsubscriber, type Writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { i18n as i18nType } from 'i18next';
	import { toast } from 'svelte-sonner';
	import type { Socket } from 'socket.io-client';
	import { v4 as uuidv4 } from 'uuid';
	import { marked } from 'marked';
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import { EllipsisVertical } from 'lucide-svelte';
	import { WEBUI_BASE_URL } from '$lib/constants';

	// Component imports
	import Banner from '$lib/components/common/Banner.svelte';
	import MessageInput from '$lib/components/chat/MessageInput.svelte';
	import Messages from '$lib/components/chat/Messages.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import ChatControls from '$lib/components/chat/ChatControls.svelte';
	import EventConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Placeholder from '$lib/components/chat/Placeholder.svelte';
	import ModelSelector from '$lib/components/chat/ModelSelector.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	// Utility imports
	import { getTools } from '$lib/apis/tools';
	import { 
		initNewChat,
		chatActionHandler,
		createMessagesList,
		createMessagePair,
		submitPrompt,
		stopResponse,
		loadChat,
		handleNewChat,
		handleMessageActionWrapper,
		handleMessage,
		handleSubmit,
		handleFileUpload,
		handleUrlProcess,
		handleYoutubeUpload,
		handleWebUpload,
		continueResponse,
		regenerateResponse,
		showMessage,
		submitMessage,
		mergeResponses,
		handleMediaQuery,
		onMouseDown,
		onMouseUp
	} from '$lib/utils/ChatLogicHandlers';
	
	import {
		setupEventListeners,
		onMessageHandler,
		chatEventHandler,
		handleControlsVisibility,
		handlePaneResize,
		handlePaneCollapse,
		initializePane,
		cleanupPane,
		handleMessageAction,
		handleTouchStart,
		handleTouchEnd,
		manageFocus
	} from '$lib/utils/EventHandlers';
	
	import {
		scrollToBottom,
		isValidMessage,
		formatMessage,
		isMessageProcessing,
		getMessageRole,
		extractCodeBlocks
	} from '$lib/utils/ChatUtils';
	
	import {
		uploadFile,
		uploadWeb,
		uploadYoutubeTranscription
	} from '$lib/utils/FileUpload';

	// Core stores
	import {
		chats,
		config,
		type Model,
		models,
		WEBUI_NAME,
	} from '$lib/stores';

	// Chat-specific stores
	import {
		chatId,
		chatHistory as history,
		banners,
		showSidebar,
		settings,
		chatTitle,
		socket,
		showArtifacts,
		showControls,
		showCallOverlay,
		currentChatPage,
		temporaryChatEnabled,
		showOverview,
		messageQueue,
		pendingMessages,
		processingMessage,
		controlPaneSize,
		isLargeScreen,
		isDragging,
		controlPaneMinSize,
		controlPaneReady,
		mobile,
		tools,
	} from '$lib/stores';

	const i18n: Writable<i18nType> = getContext('i18n');

	let selectedModels: string[] = [];

	onMount(async () => {
		console.log('Chat.new.svelte mounted', { loaded, chatIdProp });
		loaded = true;

		// Initialize model selection
		if (sessionStorage.selectedModels) {
			selectedModels = JSON.parse(sessionStorage.selectedModels);
			sessionStorage.removeItem('selectedModels');
		} else if (get(settings)?.defaultModel) {
			selectedModels = [get(settings).defaultModel];
		}

		window.addEventListener('message', onMessageHandler);
		$socket?.on('chat-events', chatEventHandler);

		// Initialize touch handlers
		document.addEventListener('touchstart', handleTouchStart);
		document.addEventListener('touchend', handleTouchEnd);

		// Initialize media query
		mediaQuery = window.matchMedia('(min-width: 1024px)');
		mediaQuery.addEventListener('change', handleMediaQuery);

		// Initialize pane controls
		if (controlPane) {
			initializePane(controlPane);
		}

		// Initialize messagesContainerElement
		messagesContainerElement = null;

		if (!$chatId) {
			chatIdUnsubscriber = chatId.subscribe(async (value) => {
				if (!value) {
					await initNewChat();
				}
			});
		} else {
			if ($temporaryChatEnabled) {
				await goto('/');
			}
		}

		// Focus chat input
		const chatInput = document.getElementById('chat-input');
		chatInput?.focus();

		// Store subscriptions
		unsubscribeSettings = settings.subscribe(value => {
			if (value) {
				// Handle settings changes
				console.log('Settings updated:', value);
			}
		});

		chatIdUnsubscriber = chatId.subscribe(value => {
			if (value) {
				// Handle chat ID changes
				console.log('Chat ID updated:', value);
			}
		});

		// Setup event listeners and store cleanup function
		cleanup = setupEventListeners($socket);

		// Select the container element you want to observe
		const container = document.getElementById('chat-container');
		if (container) {
			const initialMinSize = Math.floor((350 / container.clientWidth) * 100);
			controlPaneMinSize.set(initialMinSize);

			// Create a new ResizeObserver instance
			resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					const width = entry.contentRect.width;
					const percentage = (350 / width) * 100;
					controlPaneMinSize.set(Math.floor(percentage));

					if ($showControls && $controlPaneReady && controlPane?.isExpanded()) {
						const size = controlPane.getSize();
						if (size < $controlPaneMinSize) {
							controlPane.resize($controlPaneMinSize);
							$controlPaneSize = controlPane.getSize();
						}
					}
				}
			});

			// Start observing the container's size changes
			resizeObserver.observe(container);
		}

		// Add mouse event listeners
		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('mouseup', onMouseUp);
	});

	onDestroy(() => {
		// Reset UI state
		$showControls = false;
		$controlPaneSize = null;
		$controlPaneReady = false;

		// Remove event listeners
		document.removeEventListener('touchstart', handleTouchStart);
		document.removeEventListener('touchend', handleTouchEnd);
		if (mediaQuery) {
			mediaQuery.removeEventListener('change', handleMediaQuery);
		}
		document.removeEventListener('mousedown', onMouseDown);
		document.removeEventListener('mouseup', onMouseUp);

		// Cleanup resize observer
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		// Clean up all event listeners
		cleanupPane();
		if (cleanup) cleanup();
		debouncedResizeHandler.cancel();

		// Clean up individual stores
		chatId.set(null);
		chats.set({});
		config.set({});
		history.set([]);
		banners.set([]);
		settings.set({});
		chatTitle.set('');
		socket.set(null);
		showArtifacts.set(false);
		showControls.set(false);
		showCallOverlay.set(false);
		currentChatPage.set(1);
		temporaryChatEnabled.set(false);
		showOverview.set(false);
		messageQueue.set([]);
		pendingMessages.set([]);
		processingMessage.set(null);
		controlPaneSize.set(null);
		isLargeScreen.set(false);
		isDragging.set(false);
		controlPaneMinSize.set(0);
		controlPaneReady.set(false);
		mobile.set(false);
		tools.set([]);
	});

	// Component state
	export let chatIdProp = '';
	
	let loaded = false;
	const eventTarget = new EventTarget();
	let controlPane;
	let controlPaneComponent;
	let messagesContainerElement: HTMLDivElement | null = null;

	let stopResponseFlag = false;
	let autoScroll = true;
	let processing = '';
	let navbarElement;

	let showEventConfirmation = false;
	let eventConfirmationTitle = '';
	let eventConfirmationMessage = '';
	let eventConfirmationInput = false;
	let eventConfirmationInputPlaceholder = '';
	let eventConfirmationInputValue = '';
	let eventCallback = null;

	let chatIdUnsubscriber: Unsubscriber | undefined;

	let atSelectedModel: Model | undefined;
	let selectedModelIds = [];
	$: selectedModelIds = atSelectedModel !== undefined ? [atSelectedModel.id] : selectedModels;

	let selectedToolIds = [];
	let webSearchEnabled = false;

	let chat = null;
	let tags = [];

	// Chat Input
	let prompt = '';
	let chatFiles = [];
	let files = [];
	let params = {};

	let uploading = false;
	let webUrl = '';
	let youtubeUrl = '';

	let dragged = false;
	let loading = false;

	// Event confirmation handler
	const showEventConfirm = (title: string, message: string, callback: () => void, input = false) => {
		eventConfirmationTitle = title;
		eventConfirmationMessage = message;
		eventCallback = callback;
		eventConfirmationInput = input;
		eventConfirmationInputValue = '';
		showEventConfirmation = true;
	};

	// Event handlers


	// Message queue management
	$: if ($messageQueue.length > 0 && !$processingMessage) {
		const nextMessage = $messageQueue[0];
		processingMessage.set(nextMessage);
		messageQueue.update(queue => queue.slice(1));
		// Process the message...
	}

	// Processing state handling
	$: isProcessing = $processingMessage !== null;

	// Control panel state
	$: if (controlPane) {
		initializePane(controlPane);
	}

	// Control panel visibility
	$: if ($showControls && $controlPaneReady && controlPane?.isExpanded()) {
		const size = controlPane.getSize();
		if (size < $controlPaneMinSize) {
			controlPane.resize($controlPaneMinSize);
			$controlPaneSize = controlPane.getSize();
		}
	}

	// Pane resize handling
	$: if (controlPane) {
		showControls.subscribe(async (value) => {
			if (controlPane && !$mobile) {
				try {
					if (value) {
						if (parseInt(localStorage?.chatControlsSize)) {
							controlPane.resize(parseInt(localStorage?.chatControlsSize));
							$controlPaneSize = controlPane.getSize();
						} else if ($controlPaneMinSize) {
							controlPane.resize($controlPaneMinSize);
							$controlPaneSize = $controlPaneMinSize;
						}
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
	}

	$: if (selectedModels.length > 0) {
		sessionStorage.setItem('selectedModels', JSON.stringify(selectedModels));
	}

	$: if (selectedModels) {
		tools.set(selectedModels.map(model => ({
			id: model.id,
			name: model.name,
			config: model.config
		})));
	}
</script>

	<svelte:head>
		<title>
			{$chatTitle
				? `${$chatTitle.length > 30 ? `${$chatTitle.slice(0, 30)}...` : $chatTitle} | {$WEBUI_NAME}`
				: `${$WEBUI_NAME}`}
		</title>
	</svelte:head>

	<audio id="audioElement" src="" style="display: none;" />

	<EventConfirmDialog
		bind:show={showEventConfirmation}
		title={eventConfirmationTitle}
		message={eventConfirmationMessage}
		input={eventConfirmationInput}
		inputPlaceholder={eventConfirmationInputPlaceholder}
		inputValue={eventConfirmationInputValue}
		on:confirm={(e) => {
			if (e.detail) {
				eventCallback(e.detail);
			} else {
				eventCallback(true);
			}
		}}
		on:cancel={() => {
			eventCallback(false);
		}}
	/>

	{#if !chatIdProp || (loaded && chatIdProp)}
		<div class="flex flex-col h-screen">
			<Navbar
				bind:this={navbarElement}
				chat={{
					id: $chatId,
					chat: {
						title: $chatTitle,
						models: selectedModels,
						system: $settings?.system ?? 'default_system_value',
						params: params,
						history: history,
						timestamp: Date.now()
					}
				}}
				title={$chatTitle}
				bind:selectedModels
				showModelSelector={true}
				showSetDefault={true}
				shareEnabled={!!history.currentId}
				{initNewChat}
			/>

			<div
				class="h-screen max-h-[100dvh] {$showSidebar
					? 'md:max-w-[calc(100%-260px)]'
					: ''} w-full max-w-full flex flex-col"
				id="chat-container"
			>
				{#if $settings?.backgroundImageUrl ?? null}
					<div
						class="absolute {$showSidebar
							? 'md:max-w-[calc(100%-260px)] md:translate-x-[260px]'
							: ''} top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat"
						style="background-image: url({$settings?.backgroundImageUrl ?? ''})  "
					/>

					<div
						class="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-white to-white/85 dark:from-gray-900 dark:to-[#171717]/90 z-0"
					/>
				{/if}

				<PaneGroup direction="horizontal" class="w-full h-full">
					<Pane defaultSize={50} class="h-full flex w-full relative overflow-hidden">
						<div class="flex flex-col flex-auto z-10 w-full">
							<div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
								<div class="flex-1 max-w-xl">
									<ModelSelector
										bind:selectedModels
										showSetDefault={false}
										disabled={false}
									/>
								</div>
							</div>
							{#if $banners.length > 0 && !history.currentId && !$chatId && selectedModels.length <= 1}
								<div class="absolute top-12 left-0 right-0 w-full z-30">
									<div class=" flex flex-col gap-1 w-full">
										{#each $banners.filter( (b) => (b.dismissible ? !JSON.parse(localStorage.getItem('dismissedBannerIds') ?? '[]').includes(b.id) : true) ) as banner}
											<Banner
												{banner}
												on:dismiss={(e) => {
													const bannerId = e.detail;

													localStorage.setItem(
														'dismissedBannerIds',
														JSON.stringify(
															[
																bannerId,
																...JSON.parse(localStorage.getItem('dismissedBannerIds') ?? '[]')
															].filter((id) => $banners.find((b) => b.id === id))
														)
													);
												}}
											/>
										{/each}
									</div>
								</div>
							{/if}

							<div
								class="flex-1 flex flex-col overflow-auto scrollbar-hidden"
								id="messages-container"
								bind:this={messagesContainerElement}
								on:scroll={(e) => {
									autoScroll =
										messagesContainerElement.scrollHeight - messagesContainerElement.scrollTop <=
										messagesContainerElement.clientHeight + 5;
								}}
							>
								<div class="flex-1 w-full flex flex-col">
									<Messages
										chatId={$chatId}
										bind:history={$history}
										bind:autoScroll
										bind:prompt
										{selectedModels}
										{sendPrompt}
										{showMessage}
										{submitMessage}
										{continueResponse}
										{regenerateResponse}
										{mergeResponses}
										{chatActionHandler}
										bottomPadding={files.length > 0}
									/>
								</div>
							</div>

							<div class="flex flex-col p-4 relative">
								<MessageInput
									{history}
									{selectedModels}
									bind:files
									bind:prompt
									bind:autoScroll
									bind:selectedToolIds
									bind:webSearchEnabled
									bind:atSelectedModel
									transparentBackground={$settings?.backgroundImageUrl ?? false}
									{stopResponse}
									{createMessagePair}
									on:upload={async (e) => {
										const { type, data } = e.detail;

										if (type === 'web') {
											await uploadWeb(data);
										} else if (type === 'youtube') {
											await uploadYoutubeTranscription(data);
										}
									}}
									on:submit={async (e) => {
										if (e.detail) {
											await tick();
											submitPrompt(e.detail.replaceAll('\n\n', '\n'));
										}
									}}
								/>

								<div
									class="absolute bottom-1 text-xs text-gray-500 text-center w-full"
								>
									{$i18n.t('LLMs can make mistakes. Verify important information.')}
								</div>
							</div>
						</div>
					</Pane>

					<ChatControls
						bind:this={controlPaneComponent}
						bind:history={$history}
						bind:chatFiles
						bind:params
						bind:files
						bind:pane={controlPane}
						chatId={$chatId}
						modelId={selectedModelIds?.at(0) ?? null}
						models={selectedModelIds.reduce((a, e, i, arr) => {
							const model = $models.find((m) => m.id === e);
							if (model) {
								return [...a, model];
							}
							return a;
						}, [])}
						{submitPrompt}
						{stopResponse}
						{showMessage}
						{eventTarget}
					/>
				</PaneGroup>
			</div>
		</div>
	{/if}
