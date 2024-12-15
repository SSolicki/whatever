import type { VectorDBType } from './vectordb';

/**
 * Vector database configuration API response
 */
export interface VectorDBConfigResponse {
    /** Currently selected vector database type */
    current_db: VectorDBType;
    /** List of available vector database types */
    available_dbs: VectorDBType[];
    /** Configuration for each vector database type */
    config: {
        qdrant: {
            uri: string;
            apiKey: string;
        };
        opensearch: {
            uri: string;
            username: string;
            password: string;
        };
        milvus: {
            uri: string;
        };
        pgvector: {
            uri: string;
        };
        chroma: {
            httpHost?: string;
            httpPort?: number;
            ssl?: boolean;
            httpHeaders?: Record<string, string>;
            tenant?: string;
            database?: string;
            authProvider?: string;
            authCredentials?: string;
            dataPath?: string;
        };
    };
}
