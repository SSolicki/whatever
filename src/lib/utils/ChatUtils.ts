import { get } from 'svelte/store';
import { chatHistory as history, processingMessage, pendingMessages } from '$lib/stores/ChatStores';
import type { Message, MessageRole } from '$lib/types/chat';
import { marked } from 'marked';
import hljs from 'highlight.js';

/**
 * Scrolls the chat container to the bottom
 * @param node - The DOM node to scroll (typically the messages container)
 * @param smooth - Whether to use smooth scrolling (default: true)
 */
export const scrollToBottom = (node: HTMLElement | null | undefined, smooth = true) => {
    if (!node) return;
    
    node.scrollTo({
        top: node.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
    });
};

/**
 * Creates a list of messages from a specific message ID up to the root
 * @param messageId - The ID of the message to start from
 * @returns Array of message IDs from the specified message to the root
 */
export const createMessagesList = (messageId: string | null): string[] => {
    if (messageId === null) {
        return [];
    }

    const messages = get(history).messages;
    const messagesList: string[] = [];
    let currentId = messageId;

    while (currentId !== null && messages[currentId]) {
        messagesList.unshift(currentId);
        currentId = messages[currentId].parentId;
    }

    return messagesList;
};

/**
 * Formats a chat message for display
 * @param content - The raw message content
 * @returns Formatted message content with syntax highlighting
 */
export const formatMessage = (content: string): string => {
    const renderer = new marked.Renderer();
    
    // Override code block rendering to add syntax highlighting
    renderer.code = (code, language) => {
        const validLanguage = hljs.getLanguage(language || '') ? language : 'plaintext';
        const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;
        return `<pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>`;
    };

    marked.setOptions({
        renderer,
        highlight: (code, lang) => {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        breaks: true
    });

    return marked(content);
};

/**
 * Checks if a message is currently being processed
 * @param messageId - The ID of the message to check
 * @returns Boolean indicating if the message is being processed
 */
export const isMessageProcessing = (messageId: string): boolean => {
    return get(processingMessage) === messageId || get(pendingMessages).has(messageId);
};

/**
 * Gets the role of a message (user, assistant, or system)
 * @param messageId - The ID of the message
 * @returns The role of the message
 */
export const getMessageRole = (messageId: string): MessageRole => {
    const messages = get(history).messages;
    return messages[messageId]?.role || 'user';
};

/**
 * Extracts code blocks from a message
 * @param content - The message content
 * @returns Array of code blocks with their language
 */
export const extractCodeBlocks = (content: string): Array<{ language: string; code: string }> => {
    const codeBlocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        codeBlocks.push({
            language: match[1] || 'plaintext',
            code: match[2].trim()
        });
    }

    return codeBlocks;
};

/**
 * Validates a chat message
 * @param content - The message content
 * @returns Boolean indicating if the message is valid
 */
export const isValidMessage = (content: string): boolean => {
    return content.trim().length > 0;
};
