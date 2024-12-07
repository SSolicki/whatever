export type VectorDBType = 'milvus' | 'qdrant' | 'opensearch' | 'pgvector' | 'chroma';

export interface DBConfig {
    type: VectorDBType;
    config: {
        milvus?: {
            uri: string;
        };
        qdrant?: {
            uri: string;
            apiKey?: string;
        };
        opensearch?: {
            uri: string;
            ssl: boolean;
            certVerify: boolean;
            username: string;
            password: string;
        };
        pgvector?: {
            dbUrl: string;
        };
        chroma?: {
            httpHost: string;
            httpPort: number;
            httpHeaders?: Record<string, string>;
            ssl: boolean;
            tenant?: string;
            database?: string;
            authProvider?: string;
            authCredentials?: string;
            dataPath?: string;
        };
    };
}

export interface VectorSettings {
    embeddingEngine: string;
    embeddingModel: string;
    embeddingBatchSize: number;
    chunkSize: number;
    chunkOverlap: number;
    textSplitter: string;
    queryTemplate: string;
    retrievalK: number;
    hybridSearch: boolean;
}

export interface ConnectionStatus {
    isConnected: boolean;
    error?: string;
    lastChecked: Date;
}

export interface Collection {
    name: string;
    type: VectorDBType;
    stats: {
        vectorCount: number;
        dimensions?: number;
        lastModified: Date;
        size: number;
    };
    metadata?: Record<string, any>;
}

export interface CollectionOperations {
    create: (name: string, config: any) => Promise<void>;
    delete: (name: string) => Promise<void>;
    list: () => Promise<Collection[]>;
    getStats: (name: string) => Promise<Collection['stats']>;
}
