/**
 * Supported vector database types
 */
export type VectorDBType = 'milvus' | 'qdrant' | 'opensearch' | 'pgvector' | 'chroma';

/**
 * Default vector database configuration
 */
export const DEFAULT_DB_CONFIG: DBConfig = {
    type: 'qdrant',
    config: {
        milvus: {
            uri: ''
        },
        qdrant: {
            uri: '',
            apiKey: ''
        },
        opensearch: {
            uri: '',
            username: '',
            password: ''
        },
        pgvector: {
            uri: ''
        },
        chroma: {}
    }
};

/**
 * Vector database configuration interface
 */
export interface DBConfig {
    /** Type of vector database */
    type: VectorDBType;
    /** Configuration for different vector database types */
    config: {
        /** Milvus configuration */
        milvus?: {
            /** Milvus server URI */
            uri: string;
        };
        /** Qdrant configuration */
        qdrant?: {
            /** Qdrant server URI */
            uri: string;
            /** Optional API key for authentication */
            apiKey?: string;
        };
        /** OpenSearch configuration */
        opensearch?: {
            /** OpenSearch server URI */
            uri: string;
            /** OpenSearch username */
            username: string;
            /** OpenSearch password */
            password: string;
        };
        /** PGVector configuration */
        pgvector?: {
            /** PostgreSQL connection URL */
            uri: string;
        };
        /** Chroma configuration */
        chroma?: {
            /** Chroma server host */
            httpHost: string;
            /** Chroma server port */
            httpPort: number;
            /** Optional HTTP headers */
            httpHeaders?: Record<string, string>;
            /** Enable SSL */
            ssl: boolean;
            /** Optional tenant ID */
            tenant?: string;
            /** Optional database name */
            database?: string;
            /** Optional authentication provider */
            authProvider?: string;
            /** Optional authentication credentials */
            authCredentials?: string;
            /** Optional data path */
            dataPath?: string;
        };
    };
}

/**
 * Vector database settings
 */
export interface VectorSettings {
    /** Engine used for embeddings */
    embeddingEngine: string;
    /** Model used for embeddings */
    embeddingModel: string;
    /** Batch size for embedding generation */
    embeddingBatchSize: number;
    /** Size of text chunks */
    chunkSize: number;
    /** Overlap between chunks */
    chunkOverlap: number;
    /** Text splitter type */
    textSplitter: string;
    /** Template for queries */
    queryTemplate: string;
    /** Number of results to retrieve */
    retrievalK: number;
    /** Enable hybrid search */
    hybridSearch: boolean;
}

/**
 * Connection status response
 */
export interface ConnectionStatus {
    /** Whether the connection was successful */
    isConnected: boolean;
    /** Optional error message if connection failed */
    error?: string;
    /** When the connection was last checked */
    lastChecked: Date;
}

/**
 * Collection information
 */
export interface Collection {
    /** Collection name */
    name: string;
    /** Vector database type */
    type: VectorDBType;
    /** Collection statistics */
    stats: {
        /** Number of vectors in collection */
        vectorCount: number;
        /** Vector dimensions (optional) */
        dimensions?: number;
        /** Last modification date */
        lastModified: Date;
        /** Collection size in bytes */
        size: number;
    };
    /** Optional metadata */
    metadata?: Record<string, any>;
}

/**
 * Collection operations interface
 */
export interface CollectionOperations {
    /** Create a new collection */
    create: (name: string, config: any) => Promise<void>;
    /** Delete a collection */
    delete: (name: string) => Promise<void>;
    /** List all collections */
    list: () => Promise<Collection[]>;
    /** Get collection statistics */
    getStats: (name: string) => Promise<Collection['stats']>;
}
