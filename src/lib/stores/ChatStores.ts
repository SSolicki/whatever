import { APP_NAME } from '$lib/constants';
import { type Writable, writable, type Readable, derived } from 'svelte/store';
import type { GlobalModelConfig, ModelConfig } from '$lib/apis';
import type { 
	Banner,
	Config, 
	SessionUser, 
	Settings, 
	Prompt, 
	Document 
} from '$lib/types';
import type { Socket } from 'socket.io-client';

// Types
interface ChatHistory {
    messages: Record<string, Message>;
    currentId: string | null;
    rootId: string | null;
}

interface ControlPaneState {
    size: number | null;
    isReady: boolean;
    minSize: number;
    isDragging: boolean;
}

// Core stores with error handling wrapper
const createSafeStore = <T>(initialValue: T, name: string): Writable<T> => {
    const store = writable<T>(initialValue);
    const { set: originalSet, update: originalUpdate, subscribe } = store;

    return {
        set: (value: T) => {
            try {
                originalSet(value);
            } catch (error) {
                console.error(`Error setting ${name} store:`, error);
                throw error;
            }
        },
        update: (fn: (value: T) => T) => {
            try {
                originalUpdate(fn);
            } catch (error) {
                console.error(`Error updating ${name} store:`, error);
                throw error;
            }
        },
        subscribe
    };
};

// Core stores
export const WEBUI_NAME = 'Windsurf';
export const user = createSafeStore<SessionUser | null>(null, 'user');
export const socket = createSafeStore<Socket | null>(null, 'socket');
export const config = createSafeStore<Config | null>(null, 'config');
export const settings = createSafeStore<Settings | null>(null, 'settings');
export const banners = createSafeStore<Banner[]>([], 'banners');
export const tools = createSafeStore<null | any[]>(null, 'tools');

// Chat-specific stores
export const chatId = createSafeStore<string>('', 'chatId');
export const chatTitle = createSafeStore<string>('', 'chatTitle');
export const chatHistory = createSafeStore<ChatHistory>({
    messages: {},
    currentId: null,
    rootId: null
}, 'chatHistory');

// UI state stores
export const showSidebar = createSafeStore<boolean>(false, 'showSidebar');
export const showControls = createSafeStore<boolean>(false, 'showControls');
export const showCallOverlay = createSafeStore<boolean>(false, 'showCallOverlay');
export const showOverview = createSafeStore<boolean>(false, 'showOverview');
export const showArtifacts = createSafeStore<boolean>(false, 'showArtifacts');
export const currentChatPage = createSafeStore<number>(1, 'currentChatPage');
export const temporaryChatEnabled = createSafeStore<boolean>(false, 'temporaryChatEnabled');

// Control pane stores
export const controlPaneSize = createSafeStore<number | null>(null, 'controlPaneSize');
export const controlPaneReady = createSafeStore<boolean>(false, 'controlPaneReady');
export const controlPaneMinSize = createSafeStore<number>(25, 'controlPaneMinSize');
export const isDragging = createSafeStore<boolean>(false, 'isDragging');
export const isLargeScreen = createSafeStore<boolean>(false, 'isLargeScreen');

// Message processing stores
export const messageQueue = createSafeStore<string[]>([], 'messageQueue');
export const pendingMessages = createSafeStore<Set<string>>(new Set(), 'pendingMessages');
export const processingMessage = createSafeStore<boolean>(false, 'processingMessage');
export const autoScroll = createSafeStore<boolean>(true, 'autoScroll');

// Mobile state
export const mobile = createSafeStore<boolean>(false, 'mobile');

// Derived stores
export const hasMessages: Readable<boolean> = derived(
    chatHistory,
    $history => Object.keys($history.messages).length > 0
);

export const controlPaneState: Readable<ControlPaneState> = derived(
    [controlPaneSize, controlPaneReady, controlPaneMinSize, isDragging],
    ([$size, $ready, $minSize, $dragging]) => ({
        size: $size,
        isReady: $ready,
        minSize: $minSize,
        isDragging: $dragging
    })
);

export const pendingMessageCount: Readable<number> = derived(
    [messageQueue, pendingMessages],
    ([$queue, $pending]) => $queue.length + $pending.size
);

export const isProcessing: Readable<boolean> = derived(
    processingMessage,
    $processing => $processing
);

// Cleanup function type
export type StoreCleanupFunction = () => void;

// Store cleanup registry
const cleanupFunctions: Set<StoreCleanupFunction> = new Set();

// Register cleanup function
export const registerCleanup = (cleanup: StoreCleanupFunction): void => {
    cleanupFunctions.add(cleanup);
};

// Cleanup all stores
export const cleanupAllStores = (): void => {
    cleanupFunctions.forEach(cleanup => cleanup());
    cleanupFunctions.clear();
};
