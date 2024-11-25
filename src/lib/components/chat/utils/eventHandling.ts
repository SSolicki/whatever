import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { chatId, chats } from '$lib/stores';
import type { History } from '$lib/types';
import { deleteTagById, addTagById, deleteTagsById } from '$lib/apis';
import { toast } from 'svelte-sonner';

export const handleModelSelect = async (
    event: CustomEvent,
    selectedModels: string[],
    setSelectedModels: (models: string[]) => void,
    saveSessionSelectedModels: () => void,
    setToolIds: (modelId: string) => Promise<void>
): Promise<void> => {
    const modelId = event.detail;
    const index = event.detail.index ?? 0;

    selectedModels[index] = modelId;
    setSelectedModels([...selectedModels]);

    saveSessionSelectedModels();
    await setToolIds(modelId);
};

export const handleModelAdd = (
    selectedModels: string[],
    setSelectedModels: (models: string[]) => void
): void => {
    setSelectedModels([...selectedModels, '']);
};

export const handleModelRemove = (
    index: number,
    selectedModels: string[],
    setSelectedModels: (models: string[]) => void,
    saveSessionSelectedModels: () => void
): void => {
    setSelectedModels(selectedModels.filter((_, i) => i !== index));
    saveSessionSelectedModels();
};

export const handleToolSelect = (
    event: CustomEvent,
    selectedToolIds: string[],
    setSelectedToolIds: (toolIds: string[]) => void
): void => {
    const toolId = event.detail;
    if (selectedToolIds.includes(toolId)) {
        setSelectedToolIds(selectedToolIds.filter((id) => id !== toolId));
    } else {
        setSelectedToolIds([...selectedToolIds, toolId]);
    }
};

export const handleWebSearchToggle = (
    webSearchEnabled: boolean,
    setWebSearchEnabled: (enabled: boolean) => void
): void => {
    setWebSearchEnabled(!webSearchEnabled);
};

export const handleChatDelete = async (): Promise<void> => {
    const currentChatId = get(chatId);
    if (!currentChatId) return;

    const res = await fetch(`/api/chats/${currentChatId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${localStorage.token}`
        }
    });

    if (res.ok) {
        chats.update((chats) => chats.filter((chat) => chat.id !== currentChatId));
        chatId.set('');
        goto('/');
    }
};

export const handleChatClear = async (
    setHistory: (history: History) => void,
    setChatFiles: (files: any[]) => void,
    setParams: (params: any) => void
): Promise<void> => {
    setHistory({
        messages: {},
        currentId: null
    });

    setChatFiles([]);
    setParams({});

    if (get(chatId)) {
        await handleChatDelete();
    }
};

export const handleTagAdd = async (
    event: CustomEvent,
    tags: string[],
    setTags: (tags: string[]) => void
): Promise<void> => {
    const currentChatId = get(chatId);
    if (!currentChatId) return;

    const tag = event.detail;
    const res = await addTagById(localStorage.token, currentChatId, tag);
    if (res) {
        setTags(res);
    }
};

export const handleTagDelete = async (
    event: CustomEvent,
    tags: string[],
    setTags: (tags: string[]) => void
): Promise<void> => {
    const currentChatId = get(chatId);
    if (!currentChatId) return;

    const tag = event.detail;
    const res = await deleteTagById(localStorage.token, currentChatId, tag);
    if (res) {
        setTags(res);
    }
};

export const handleTagsDelete = async (
    tags: string[],
    setTags: (tags: string[]) => void
): Promise<void> => {
    const currentChatId = get(chatId);
    if (!currentChatId) return;

    const res = await deleteTagsById(localStorage.token, currentChatId);
    if (res) {
        setTags(res);
    }
};

export const handleScroll = (
    event: Event,
    messagesContainerElement: HTMLElement | null,
    setAutoScroll: (autoScroll: boolean) => void
): void => {
    if (!messagesContainerElement) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerElement;
    setAutoScroll(Math.abs(scrollHeight - clientHeight - scrollTop) < 10);
};

export const handleKeyDown = (
    event: KeyboardEvent,
    setStopResponseFlag: (flag: boolean) => void
): void => {
    if (event.key === 'Escape') {
        setStopResponseFlag(true);
    }
};

export const handleResize = (
    controlPane: HTMLElement | null,
    controlPaneComponent: any
): void => {
    if (controlPane && controlPaneComponent) {
        controlPaneComponent.setSize(controlPane.clientWidth);
    }
};
