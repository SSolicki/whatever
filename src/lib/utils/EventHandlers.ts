import { tick } from 'svelte';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import type { Socket } from 'socket.io-client';
import { toast } from 'svelte-sonner';
import { debounce } from 'lodash-es';
import { onDestroy } from 'svelte';

import { 
    chatId, 
    mobile, 
    isLargeScreen,
    showControls,
    showCallOverlay,
    showOverview,
    showArtifacts,
    controlPaneSize,
    controlPaneReady,
    controlPaneMinSize,
    chatHistory as history,
    settings,
    showSidebar
} from '$lib/stores/ChatStores';

interface MessageEvent {
    type: string;
    text?: string;
    data?: any;
}

interface ChatEvent {
    type: string;
    chatId: string;
    data?: any;
}

interface MessageAction {
    type: 'edit' | 'delete' | 'regenerate' | 'continue';
    messageId: string;
    content?: string;
}

/**
 * Handles chat-related socket events
 * @param event - The socket event data
 */
export const chatEventHandler = async (event, cb) => {
    if (event.chat_id === get(chatId)) {
        await tick();
        console.log(event);
        let message = get(history).messages[event.message_id];

        const type = event?.data?.type ?? null;
        const data = event?.data?.data ?? null;

        if (type === 'status') {
            if (message?.statusHistory) {
                message.statusHistory.push(data);
            } else {
                message.statusHistory = [data];
            }
        } else if (type === 'source' || type === 'citation') {
            if (data?.type === 'code_execution') {
                if (!message?.code_executions) {
                    message.code_executions = [];
                }

                const existingCodeExecutionIndex = message.code_executions.findIndex(
                    (execution) => execution.id === data.id
                );

                if (existingCodeExecutionIndex !== -1) {
                    message.code_executions[existingCodeExecutionIndex] = data;
                } else {
                    message.code_executions.push(data);
                }

                message.code_executions = message.code_executions;
            } else {
                if (message?.sources) {
                    message.sources.push(data);
                } else {
                    message.sources = [data];
                }
            }
        } else if (type === 'message') {
            message.content += data.content;
        } else if (type === 'replace') {
            message.content = data.content;
        } else if (type === 'action') {
            if (data.action === 'continue') {
                const continueButton = document.getElementById('continue-response-button');
                if (continueButton) {
                    continueButton.click();
                }
            }
        } else if (type === 'confirmation') {
            eventCallback = cb;
            showEventConfirmation = true;
            eventConfirmationTitle = data.title;
            eventConfirmationMessage = data.message;
            eventConfirmationInput = false;
        } else if (type === 'input') {
            eventCallback = cb;
            showEventConfirmation = true;
            eventConfirmationTitle = data.title;
            eventConfirmationMessage = data.message;
            eventConfirmationInput = true;
            eventConfirmationInputPlaceholder = data.placeholder;
            eventConfirmationInputValue = data?.value ?? '';
        }

        history.update(h => {
            h.messages[event.message_id] = message;
            return h;
        });
    }
};

/**
 * Handles window message events for chat interactions
 * @param event - The message event
 * @param submitPrompt - Function to submit the prompt
 * @param prompt - Reference to the prompt variable
 */
export const onMessageHandler = async (
    event: { origin: string; data: MessageEvent },
    submitPrompt: (prompt: string) => Promise<void>,
    prompt: { value: string }
) => {
    if (event.origin !== window.location.origin) {
        return;
    }

    switch (event.data.type) {
        case 'SEND_MESSAGE':
            if (event.data.text) {
                prompt.value = event.data.text;
                await submitPrompt(event.data.text);
            }
            break;
        default:
            break;
    }
};

/**
 * Handles control panel visibility changes
 * @param value - Whether controls should be shown
 * @param controlPane - Reference to the control pane
 * @param controlPaneComponent - Reference to the control pane component
 */
export const handleControlsVisibility = (
    value: boolean,
    controlPane: HTMLElement,
    controlPaneComponent: any
) => {
    if (!controlPane) return;

    if (value) {
        controlPane.style.transform = 'translateX(0)';
        controlPane.style.visibility = 'visible';
        if (controlPaneComponent) {
            controlPaneComponent.show();
        }
    } else {
        controlPane.style.transform = 'translateX(100%)';
        setTimeout(() => {
            controlPane.style.visibility = 'hidden';
            if (controlPaneComponent) {
                controlPaneComponent.hide();
            }
        }, 300);
    }
};

/**
 * Handles media query changes
 * @param e - The media query event
 */
export const handleMediaQuery = async (e) => {
    if (e.matches) {
        isLargeScreen.set(true);
        mobile.set(false);

        if (get(showCallOverlay)) {
            showCallOverlay.set(false);
            await tick();
            showCallOverlay.set(true);
        }
    } else {
        isLargeScreen.set(false);
        mobile.set(true);

        if (get(showCallOverlay)) {
            showCallOverlay.set(false);
            await tick();
            showCallOverlay.set(true);
        }
    }
};

export const handlePaneResize = (pane, size: number) => {
    if (!get(controlPaneReady) || !pane?.isExpanded) {
        return;
    }

    const minSize = get(controlPaneMinSize);
    if (get(showControls) && pane.isExpanded()) {
        if (size < minSize) {
            pane.resize(minSize);
            controlPaneSize.set(pane.getSize());
        }
        localStorage.chatControlsSize = size < minSize ? 0 : size;
    }
};

export const handlePaneCollapse = () => {
    showControls.set(false);
    controlPaneSize.set(null);
};

export const initializePane = (pane) => {
    if (!pane) {
        controlPaneReady.set(false);
        return;
    }

    controlPaneReady.set(true);
    const storedSize = parseInt(localStorage?.chatControlsSize);
    const minSize = get(controlPaneMinSize);

    if (storedSize) {
        pane.resize(storedSize);
        controlPaneSize.set(pane.getSize());
    } else if (minSize) {
        pane.resize(minSize);
        controlPaneSize.set(minSize);
    }
};

export const cleanupPane = () => {
    controlPaneReady.set(false);
    controlPaneSize.set(null);
};

export const handleMessageAction = async (action: MessageAction, socket: Socket | null) => {
    if (!socket) {
        toast.error('No socket connection available');
        return;
    }

    const currentChatId = get(chatId);
    
    switch (action.type) {
        case 'edit':
            if (!action.content) {
                toast.error('No content provided for edit');
                return;
            }
            socket.emit('edit_message', {
                chat_id: currentChatId,
                message_id: action.messageId,
                content: action.content
            });
            break;
            
        case 'delete':
            socket.emit('delete_message', {
                chat_id: currentChatId,
                message_id: action.messageId
            });
            break;
            
        case 'regenerate':
            socket.emit('regenerate_message', {
                chat_id: currentChatId,
                message_id: action.messageId
            });
            break;
            
        case 'continue':
            socket.emit('continue_message', {
                chat_id: currentChatId,
                message_id: action.messageId
            });
            break;
            
        default:
            console.error('Unknown message action:', action.type);
            toast.error(`Unknown action: ${action.type}`);
    }
};

export const handleMouseDown = (event: MouseEvent, element: HTMLElement) => {
    const startX = event.clientX;
    const startWidth = element.offsetWidth;
    
    const onMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - startX;
        const newWidth = Math.max(startWidth + delta, get(controlPaneMinSize));
        controlPaneSize.set(newWidth);
    };
    
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};

export const debouncedResizeHandler = debounce((e: UIEvent) => {
    const width = window.innerWidth;
    isLargeScreen.set(width >= 1024);
    mobile.set(width < 768);
}, 100);

// Focus management for accessibility
export const manageFocus = (element: HTMLElement) => {
    const focusable = element.querySelector('button, input, [tabindex]');
    if (focusable) (focusable as HTMLElement).focus();
};

// Touch interaction handlers
let touchStartX = 0;

export const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
};

export const handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX - touchEndX;
    
    // Swipe left to close sidebar
    if (swipeDistance > 100) {
        showSidebar.set(false);
    }
    // Swipe right to open sidebar
    else if (swipeDistance < -100) {
        showSidebar.set(true);
    }
};

/**
 * Sets up event listeners for the chat component
 * @param socket - The socket.io connection
 * @returns Cleanup function for event listeners
 */
export const setupEventListeners = (socket: Socket | null): (() => void) => {
    const cleanupFunctions: (() => void)[] = [];
    
    if (socket) {
        const messageHandler = (event: any) => onMessageHandler(event, async (prompt) => {
            // Implementation depends on your prompt handling logic
            console.log('Handling prompt:', prompt);
        }, { value: '' });
        
        socket.on('message', messageHandler);
        cleanupFunctions.push(() => socket.off('message', messageHandler));
    }
    
    // Add resize listener
    window.addEventListener('resize', debouncedResizeHandler);
    cleanupFunctions.push(() => {
        window.removeEventListener('resize', debouncedResizeHandler);
        debouncedResizeHandler.cancel(); // Cancel any pending debounced calls
    });
    
    // Return cleanup function that removes all event listeners
    return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
};
