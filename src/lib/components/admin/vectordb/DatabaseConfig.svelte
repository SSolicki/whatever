<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { DBConfig, VectorDBType, ConnectionStatus } from '$lib/types/vectordb';
    import { DEFAULT_DB_CONFIG } from '$lib/types/vectordb';
    import SensitiveInput from '$lib/components/common/SensitiveInput.svelte';
    import Tooltip from '$lib/components/common/Tooltip.svelte';
    import Modal from '$lib/components/common/Modal.svelte';
    import i18n from '$lib/i18n';
    import { toast } from 'svelte-sonner';

    export let config: DBConfig = DEFAULT_DB_CONFIG;
    export let onSave: (config: DBConfig) => Promise<void>;
    export let onTest: (config: DBConfig) => Promise<ConnectionStatus>;

    const dispatch = createEventDispatcher();
    // Initialize i18n with vectordb namespace
    let t = (key: string, options?: any) => key; // Default function that returns the key
    $: if ($i18n) {
        t = $i18n.t.bind($i18n);
    }

    let loading = false;
    let showConfigModal = false;
    let currentStatus: ConnectionStatus | null = null;

    const dbTypes: VectorDBType[] = ['milvus', 'qdrant', 'opensearch', 'pgvector', 'chroma'];

    function transformConfig(config: DBConfig): DBConfig {
        // Create a deep copy of the original config to preserve all DB configs
        const newConfig = JSON.parse(JSON.stringify(config));
        
        // Update only the selected DB's configuration
        const selectedConfig = config.config[config.type];
        newConfig.config[config.type] = {
            ...selectedConfig  // Keep all properties of the selected DB
        };
        
        return newConfig;
    }

    async function handleTest() {
        try {
            loading = true;
            // Transform config before sending
            const transformedConfig = transformConfig(config);
            currentStatus = await onTest(transformedConfig);
            if (currentStatus.isConnected) {
                toast.success(t('Connection successful'));
            } else {
                toast.error(currentStatus.error || t('Connection failed'));
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            loading = false;
        }
    }

    async function handleSave() {
        try {
            loading = true;
            // Transform config before sending
            const transformedConfig = transformConfig(config);
            await onSave(transformedConfig);
            toast.success(t('Configuration saved'));
        } catch (error) {
            toast.error(error.message);
        } finally {
            loading = false;
        }
    }

    function handleImport(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                config = imported;
                toast.success(t('Configuration imported'));
            } catch (error) {
                toast.error(t('Invalid configuration file'));
            }
        };
        reader.readAsText(file);
    }

    function handleExport() {
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vectordb-config-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
</script>

<div class="flex flex-col space-y-4">
    <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium">{t('Vector Database Configuration')}</h2>
        <div class="flex space-x-2">
            <button
                class="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition"
                on:click={() => showConfigModal = true}
            >
                {t('Import/Export')}
            </button>
            <button
                class="px-3 py-1.5 text-sm font-medium bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 rounded-full transition"
                on:click={handleTest}
                disabled={loading}
            >
                {loading ? t('Testing...') : t('Test Connection')}
            </button>
        </div>
    </div>

    <div class="space-y-4">
        <div class="flex flex-col space-y-2">
            <label class="text-sm font-medium" for="dbType">
                {t('Database Type')}
            </label>
            <select
                id="dbType"
                class="form-select rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-none"
                bind:value={config.type}
            >
                {#each dbTypes as type}
                    <option value={type}>{type}</option>
                {/each}
            </select>
        </div>

        {#if config.type === 'milvus'}
            <div class="flex flex-col space-y-2">
                <label class="text-sm font-medium" for="milvusUri">
                    {t('Milvus URI')}
                </label>
                <SensitiveInput
                    id="milvusUri"
                    bind:value={config.config.milvus.uri}
                    placeholder="localhost:19530"
                />
            </div>
        {:else if config.type === 'qdrant'}
            <div class="flex flex-col space-y-2">
                <label class="text-sm font-medium" for="qdrantUri">
                    {t('Qdrant URI')}
                </label>
                <input
                    class="flex-1 w-full rounded-lg text-sm bg-transparent outline-none"
                    id="qdrantUri"
                    bind:value={config.config.qdrant.uri}
                    placeholder="http://localhost:6334"
                />
                <label class="text-sm font-medium" for="qdrantApiKey">
                    {t('API Key')} <span class="text-xs text-gray-500">(optional)</span>
                </label>
                <SensitiveInput
                    id="qdrantApiKey"
                    bind:value={config.config.qdrant.apiKey}
                    type="password"
                    required={false}
                    placeholder="Leave empty for local Qdrant"
                />
            </div>
        {:else if config.type === 'opensearch'}
            <div class="flex flex-col space-y-2">
                <label class="text-sm font-medium" for="openSearchUri">
                    {t('OpenSearch URI')}
                </label>
                <input
                    id="openSearchUri"
                    class="flex-1 w-full rounded-lg text-sm bg-transparent outline-none"
                    bind:value={config.config.opensearch.uri}
                    placeholder="http://localhost:9200"
                />
                <label class="text-sm font-medium" for="openSearchUsername">
                    {t('Username')}
                </label>
                <input
                    id="openSearchUsername"
                    class="flex-1 w-full rounded-lg text-sm bg-transparent outline-none"
                    bind:value={config.config.opensearch.username}
                    placeholder="Username"
                />
                <label class="text-sm font-medium" for="openSearchPassword">
                    {t('Password')}
                </label>
                <SensitiveInput
                    id="openSearchPassword"
                    bind:value={config.config.opensearch.password}
                    type="password"
                    placeholder="Password"
                />
            </div>
        {:else if config.type === 'pgvector'}
            <div class="flex flex-col space-y-2">
                <label class="text-sm font-medium" for="pgvectorUri">
                    {t('PostgreSQL Connection URI')}
                </label>
                <SensitiveInput
                    id="pgvectorUri"
                    bind:value={config.config.pgvector.uri}
                    placeholder="postgresql://user:password@localhost:5432/dbname"
                />
            </div>
        {:else if config.type === 'chroma'}
            <div class="flex flex-col space-y-2">
                <p class="text-sm text-gray-500">
                    {t('Chroma is a local vector database and does not require additional configuration.')}
                </p>
            </div>
        {/if}

        <div class="flex justify-end">
            <button
                class="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition"
                on:click={handleSave}
                disabled={loading}
            >
                {loading ? t('Saving...') : t('Save Configuration')}
            </button>
        </div>
    </div>
</div>

<Modal bind:show={showConfigModal} maxWidth="sm">
    <div class="p-4 space-y-4">
        <h3 class="text-lg font-medium">{t('Import/Export Configuration')}</h3>
        <div class="space-y-2">
            <input
                type="file"
                accept=".json"
                on:change={handleImport}
                class="hidden"
                id="configImport"
            />
            <div class="flex space-x-2">
                <label
                    for="configImport"
                    class="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition cursor-pointer"
                >
                    {t('Import')}
                </label>
                <button
                    class="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition"
                    on:click={handleExport}
                >
                    {t('Export')}
                </button>
            </div>
        </div>
    </div>
</Modal>
