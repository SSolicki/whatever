<script lang="ts">
    import { getContext } from 'svelte';
    import { copyToClipboard } from '$lib/utils';
    import hljs from 'highlight.js';
    import 'highlight.js/styles/github-dark.min.css';
    
    const i18n = getContext('i18n');
    
    export let history;
    export let selectedModels;
    
    export let activeArtifactIndex = 0;
    
    let codeChunks = {};
    let selectedTab = 'html';
    let activeChunks = new Set();
    
    $: if (history) {
        getCodeChunks();
    }
    
    $: if (activeArtifactIndex !== undefined) {
        updateActiveChunks();
    }
    
    const updateActiveChunks = () => {
        activeChunks.clear();
        if (!history) return;
        
        const messages = Object.values(history.messages);
        const artifactContent = messages.find(m => m?.role !== 'user')?.content;
        
        if (!artifactContent) return;
        
        Object.entries(codeChunks).forEach(([language, chunks]) => {
            chunks.forEach(chunk => {
                if (artifactContent.includes(chunk.code)) {
                    activeChunks.add(chunk.messageId);
                }
            });
        });
        
        const activeLanguage = Object.keys(codeChunks).find(lang => 
            codeChunks[lang].some(chunk => activeChunks.has(chunk.messageId))
        );
        if (activeLanguage) {
            selectedTab = activeLanguage;
        }
    };
    
    const getCodeChunks = () => {
        codeChunks = {};
        Object.values(history.messages).forEach((message: any) => {
            if (message?.role !== 'user' && message?.content) {
                const matches = message.content.match(/```[\s\S]*?```/g);
                
                if (matches) {
                    matches.forEach((block) => {
                        const firstLine = block.split('\n')[0];
                        let language = firstLine.replace('```', '').trim().toLowerCase();
                        
                        // Normalize language names
                        if (['js', 'javascript'].includes(language)) language = 'javascript';
                        if (['ts', 'typescript'].includes(language)) language = 'typescript';
                        if (['html', 'htm'].includes(language)) language = 'html';
                        if (['css', 'scss', 'sass'].includes(language)) language = 'css';
                        
                        const code = block
                            .replace(firstLine, '')
                            .replace(/```$/, '')
                            .trim();
                        
                        if (code) {
                            if (!codeChunks[language]) {
                                codeChunks[language] = [];
                            }
                            
                            // Highlight the code
                            let highlightedCode;
                            try {
                                highlightedCode = hljs.highlight(code, { language }).value;
                            } catch {
                                highlightedCode = hljs.highlightAuto(code).value;
                            }
                            
                            codeChunks[language].push({
                                code,
                                highlightedCode,
                                messageId: message.id
                            });
                        }
                    });
                }
            }
        });
        
        // Set initial selected tab to first available language
        if (Object.keys(codeChunks).length > 0 && !codeChunks[selectedTab]) {
            selectedTab = Object.keys(codeChunks)[0];
        }
    };

    let copied = '';
</script>

<div class="code-chunks h-full flex flex-col bg-gray-50 dark:bg-gray-850">
    <div class="header p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Code Chunks</h3>
    </div>
    
    {#if Object.keys(codeChunks).length > 0}
        <div class="tabs flex border-b border-gray-200 dark:border-gray-700">
            {#each Object.keys(codeChunks) as language}
                <button 
                    class="px-4 py-2 text-sm font-medium transition-colors
                        {selectedTab === language 
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
                    on:click={() => selectedTab = language}
                >
                    {language.toUpperCase()}
                    <span class="ml-1 text-xs text-gray-500">({codeChunks[language].length})</span>
                </button>
            {/each}
        </div>
        
        <div class="chunks-list flex-1 overflow-y-auto p-4">
            {#each codeChunks[selectedTab] || [] as chunk}
                <div 
                    class="code-chunk mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700
                        {activeChunks.has(chunk.messageId) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}"
                >
                    <div class="chunk-header flex justify-between items-center px-3 py-2 bg-gray-100 dark:bg-gray-800">
                        <span class="language text-sm text-gray-600 dark:text-gray-300">
                            {selectedTab.toUpperCase()}
                            {#if activeChunks.has(chunk.messageId)}
                                <span class="ml-2 text-xs text-blue-500 dark:text-blue-400">Active</span>
                            {/if}
                        </span>
                        <button 
                            class="copy-btn text-xs px-2 py-1 rounded bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                            on:click={() => {
                                copyToClipboard(chunk.code);
                                copied = chunk.messageId;
                                setTimeout(() => copied = '', 2000);
                            }}
                        >
                            {copied === chunk.messageId ? $i18n.t('Copied!') : $i18n.t('Copy')}
                        </button>
                    </div>
                    <pre class="p-4 bg-[#0d1117] overflow-x-auto"><code class="hljs language-{selectedTab}">{@html chunk.highlightedCode}</code></pre>
                </div>
            {/each}
        </div>
    {:else}
        <div class="empty-state text-center text-gray-500 dark:text-gray-400 py-8">
            {$i18n.t('No code chunks available')}
        </div>
    {/if}
</div>

<style>
    pre {
        margin: 0;
    }
    
    code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.875rem;
        line-height: 1.25rem;
    }
    
    :global(.hljs) {
        background: #0d1117 !important;
        color: #c9d1d9;
    }
</style> 