import { get } from 'svelte/store';
import { models } from '$lib/stores';
import type { History, Message } from '$lib/types';
import { toast } from 'svelte-sonner';
import { createNewChat, generateTitle } from '$lib/apis';

export const sendPromptOllama = async (
    prompt: string,
    messageId: string,
    assistantMessageId: string,
    selectedModels: string[],
    messages: Message[],
    handleMessageEvent: (event: any) => void
): Promise<void> => {
    const model = get(models).find((m) => m.id === selectedModels[0]);
    if (!model) {
        toast.error('Model not found');
        return;
    }

    const res = await fetch(`${get(config).ollama_api_base_url}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model.id,
            messages,
            stream: true
        })
    });

    if (!res.ok) {
        toast.error('Error sending prompt to Ollama');
        return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line) continue;

                try {
                    const json = JSON.parse(line);
                    if (json.done) {
                        handleMessageEvent({
                            type: 'done',
                            messageId: assistantMessageId
                        });
                    } else {
                        handleMessageEvent({
                            type: 'stream',
                            messageId: assistantMessageId,
                            content: (history.messages[assistantMessageId]?.content || '') + (json.message?.content || '')
                        });
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }
    } catch (e) {
        console.error('Error reading stream:', e);
        toast.error('Error reading stream from Ollama');
    }
};

export const sendPromptOpenAI = async (
    prompt: string,
    messageId: string,
    assistantMessageId: string,
    selectedModels: string[],
    messages: Message[],
    toolIds: string[] = [],
    files: any[] = [],
    params: any = {},
    webEnabled: boolean = false,
    handleMessageEvent: (event: any) => void
): Promise<void> => {
    const model = get(models).find((m) => m.id === selectedModels[0]);
    if (!model) {
        toast.error('Model not found');
        return;
    }

    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.token}`
        },
        body: JSON.stringify({
            model: model.id,
            messages,
            stream: true,
            toolIds,
            files,
            params,
            webEnabled
        })
    });

    if (!res.ok) {
        toast.error('Error sending prompt to OpenAI');
        return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line) continue;

                try {
                    const json = JSON.parse(line);
                    handleMessageEvent({
                        ...json,
                        messageId: assistantMessageId
                    });
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }
    } catch (e) {
        console.error('Error reading stream:', e);
        toast.error('Error reading stream from OpenAI');
    }
};

export const generateChatTitle = async (history: History, selectedModels: string[]): Promise<string | undefined> => {
    const messages = createMessagesList(history);
    if (messages.length === 0) return;

    const model = get(models).find((m) => m.id === selectedModels[0]);
    if (!model) return;

    const res = await generateTitle(localStorage.token, model.id, messages);
    return res;
};

export const saveChatHandler = async (chatId: string, history: History, title: string, selectedModels: string[]): Promise<void> => {
    if (!chatId) return;

    const messages = createMessagesList(history);
    if (messages.length === 0) return;

    try {
        await updateChatById(localStorage.token, chatId, {
            messages,
            title,
            models: selectedModels
        });
    } catch (error) {
        console.error('Error saving chat:', error);
        toast.error('Error saving chat');
    }
};
