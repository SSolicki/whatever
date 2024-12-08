import { RETRIEVAL_API_BASE_URL } from '$lib/constants';
import type { DBConfig, VectorDBType, ConnectionStatus } from '$lib/types/vectordb';

export const getRAGConfig = async (token: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/config`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

type ChunkConfigForm = {
	chunk_size: number;
	chunk_overlap: number;
};

type ContentExtractConfigForm = {
	engine: string;
	tika_server_url: string | null;
};

type YoutubeConfigForm = {
	language: string[];
	translation?: string | null;
};

type RAGConfigForm = {
	pdf_extract_images?: boolean;
	chunk?: ChunkConfigForm;
	content_extraction?: ContentExtractConfigForm;
	web_loader_ssl_verification?: boolean;
	youtube?: YoutubeConfigForm;
};

export const updateRAGConfig = async (token: string, payload: RAGConfigForm) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/config/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			...payload
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getRAGTemplate = async (token: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/template`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res?.template ?? '';
};

export const getQuerySettings = async (token: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/query/settings`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

type QuerySettings = {
	k: number | null;
	r: number | null;
	template: string | null;
};

export const updateQuerySettings = async (token: string, settings: QuerySettings) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/query/settings/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			...settings
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getEmbeddingConfig = async (token: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/embedding`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

type OpenAIConfigForm = {
	key: string;
	url: string;
};

type EmbeddingModelUpdateForm = {
	openai_config?: OpenAIConfigForm;
	embedding_engine: string;
	embedding_model: string;
	embedding_batch_size?: number;
};

export const updateEmbeddingConfig = async (token: string, payload: EmbeddingModelUpdateForm) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/embedding/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			...payload
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getRerankingConfig = async (token: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/reranking`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

type RerankingModelUpdateForm = {
	reranking_model: string;
};

export const updateRerankingConfig = async (token: string, payload: RerankingModelUpdateForm) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/reranking/update`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			...payload
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export interface SearchDocument {
	status: boolean;
	collection_name: string;
	filenames: string[];
}

export const processFile = async (
	token: string,
	file_id: string,
	collection_name: string | null = null
) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/process/file`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			file_id: file_id,
			collection_name: collection_name ? collection_name : undefined
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const processYoutubeVideo = async (token: string, url: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/process/youtube`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			url: url
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const processWeb = async (token: string, collection_name: string, url: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/process/web`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			url: url,
			collection_name: collection_name
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const processWebSearch = async (
	token: string,
	query: string,
	collection_name?: string
): Promise<SearchDocument | null> => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/process/web/search`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			query,
			collection_name: collection_name ?? ''
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.log(err);
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const queryDoc = async (
	token: string,
	collection_name: string,
	query: string,
	k: number | null = null
) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/query/doc`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			collection_name: collection_name,
			query: query,
			k: k
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const queryCollection = async (
	token: string,
	collection_names: string,
	query: string,
	k: number | null = null
) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/query/collection`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			collection_names: collection_names,
			query: query,
			k: k
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const resetUploadDir = async (token: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/reset/uploads`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const resetVectorDB = async (token: string) => {
	let error = null;

	const res = await fetch(`${RETRIEVAL_API_BASE_URL}/reset/db`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

class VectorDBError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'VectorDBError';
    }
}

export const getVectorDBConfig = async (
	token: string
): Promise<{ current_db: VectorDBType; available_dbs: VectorDBType[] }> => {
	try {
        const res = await fetch(`${RETRIEVAL_API_BASE_URL}/config/vectordb`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new VectorDBError(
                error.detail || 'Failed to get vector database configuration',
                'CONFIG_FETCH_ERROR'
            );
        }

        const data = await res.json();
        return data;
    } catch (error) {
        if (error instanceof VectorDBError) {
            throw error;
        }
        throw new VectorDBError(
            'Failed to get vector database configuration',
            'NETWORK_ERROR'
        );
    }
};

export const updateVectorDBConfig = async (
	token: string,
	config: DBConfig
): Promise<{ message: string }> => {
	try {
        if (!config.type || !config.config) {
            throw new VectorDBError(
                'Invalid configuration: missing required fields',
                'INVALID_CONFIG'
            );
        }

        const res = await fetch(`${RETRIEVAL_API_BASE_URL}/config/vectordb`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });

        if (res.status === 422) {
            const error = await res.json();
            throw new VectorDBError(
                error.detail || 'Invalid configuration',
                'VALIDATION_ERROR'
            );
        }

        if (!res.ok) {
            const error = await res.json();
            throw new VectorDBError(
                error.detail || 'Failed to update vector database configuration',
                'CONFIG_UPDATE_ERROR'
            );
        }

        return await res.json();
    } catch (error) {
        if (error instanceof VectorDBError) {
            throw error;
        }
        throw new VectorDBError(
            'Failed to update vector database configuration',
            'NETWORK_ERROR'
        );
    }
};

export const testVectorDBConfig = async (
	token: string,
	config: DBConfig
): Promise<ConnectionStatus> => {
	try {
        if (!config.type || !config.config) {
            throw new VectorDBError(
                'Invalid configuration: missing required fields',
                'INVALID_CONFIG'
            );
        }

        const res = await fetch(`${RETRIEVAL_API_BASE_URL}/config/vectordb/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(config)
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('Vector DB test failed:', error);
            throw new VectorDBError(
                error.detail || 'Failed to test vector database configuration',
                'VALIDATION_ERROR'
            );
        }

        return await res.json();
    } catch (error) {
        if (error instanceof VectorDBError) {
            throw error;
        }
        console.error('Vector DB test error:', error);
        throw new VectorDBError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            'UNKNOWN_ERROR'
        );
    }
};
