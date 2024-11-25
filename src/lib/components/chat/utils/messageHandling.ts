import { v4 as uuidv4 } from 'uuid';
import type { History, Message } from '$lib/types';
import { copyToClipboard } from '$lib/utils';
import { toast } from 'svelte-sonner';

export const createMessagesList = (history: History): Message[] => {
    const messages = [];
    let currentId = history.currentId;

    while (currentId) {
        const message = history.messages[currentId];
        if (!message) break;

        messages.unshift(message);
        currentId = message.parentId;
    }

    return messages;
};

export const handleMessageContent = (content: string): any => {
    if (!content) return '';
    
    // Handle code execution results
    if (content.startsWith('```json')) {
        try {
            const json = JSON.parse(content.replace('```json', '').replace('```', '').trim());
            if (json.type === 'code_execution') {
                return json;
            }
        } catch (e) {
            console.error('Error parsing code execution result:', e);
        }
    }
    return content;
};

export const submitPrompt = async (
    prompt: string,
    history: History,
    parentId: string | null = null,
    toolIds: string[] = [],
    files: any[] = [],
    params: any = {},
    webEnabled: boolean = false
): Promise<{ messageId: string; assistantMessageId: string }> => {
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    const message = {
        id: messageId,
        parentId,
        childrenIds: [],
        role: 'user',
        content: prompt,
        timestamp,
        files,
        toolIds,
        params,
        webEnabled
    };

    if (parentId) {
        history.messages[parentId].childrenIds.push(messageId);
    }

    history.messages[messageId] = message;
    history.currentId = messageId;

    const assistantMessageId = uuidv4();
    const assistantMessage = {
        id: assistantMessageId,
        parentId: messageId,
        childrenIds: [],
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        status: 'thinking',
        files: [],
        toolIds: [],
        params: {},
        webEnabled: false
    };

    history.messages[messageId].childrenIds.push(assistantMessageId);
    history.messages[assistantMessageId] = assistantMessage;

    return { messageId, assistantMessageId };
};

export const handleMessageDelete = async (messageId: string, history: History): Promise<void> => {
    const message = history.messages[messageId];
    if (!message) return;

    const messageIds = [message.id];
    let currentId = message.id;

    while (history.messages[currentId]?.childrenIds.length > 0) {
        currentId = history.messages[currentId].childrenIds[0];
        messageIds.push(currentId);
    }

    messageIds.forEach((id) => {
        delete history.messages[id];
    });

    if (message.parentId) {
        const parentMessage = history.messages[message.parentId];
        if (parentMessage) {
            parentMessage.childrenIds = parentMessage.childrenIds.filter((id) => id !== message.id);
            history.currentId = message.parentId;
        }
    } else {
        history.currentId = null;
    }
};

export const handleMessageCopy = async (messageId: string, history: History): Promise<void> => {
    const message = history.messages[messageId];
    if (!message) return;

    await copyToClipboard(message.content);
    toast.success('Copied to clipboard');
};

export const handleMessageEvent = (event: any, history: History): void => {
    console.log('handleMessageEvent', event);

    if (event.type === 'error') {
        toast.error(event.error);
        return;
    }

    if (event.type === 'done') {
        const message = history.messages[event.messageId];
        if (message) {
            message.status = 'done';
            message.endTimestamp = new Date().toISOString();
        }
        return;
    }

    if (event.type === 'stream') {
        const message = history.messages[event.messageId];
        if (message) {
            message.content = event.content;
            message.status = 'streaming';
        }
        return;
    }

    if (event.type === 'thinking') {
        const message = history.messages[event.messageId];
        if (message) {
            message.status = 'thinking';
        }
        return;
    }

    if (event.type === 'function') {
        const message = history.messages[event.messageId];
        if (message) {
            message.status = 'function';
            message.functionCall = event.functionCall;
        }
        return;
    }
};
