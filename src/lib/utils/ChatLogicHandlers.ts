import { v4 as uuidv4 } from 'uuid';
import { toast } from 'svelte-sonner';
import mermaid from 'mermaid';
import { models } from '$lib/stores';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';

import { getContext, tick } from 'svelte';

import { type Writable } from 'svelte/store';
import type { i18n as i18nType } from 'i18next';

import {
    chatId,
    settings,
    showControls,
    showCallOverlay,
    currentChatPage,
    showOverview,
    chatTitle,
    showArtifacts,
    autoScroll,
    chatHistory
} from '$lib/stores/ChatStores';

import {
    convertMessagesToHistory
} from '$lib/utils';

import {
    getChatById,
    getChatList,
    getTagsById,
    updateChatById,
    createNewChat
} from '$lib/apis/chats';
import { getUserSettings } from '$lib/apis/users';
import {
    chatCompleted,
    chatAction
} from '$lib/apis';

import { chats } from '$lib/stores';

import { sendPromptOllama, sendPromptOpenAI } from '$lib/utils/ChatResponseHandlers';

// Module-level variables
let chatFiles: any[] = [];
let params = {};
let selectedModels: string[] = [];

/**
 * Initializes a new chat session
 */
export const initNewChat = async () => {
    if (sessionStorage.selectedModels) {
        selectedModels = JSON.parse(sessionStorage.selectedModels);
        sessionStorage.removeItem('selectedModels');
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const modelParam = urlParams.get('model');
        if (modelParam) {
            selectedModels = [modelParam];
        } else if (get(settings)?.defaultModel) {
            selectedModels = [get(settings).defaultModel];
        }
    }

    // Reset state
    chatId.set('');
    chatTitle.set('');
    showControls.set(false);
    showCallOverlay.set(false);
    currentChatPage.set(1);
    showOverview.set(false);
    showArtifacts.set(false);
    autoScroll.set(true);

    // Reset chat history
    chatHistory.set({
        messages: {},
        currentId: null,
        rootId: null
    });

    // Reset module-level variables
    chatFiles = [];
    params = {};
};

export const loadChat = async (id: string) => {
    chatId.set(chatIdProp);
    chat = await getChatById(localStorage.token, $chatId).catch(async (error) => {
        await goto('/');
        return null;
    });

    if (chat) {
        tags = await getTagsById(localStorage.token, $chatId).catch(async (error) => {
            return [];
        });

        const chatContent = chat.chat;

        if (chatContent) {
            console.log(chatContent);

            selectedModels = 
                (chatContent?.models ?? undefined) !== undefined
                    ? chatContent.models
                    : [chatContent.models ?? '']
            ;
            chatHistory.set(
                (chatContent?.history ?? undefined) !== undefined
                    ? chatContent.history
                    : convertMessagesToHistory(chatContent.messages)
            );

            chatTitle.set(chatContent.title);

            const userSettings = await getUserSettings(localStorage.token);

            if (userSettings) {
                await settings.set(userSettings.ui);
            } else {
                await settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));
            }

            params = chatContent?.params ?? {};
            chatFiles = chatContent?.files ?? [];

            autoScroll.set(true);
            await tick();

            if (get(chatHistory).currentId) {
                get(chatHistory).messages[get(chatHistory).currentId].done = true;
            }
            await tick();

            return true;
        } else {
            return null;
        }
    }
};

export const scrollToBottom = () => {
    tick();
    if (messagesContainerElement) {
        messagesContainerElement.scrollTop = messagesContainerElement.scrollHeight;
    }
};

export const createMessagesList = (responseMessageId: string): any[] => {
    if (responseMessageId === null) {
        return [];
    }

    const message = get(chatHistory).messages[responseMessageId];
    if (message?.parentId) {
        return [...createMessagesList(message.parentId), message];
    } else {
        return [message];
    }
};

export const chatCompletedHandler = async (
    chatId: string,
    modelId: string,
    responseMessageId: string,
    messages: any[]
) => {
    await mermaid.run({
        querySelector: '.mermaid'
    });

    const res = await chatCompleted(localStorage.token, {
        model: modelId,
        messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            info: m.info ? m.info : undefined,
            timestamp: m.timestamp,
            ...(m.sources ? { sources: m.sources } : {})
        })),
        chat_id: chatId,
        session_id: $socket?.id,
        id: responseMessageId
    }).catch((error) => {
        toast.error(error);
        messages.at(-1).error = { content: error };

        return null;
    });

    if (res !== null) {
        // Update chat history with the new messages
        for (const message of res.messages) {
            chatHistory.update((h) => {
                h.messages[message.id] = {
                    ...h.messages[message.id],
                    ...(h.messages[message.id].content !== message.content
                        ? { originalContent: h.messages[message.id].content }
                        : {}),
                    ...message
                };
                return h;
            });
        }
    }

    await tick();

    if ($chatId == chatId) {
        if (!$temporaryChatEnabled) {
            chat = await updateChatById(localStorage.token, chatId, {
                models: selectedModels,
                messages: messages,
                history: get(chatHistory),
                params: params,
                files: chatFiles
            });

            currentChatPage.set(1);
            await chats.set(await getChatList(localStorage.token, $currentChatPage));
        }
    }
};

export const chatActionHandler = async (
    chatId: string,
    actionId: string,
    modelId: string,
    responseMessageId: string,
    event: any = null
) => {
    const messages = createMessagesList(responseMessageId);

    const res = await chatAction(localStorage.token, actionId, {
        model: modelId,
        messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            info: m.info ? m.info : undefined,
            timestamp: m.timestamp,
            ...(m.sources ? { sources: m.sources } : {})
        })),
        ...(event ? { event: event } : {}),
        chat_id: chatId,
        session_id: $socket?.id,
        id: responseMessageId
    }).catch((error) => {
        toast.error(error);
        messages.at(-1).error = { content: error };
        return null;
    });

    if (res !== null) {
        // Update chat history with the new messages
        for (const message of res.messages) {
            chatHistory.update((h) => {
                h.messages[message.id] = {
                    ...h.messages[message.id],
                    ...(h.messages[message.id].content !== message.content
                        ? { originalContent: h.messages[message.id].content }
                        : {}),
                    ...message
                };
                return h;
            });
        }
    }

    if ($chatId == chatId) {
        if (!$temporaryChatEnabled) {
            chat = await updateChatById(localStorage.token, chatId, {
                models: selectedModels,
                messages: messages,
                history: get(chatHistory),
                params: params,
                files: chatFiles
            });

            currentChatPage.set(1);
            await chats.set(await getChatList(localStorage.token, $currentChatPage));
        }
    }
};

export const getChatEventEmitter = (modelId: string, chatId: string = '') => {
    return setInterval(() => {
        $socket?.emit('usage', {
            action: 'chat',
            model: modelId,
            chat_id: chatId
        });
    }, 1000);
};

export const createMessagePair = async (userPrompt: string) => {
    prompt = '';
    if (selectedModels.length === 0) {
        toast.error($i18n.t('Model not selected'));
    } else {
        const modelId = selectedModels[0];
        const model = get(models).filter((m) => m.id === modelId).at(0);

        const messages = createMessagesList(get(chatHistory).currentId);
        const parentMessage = messages.length !== 0 ? messages.at(-1) : null;

        const userMessageId = uuidv4();
        const responseMessageId = uuidv4();

        const userMessage = {
            id: userMessageId,
            parentId: parentMessage ? parentMessage.id : null,
            childrenIds: [responseMessageId],
            role: 'user',
            content: userPrompt ? userPrompt : `[PROMPT] ${userMessageId}`,
            timestamp: Math.floor(Date.now() / 1000)
        };

        const responseMessage = {
            id: responseMessageId,
            parentId: userMessageId,
            childrenIds: [],
            role: 'assistant',
            content: `[RESPONSE] ${responseMessageId}`,
            done: true,

            model: modelId,
            modelName: model.name ?? model.id,
            modelIdx: 0,
            timestamp: Math.floor(Date.now() / 1000)
        };

        if (parentMessage) {
            parentMessage.childrenIds.push(userMessageId);
            chatHistory.update((h) => {
                h.messages[parentMessage.id] = parentMessage;
                return h;
            });
        }
        chatHistory.update((h) => {
            h.messages[userMessageId] = userMessage;
            h.messages[responseMessageId] = responseMessage;
            return h;
        });

        chatHistory.update((h) => {
            h.currentId = responseMessageId;
            return h;
        });

        await tick();

        if (autoScroll.get()) {
            scrollToBottom();
        }

        if (messages.length === 0) {
            await initChatHandler();
        } else {
            await saveChatHandler($chatId);
        }
    }
};

export const submitPrompt = async (prompt: string, options: SubmitPromptOptions = {}) => {
    if (!prompt) return;

    const currentHistory = get(chatHistory);
    const currentChatId = get(chatId);

    if (!currentChatId) {
        await initChatHandler();
    }

    const messageId = uuidv4();
    const responseMessageId = uuidv4();

    const newMessages = {
        ...currentHistory.messages,
        [messageId]: {
            id: messageId,
            role: 'user',
            content: prompt,
            done: true
        },
        [responseMessageId]: {
            id: responseMessageId,
            role: 'assistant',
            content: '',
            done: false
        }
    };

    chatHistory.set({
        ...currentHistory,
        messages: newMessages,
        currentId: responseMessageId
    });

    await tick();

    if (get(autoScroll)) {
        scrollToBottom();
    }

    // Rest of the function...
};

export const initChatHandler = async () => {
    const _chatId = uuidv4();
    await chatId.set(_chatId);

    let currentModels: string[] = selectedModels;

    const _selectedModels = currentModels.map((modelId) =>
        get(models).map((m) => m.id).includes(modelId) ? modelId : ''
    );

    if (JSON.stringify(currentModels) !== JSON.stringify(_selectedModels)) {
        selectedModels = _selectedModels;
    }

    if (currentModels.length === 0) {
        if (get(models).length > 0) {
            selectedModels = [get(models)[0].id];
        } else {
            selectedModels = [''];
        }
    }

    await showControls.set(false);
    await showCallOverlay.set(false);
    await showOverview.set(false);
    await showArtifacts.set(false);

    if (get(page).url.pathname.includes('/c/')) {
        await goto('/', { replaceState: true });
    }

    autoScroll.set(true);

    chatHistory.set({
        messages: {},
        currentId: null,
        rootId: null
    });

    chatFiles = [];
    params = {};

    if (get(page).url.searchParams.get('youtube')) {
        uploadYoutubeTranscription(
            `https://www.youtube.com/watch?v=${get(page).url.searchParams.get('youtube')}`
        );
    }
    if (get(page).url.searchParams.get('web-search') === 'true') {
        webSearchEnabled = true;
    }

    if (get(page).url.searchParams.get('tools')) {
        selectedToolIds = get(page).url.searchParams
            .get('tools')
            ?.split(',')
            .map((id) => id.trim())
            .filter((id) => id);
    } else if (get(page).url.searchParams.get('tool-ids')) {
        selectedToolIds = get(page).url.searchParams
            .get('tool-ids')
            ?.split(',')
            .map((id) => id.trim())
            .filter((id) => id);
    }

    if (get(page).url.searchParams.get('call') === 'true') {
        showCallOverlay.set(true);
        showControls.set(true);
    }

    if (get(page).url.searchParams.get('q')) {
        prompt = get(page).url.searchParams.get('q') ?? '';

        if (prompt) {
            await tick();
            submitPrompt(prompt);
        }
    }
};

export const stopResponse = () => {
    // TODO: Implement response stopping logic
    console.log('Stopping response');
    // You may want to add more specific logic here, such as:
    // - Cancelling an ongoing API request
    // - Clearing a stream
    // - Updating UI state to indicate response stopped
}

// Message handling functions
export const handleNewChat = async () => {
    await initNewChat();
};

export const handleMessage = async (message: any) => {
    const _chatId = JSON.parse(JSON.stringify(get(chatId)));
    let _messageId = JSON.parse(JSON.stringify(message.id));
    await showMessage(message);
};

export const handleSubmit = async (prompt: string, options = {}) => {
    await submitPrompt(prompt, options);
};

export const continueResponse = async () => {
    // Implementation
};

export const regenerateResponse = async () => {
    // Implementation
};

export const handleMessageActionWrapper = async (action: string, message: any) => {
    await handleMessageAction(action, message);
};
