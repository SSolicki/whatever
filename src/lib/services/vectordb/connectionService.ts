import type { DBConfig, ConnectionStatus } from '$lib/types/vectordb';

class ConnectionService {
    async testConnection(config: DBConfig): Promise<ConnectionStatus> {
        try {
            switch (config.type) {
                case 'qdrant': {
                    const uri = config.config.qdrant?.uri;
                    if (!uri) {
                        return { isConnected: false, error: 'No URI provided' };
                    }

                    // Make a request to the Qdrant collections endpoint
                    const response = await fetch(`${uri}/collections`);
                    if (!response.ok) {
                        const error = await response.text();
                        return { 
                            isConnected: false, 
                            error: `Failed to connect: ${error}` 
                        };
                    }

                    // If we get here, the connection was successful
                    return { isConnected: true };
                }
                // Add other database types here
                default:
                    return { 
                        isConnected: false, 
                        error: `Database type ${config.type} not supported` 
                    };
            }
        } catch (error) {
            return { 
                isConnected: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }
}

export const connectionService = new ConnectionService();
