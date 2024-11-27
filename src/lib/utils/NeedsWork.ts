import { v4 as uuidv4 } from 'uuid';
import { tick } from 'svelte';
import { chatHistory as history, isDragging, showCallOverlay } from '$lib/stores/ChatStores';
import { toast } from 'svelte-sonner';
import { scrollToBottom, isValidMessage, createMessagesList } from '$lib/utils/ChatUtils';

let messagesContainerElement: HTMLElement;
let eventTarget: EventTarget | null = null;
let $isDragging = false;

const showMessage = async (messageId: string) => {
    try {
        if (!messageId) {
            throw new Error('Message ID is required');
        }
        if (!history.messages[messageId]) {
            throw new Error('Message not found');
        }
        
        const messagesList = createMessagesList(messageId);
        if (!messagesList.length) {
            throw new Error('Failed to create messages list');
        }

        // Update history to show this message and its ancestors
        history.update(h => {
            h.currentId = messageId;
            return h;
        });

        await tick();
        scrollToBottom(messagesContainerElement);
    } catch (error) {
        console.error('Show message error:', error);
        toast.error($i18n.t('Failed to display message'));
    }
};

const submitMessage = async (parentId: string | null = null, content: string) => {
    try {
        if (!content) {
            throw new Error('Message content is required');
        }
        if (!isValidMessage(content)) {
            throw new Error('Invalid message content');
        }
        if (parentId && !history.messages[parentId]) {
            throw new Error('Parent message not found');
        }

        const messageId = uuidv4();
        const timestamp = new Date().toISOString();

        // Create new message
        const newMessage = {
            id: messageId,
            parentId,
            role: 'user',
            content,
            timestamp,
            done: true
        };

        // Update history with new message
        history.update(h => {
            h.messages[messageId] = newMessage;
            h.currentId = messageId;
            return h;
        });

        // Process message
        await handleMessageSubmit(messageId, content);
    } catch (error) {
        console.error('Submit message error:', error);
        toast.error($i18n.t('Failed to submit message'));
        // Clean up any partial state if needed
        if (error.messageId) {
            history.update(h => {
                delete h.messages[error.messageId];
                return h;
            });
        }
    }
};

const mergeResponses = async (messageId: string) => {
    try {
        if (!messageId) {
            throw new Error('Message ID is required');
        }
        if (!history.messages[messageId]) {
            throw new Error('Message not found');
        }

        const message = history.messages[messageId];
        if (message.role !== 'assistant') {
            throw new Error('Can only merge assistant responses');
        }
        if (!message.parentId) {
            throw new Error('Message has no parent to merge with');
        }

        const parentMessage = history.messages[message.parentId];
        if (!parentMessage) {
            throw new Error('Parent message not found');
        }
        if (parentMessage.role !== 'assistant') {
            throw new Error('Parent must be an assistant response');
        }

        // Merge current message content with parent
        const mergedContent = parentMessage.content + '\n\n' + message.content;

        // Update parent message
        history.update(h => {
            h.messages[parentMessage.id].content = mergedContent;
            h.messages[parentMessage.id].done = true;

            // Remove the merged message
            delete h.messages[messageId];
            h.currentId = parentMessage.id;

            return h;
        });

        await tick();
        scrollToBottom(messagesContainerElement);
    } catch (error) {
        console.error('Merge responses error:', error);
        toast.error($i18n.t('Failed to merge responses'));
    }
};

const handleNewChat = async () => {
    const success = await initNewChat();
    if (success) {
        // Reset local component state
        files = [];
        prompt = '';
        
        await tick();
        
        // Focus chat input
        const chatInput = document.getElementById('chat-input');
        chatInput?.focus();
    }
};

const handleMediaQuery = async (e) => {
    if (e.matches) {
        $isLargeScreen = true;

        if ($showCallOverlay) {
            showCallOverlay.set(false);
            await tick();
            showCallOverlay.set(true);
        }
    } else {
        $isLargeScreen = false;

        if ($showCallOverlay) {
            showCallOverlay.set(false);
            await tick();
            showCallOverlay.set(true);
        }
        controlPane = null;
        cleanupPane();
    }
};

const onMouseDown = (event) => {
    $isDragging = true;
};

const onMouseUp = (event) => {
    $isDragging = false;
};

const handleMessageActionWrapper = async (action: string, messageId: string, content?: string) => {
    await handleMessageAction({ 
        type: action as any, 
        messageId, 
        content 
    }, $socket);
};

const handleMessage = async (event: CustomEvent) => {
    try {
        const message = event.detail;
        await chatEventHandler({ type: 'message', data: message });
    } catch (error) {
        console.error('Message handling error:', error);
        toast.error($i18n.t('Failed to process message'));
    }
};

const handleSubmit = async (event: CustomEvent<{ prompt: string; files: File[] }>) => {
    try {
        const { prompt, files } = event.detail;
        if (!isValidMessage(prompt)) {
            toast.error($i18n.t('Invalid message content'));
            return;
        }
        await chatEventHandler({ type: 'submit', text: prompt, data: files });
    } catch (error) {
        console.error('Submit error:', error);
        toast.error($i18n.t('Failed to submit message'));
    }
};

const handleFileUpload = async (event: CustomEvent<File[]>) => {
    try {
        const files = event.detail;
        uploading = true;
        await chatEventHandler({ type: 'fileUpload', data: files });
        toast.success($i18n.t('File uploaded successfully'));
    } catch (error) {
        console.error('File upload error:', error);
        toast.error($i18n.t('Failed to upload file'));
    } finally {
        uploading = false;
    }
};

const handleUrlProcess = async (event: CustomEvent<string>) => {
    try {
        const url = event.detail;
        if (!url) {
            toast.error($i18n.t('Invalid URL'));
            return;
        }
        await chatEventHandler({ type: 'urlProcess', data: url });
    } catch (error) {
        console.error('URL processing error:', error);
        toast.error($i18n.t('Failed to process URL'));
    }
};

const handleYoutubeUpload = async () => {
    if (!youtubeUrl) {
        toast.error($i18n.t('Invalid YouTube URL'));
        return;
    }
    uploading = true;
    try {
        const result = await uploadYoutubeTranscription(youtubeUrl);
        if (result.success) {
            toast.success($i18n.t('YouTube video processed successfully'));
            youtubeUrl = '';
        } else {
            throw new Error('Failed to process YouTube video');
        }
    } catch (error) {
        console.error('YouTube upload error:', error);
        toast.error($i18n.t('Failed to process YouTube video'));
    } finally {
        uploading = false;
    }
};

const handleWebUpload = async () => {
    if (!webUrl) {
        toast.error($i18n.t('Invalid web URL'));
        return;
    }
    uploading = true;
    try {
        const result = await uploadWeb(webUrl);
        if (result.success) {
            toast.success($i18n.t('Web content processed successfully'));
            webUrl = '';
        } else {
            throw new Error('Failed to process web content');
        }
    } catch (error) {
        console.error('Web upload error:', error);
        toast.error($i18n.t('Failed to process web content'));
    } finally {
        uploading = false;
    }
};

const continueResponse = async (messageId: string) => {
    try {
        if (!messageId || !history.messages[messageId]) {
            throw new Error('Invalid message ID');
        }
        await submitMessage(messageId, 'continue');
    } catch (error) {
        console.error('Continue response error:', error);
        toast.error($i18n.t('Failed to continue response'));
    }
};

const regenerateResponse = async (messageId: string) => {
    try {
        if (!messageId || !history.messages[messageId]) {
            throw new Error('Invalid message ID');
        }
        await submitMessage(messageId, 'regenerate');
    } catch (error) {
        console.error('Regenerate response error:', error);
        toast.error($i18n.t('Failed to regenerate response'));
    }
};

export { 
    showMessage, 
    submitMessage, 
    mergeResponses, 
    handleNewChat, 
    handleMediaQuery, 
    onMouseDown, 
    onMouseUp, 
    handleMessageActionWrapper, 
    handleMessage, 
    handleSubmit, 
    handleFileUpload, 
    handleUrlProcess, 
    handleYoutubeUpload, 
    handleWebUpload,
    eventTarget,
    continueResponse,
    regenerateResponse,
    sendPrompt
};
