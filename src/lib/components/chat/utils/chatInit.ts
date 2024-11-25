import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { chatId, chatTitle, config, models, tools } from '$lib/stores';
import type { Chat, History } from '$lib/types';
import { createNewChat, getChatById, getTagsById, getTools } from '$lib/apis';
import { toast } from 'svelte-sonner';

export const loadChat = async (chatIdProp: string, setHistory: (history: History) => void, setTags: (tags: string[]) => void, setSelectedModels: (models: string[]) => void): Promise<boolean> => {
    if (!chatIdProp) return false;

    try {
        const res = await getChatById(localStorage.token, chatIdProp);
        if (!res) {
            toast.error('Chat not found');
            return false;
        }

        setTags(await getTagsById(localStorage.token, chatIdProp));
        setHistory(convertMessagesToHistory(res.messages));
        setSelectedModels(res.models);

        await setToolIds(res.models[0]);
        await chatId.set(chatIdProp);
        await chatTitle.set(res.title);

        return true;
    } catch (e) {
        console.error('Error loading chat:', e);
        toast.error('Error loading chat');
        return false;
    }
};

export const initNewChat = async (
    page: any,
    setSelectedModels: (models: string[]) => void,
    setHistory: (history: History) => void,
    setWebSearchEnabled: (enabled: boolean) => void,
    setSelectedToolIds: (toolIds: string[]) => void,
    showCallOverlay: { set: (value: boolean) => void }
): Promise<void> => {
    let selectedModels: string[] = [];

    // Load models from various sources in order of priority
    if (browser && sessionStorage.selectedModels) {
        selectedModels = JSON.parse(sessionStorage.selectedModels);
        sessionStorage.removeItem('selectedModels');
    } else if (page.url.searchParams.get('models')) {
        selectedModels = page.url.searchParams.get('models')?.split(',') || [];
    } else if (page.url.searchParams.get('model')) {
        selectedModels = page.url.searchParams.get('model')?.split(',') || [];
    } else if (get(config)?.default_models) {
        selectedModels = get(config)?.default_models.split(',') || [];
    }

    // Filter and validate models
    selectedModels = selectedModels.filter((modelId) => get(models).map((m) => m.id).includes(modelId));
    if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === '')) {
        if (get(models).length > 0) {
            selectedModels = [get(models)[0].id];
        } else {
            selectedModels = [''];
        }
    }

    setSelectedModels(selectedModels);

    // Reset UI state
    showCallOverlay.set(false);
    if (page.url.pathname.includes('/c/')) {
        window.history.replaceState(history.state, '', `/`);
    }

    // Reset chat state
    await chatId.set('');
    await chatTitle.set('');
    setHistory({
        messages: {},
        currentId: null
    });

    // Handle URL parameters
    if (page.url.searchParams.get('web-search') === 'true') {
        setWebSearchEnabled(true);
    }

    if (page.url.searchParams.get('tools') || page.url.searchParams.get('tool-ids')) {
        const toolIds = (page.url.searchParams.get('tools') || page.url.searchParams.get('tool-ids'))
            ?.split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id);
        setSelectedToolIds(toolIds);
    }

    if (page.url.searchParams.get('call') === 'true') {
        showCallOverlay.set(true);
    }
};

export const setToolIds = async (modelId: string): Promise<void> => {
    if (!get(tools)) {
        tools.set(await getTools(localStorage.token));
    }

    const model = get(models).find((m) => m.id === modelId);
    if (model) {
        return (model?.info?.meta?.toolIds ?? []).filter((id) => get(tools).find((t) => t.id === id));
    }
    return [];
};

export const convertMessagesToHistory = (messages: any[]): History => {
    const history: History = {
        messages: {},
        currentId: null
    };

    messages.forEach((message) => {
        history.messages[message.id] = {
            ...message,
            childrenIds: message.children?.map((child: any) => child.id) || []
        };
    });

    // Find the last message
    let lastMessage = messages[messages.length - 1];
    while (lastMessage?.children?.length > 0) {
        lastMessage = lastMessage.children[lastMessage.children.length - 1];
    }

    history.currentId = lastMessage?.id || null;
    return history;
};
