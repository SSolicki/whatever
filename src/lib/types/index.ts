export type Banner = {
	id: string;
	type: string;
	title?: string;
	content: string;
	url?: string;
	dismissible?: boolean;
	timestamp: number;
};

export enum TTS_RESPONSE_SPLIT {
	PUNCTUATION = 'punctuation',
	PARAGRAPHS = 'paragraphs',
	NONE = 'none'
}

import type { ModelConfig } from '$lib/apis';

// Model Types
export interface BaseModel {
	id: string;
	name: string;
	info?: ModelConfig;
	owned_by: 'ollama' | 'openai' | 'arena';
}

export interface OpenAIModel extends BaseModel {
	owned_by: 'openai';
	external: boolean;
	source?: string;
}

export interface OllamaModelDetails {
	parent_model: string;
	format: string;
	family: string;
	families: string[] | null;
	parameter_size: string;
	quantization_level: string;
}

export interface OllamaModel extends BaseModel {
	owned_by: 'ollama';
	details: OllamaModelDetails;
	size: number;
	description: string;
	model: string;
	modified_at: string;
	digest: string;
	ollama?: {
		name?: string;
		model?: string;
		modified_at: string;
		size?: number;
		digest?: string;
		details?: {
			parent_model?: string;
			format?: string;
			family?: string;
			families?: string[];
			parameter_size?: string;
			quantization_level?: string;
		};
		urls?: number[];
	};
}

export type Model = OpenAIModel | OllamaModel;

export interface ModelOptions {
	stop?: boolean;
}

// Content Types
export interface Prompt {
	command: string;
	user_id: string;
	title: string;
	content: string;
	timestamp: number;
}

export interface Document {
	collection_name: string;
	filename: string;
	name: string;
	title: string;
}

export interface PromptSuggestion {
	content: string;
	title: [string, string];
}

// Settings Types
export interface AudioSettings {
	STTEngine?: string;
	TTSEngine?: string;
	speaker?: string;
	model?: string;
	nonLocalVoices?: boolean;
}

export interface TitleSettings {
	auto?: boolean;
	model?: string;
	modelExternal?: string;
	prompt?: string;
}

export interface Settings {
	models?: string[];
	conversationMode?: boolean;
	speechAutoSend?: boolean;
	responseAutoPlayback?: boolean;
	audio?: AudioSettings;
	showUsername?: boolean;
	notificationEnabled?: boolean;
	title?: TitleSettings;
	splitLargeDeltas?: boolean;
	chatDirection: 'LTR' | 'RTL';
	system?: string;
	requestFormat?: string;
	keepAlive?: string;
	seed?: number;
	temperature?: string;
	repeat_penalty?: string;
	top_k?: string;
	top_p?: string;
	num_ctx?: string;
	num_batch?: string;
	num_keep?: string;
	options?: ModelOptions;
}

export interface Config {
	status: boolean;
	name: string;
	version: string;
	default_locale: string;
	default_models: string;
	default_prompt_suggestions: PromptSuggestion[];
	features: {
		auth: boolean;
		auth_trusted_header: boolean;
		enable_api_key: boolean;
		enable_signup: boolean;
		enable_login_form: boolean;
		enable_web_search?: boolean;
		enable_image_generation: boolean;
		enable_admin_export: boolean;
		enable_admin_chat_access: boolean;
		enable_community_sharing: boolean;
	};
	oauth: {
		providers: {
			[key: string]: string;
		};
	};
}

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: string;
	profile_image_url: string;
}

// Chat Types
export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	parentId: string | null;
	childrenIds: string[];
	statusHistory?: string[];
	code_executions?: CodeExecution[];
	sources?: Source[];
	timestamp?: number;
}

export interface Chat {
	id: string;
	title: string;
	models: string[];
	messages: Record<string, Message>;
	currentId: string | null;
	tags?: string[];
	pinned?: boolean;
	archived?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface History {
	messages: Record<string, Message>;
	currentId: string | null;
}

export interface ChatEvent {
	chat_id: string;
	message_id: string;
	data: {
		type: 'status' | 'source' | 'citation' | 'message' | 'replace' | 'action' | 'confirmation' | 'execute' | 'input';
		data: any;
	};
}

export interface CodeExecution {
	id: string;
	code: string;
	output?: string;
	error?: string;
	status: 'running' | 'completed' | 'error';
}

export interface Source {
	type: string;
	content: string;
	url?: string;
}

// API Response Types
export interface OllamaResponse {
	model: string;
	created_at: string;
	message: {
		role: string;
		content: string;
	};
	done: boolean;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
}

export interface OpenAIResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: {
		index: number;
		message: {
			role: string;
			content: string;
		};
		finish_reason: string;
	}[];
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface WebSearchResponse {
	query: string;
	results: {
		title: string;
		link: string;
		snippet: string;
	}[];
}

export interface MemoryQueryResponse {
	query: string;
	results: {
		content: string;
		metadata: {
			source: string;
			score: number;
		};
	}[];
}
