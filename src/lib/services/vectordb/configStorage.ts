import type { DBConfig, VectorSettings, Collection } from '$lib/types/vectordb';

export interface StoredConfig {
  id: string;
  name: string;
  dbConfig: DBConfig;
  vectorSettings: VectorSettings;
  collections: Collection[];
  lastModified: string;
  version: string;
}

class ConfigStorageService {
  private readonly STORAGE_KEY = 'vectordb_config';
  private readonly VERSION = '1.0.0';

  async saveConfig(config: Omit<StoredConfig, 'id' | 'lastModified' | 'version'>): Promise<StoredConfig> {
    try {
      const storedConfig: StoredConfig = {
        ...config,
        id: crypto.randomUUID(),
        lastModified: new Date().toISOString(),
        version: this.VERSION
      };

      // In a real implementation, this would save to a backend service
      // For now, we'll use localStorage as a temporary solution
      const configs = await this.getAllConfigs();
      configs.push(storedConfig);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));

      return storedConfig;
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  async updateConfig(id: string, config: Partial<StoredConfig>): Promise<StoredConfig> {
    try {
      const configs = await this.getAllConfigs();
      const index = configs.findIndex(c => c.id === id);
      
      if (index === -1) {
        throw new Error('Configuration not found');
      }

      const updatedConfig: StoredConfig = {
        ...configs[index],
        ...config,
        lastModified: new Date().toISOString(),
        version: this.VERSION
      };

      configs[index] = updatedConfig;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));

      return updatedConfig;
    } catch (error) {
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }

  async getConfig(id: string): Promise<StoredConfig | undefined> {
    try {
      const configs = await this.getAllConfigs();
      return configs.find(c => c.id === id);
    } catch (error) {
      throw new Error(`Failed to retrieve configuration: ${error.message}`);
    }
  }

  async getAllConfigs(): Promise<StoredConfig[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      throw new Error(`Failed to retrieve configurations: ${error.message}`);
    }
  }

  async deleteConfig(id: string): Promise<void> {
    try {
      const configs = await this.getAllConfigs();
      const filtered = configs.filter(c => c.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      throw new Error(`Failed to delete configuration: ${error.message}`);
    }
  }

  async exportConfig(id: string): Promise<string> {
    try {
      const config = await this.getConfig(id);
      if (!config) {
        throw new Error('Configuration not found');
      }
      return JSON.stringify(config, null, 2);
    } catch (error) {
      throw new Error(`Failed to export configuration: ${error.message}`);
    }
  }

  async importConfig(configData: string): Promise<StoredConfig> {
    try {
      const parsed = JSON.parse(configData);
      const { name, dbConfig, vectorSettings, collections } = parsed;

      return this.saveConfig({
        name,
        dbConfig,
        vectorSettings,
        collections
      });
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }
}

export const configStorage = new ConfigStorageService();
