<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { createEventDispatcher, onMount, getContext, tick } from 'svelte';

	const dispatch = createEventDispatcher();

	import { getOllamaConfig, updateOllamaConfig } from '$lib/apis/ollama';
	import { getOpenAIConfig, updateOpenAIConfig, getOpenAIModels } from '$lib/apis/openai';
	import { getAnthropicConfig, updateAnthropicConfig } from '$lib/apis/anthropic';
	import { getGoogleConfig, updateGoogleConfig } from '$lib/apis/google';

	import { getModels as _getModels } from '$lib/apis';

	import { models, user } from '$lib/stores';

	import Switch from '$lib/components/common/Switch.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';

	import OpenAIConnection from './Connections/OpenAIConnection.svelte';
	import AddConnectionModal from './Connections/AddConnectionModal.svelte';
	import OllamaConnection from './Connections/OllamaConnection.svelte';
	import AnthropicConnection from './Connections/AnthropicConnection.svelte';
	import GoogleConnection from './Connections/GoogleConnection.svelte';

	const i18n = getContext('i18n');

	const getModels = async () => {
		const models = await _getModels(localStorage.token);
		return models;
	};

	// External
	let OLLAMA_BASE_URLS = [''];
	let OLLAMA_API_CONFIGS = {};

	let OPENAI_API_KEYS = [''];
	let OPENAI_API_BASE_URLS = [''];
	let OPENAI_API_CONFIGS = {};

	let ANTHROPIC_API_KEYS = [''];
	let ANTHROPIC_API_BASE_URLS = [''];
	let ANTHROPIC_API_CONFIGS = {};

	let GOOGLE_API_KEYS = [''];
	let GOOGLE_API_BASE_URLS = [''];
	let GOOGLE_API_CONFIGS = {};

	let ENABLE_OPENAI_API: null | boolean = null;
	let ENABLE_OLLAMA_API: null | boolean = null;
	let ENABLE_ANTHROPIC_API: null | boolean = null;
	let ENABLE_GOOGLE_API: null | boolean = null;

	let pipelineUrls = {};
	let showAddOpenAIConnectionModal = false;
	let showAddOllamaConnectionModal = false;
	let showAddAnthropicConnectionModal = false;
	let showAddGoogleConnectionModal = false;

	const updateOpenAIHandler = async () => {
		if (ENABLE_OPENAI_API !== null) {
			OPENAI_API_BASE_URLS = OPENAI_API_BASE_URLS.filter(
				(url, urlIdx) => OPENAI_API_BASE_URLS.indexOf(url) === urlIdx && url !== ''
			).map((url) => url.replace(/\/$/, ''));

			// Check if API KEYS length is same than API URLS length
			if (OPENAI_API_KEYS.length !== OPENAI_API_BASE_URLS.length) {
				// if there are more keys than urls, remove the extra keys
				if (OPENAI_API_KEYS.length > OPENAI_API_BASE_URLS.length) {
					OPENAI_API_KEYS = OPENAI_API_KEYS.slice(0, OPENAI_API_BASE_URLS.length);
				}

				// if there are more urls than keys, add empty keys
				if (OPENAI_API_KEYS.length < OPENAI_API_BASE_URLS.length) {
					const diff = OPENAI_API_BASE_URLS.length - OPENAI_API_KEYS.length;
					for (let i = 0; i < diff; i++) {
						OPENAI_API_KEYS.push('');
					}
				}
			}

			const res = await updateOpenAIConfig(localStorage.token, {
				ENABLE_OPENAI_API: ENABLE_OPENAI_API,
				OPENAI_API_BASE_URLS: OPENAI_API_BASE_URLS,
				OPENAI_API_KEYS: OPENAI_API_KEYS,
				OPENAI_API_CONFIGS: OPENAI_API_CONFIGS
			}).catch((error) => {
				toast.error(error);
			});

			if (res) {
				toast.success($i18n.t('OpenAI API settings updated'));
				await models.set(await getModels());
			}
		}
	};

	const updateGoogleHandler = async () => {
		if (ENABLE_GOOGLE_API !== null) {
			GOOGLE_API_BASE_URLS = GOOGLE_API_BASE_URLS.filter(
				(url, urlIdx) => GOOGLE_API_BASE_URLS.indexOf(url) === urlIdx && url !== ''
			).map((url) => url.replace(/\/$/, ''));

			if (GOOGLE_API_BASE_URLS.length === 0) {
				ENABLE_GOOGLE_API = false;
				toast.info($i18n.t('Google API disabled'));
				return;
			}

			// Check if API KEYS length is same than API URLS length
			if (GOOGLE_API_KEYS.length !== GOOGLE_API_BASE_URLS.length) {
				// if there are more keys than urls, remove the extra keys
				if (GOOGLE_API_KEYS.length > GOOGLE_API_BASE_URLS.length) {
					GOOGLE_API_KEYS = GOOGLE_API_KEYS.slice(0, GOOGLE_API_BASE_URLS.length);
				}

				// if there are more urls than keys, add empty keys
				if (GOOGLE_API_KEYS.length < GOOGLE_API_BASE_URLS.length) {
					const diff = GOOGLE_API_BASE_URLS.length - GOOGLE_API_KEYS.length;
					for (let i = 0; i < diff; i++) {
						GOOGLE_API_KEYS.push('');
					}
				}
			}

			const res = await updateGoogleConfig(localStorage.token, {
				ENABLE_GOOGLE_API: ENABLE_GOOGLE_API,
				GOOGLE_API_BASE_URLS: GOOGLE_API_BASE_URLS,
				GOOGLE_API_KEYS: GOOGLE_API_KEYS,
				GOOGLE_API_CONFIGS: GOOGLE_API_CONFIGS
			}).catch((error) => {
				toast.error(error);
			});

			if (res) {
				toast.success($i18n.t('Google API settings updated'));
				await models.set(await getModels());
			}
		}
	};

	const updateOllamaHandler = async () => {
		if (ENABLE_OLLAMA_API !== null) {
			// Remove duplicate URLs
			OLLAMA_BASE_URLS = OLLAMA_BASE_URLS.filter(
				(url, urlIdx) => OLLAMA_BASE_URLS.indexOf(url) === urlIdx && url !== ''
			).map((url) => url.replace(/\/$/, ''));

			console.log(OLLAMA_BASE_URLS);

			if (OLLAMA_BASE_URLS.length === 0) {
				ENABLE_OLLAMA_API = false;
				toast.info($i18n.t('Ollama API disabled'));
			}

			const res = await updateOllamaConfig(localStorage.token, {
				ENABLE_OLLAMA_API: ENABLE_OLLAMA_API,
				OLLAMA_BASE_URLS: OLLAMA_BASE_URLS,
				OLLAMA_API_CONFIGS: OLLAMA_API_CONFIGS
			}).catch((error) => {
				toast.error(error);
			});

			if (res) {
				toast.success($i18n.t('Ollama API settings updated'));
				await models.set(await getModels());
			}
		}
	};

	const updateAnthropicHandler = async () => {
		if (ENABLE_ANTHROPIC_API !== null) {
			// Remove duplicate URLs and empty strings
			ANTHROPIC_API_BASE_URLS = ANTHROPIC_API_BASE_URLS.filter(
				(url, urlIdx) => ANTHROPIC_API_BASE_URLS.indexOf(url) === urlIdx && url !== ''
			).map((url) => url.replace(/\/$/, ''));

			// Check if API KEYS length matches API URLS length
			if (ANTHROPIC_API_KEYS.length !== ANTHROPIC_API_BASE_URLS.length) {
				// if there are more keys than urls, remove the extra keys
				if (ANTHROPIC_API_KEYS.length > ANTHROPIC_API_BASE_URLS.length) {
					ANTHROPIC_API_KEYS = ANTHROPIC_API_KEYS.slice(0, ANTHROPIC_API_BASE_URLS.length);
				}

				// if there are more urls than keys, add empty keys
				if (ANTHROPIC_API_KEYS.length < ANTHROPIC_API_BASE_URLS.length) {
					const diff = ANTHROPIC_API_BASE_URLS.length - ANTHROPIC_API_KEYS.length;
					for (let i = 0; i < diff; i++) {
						ANTHROPIC_API_KEYS.push('');
					}
				}
			}

			if (ANTHROPIC_API_BASE_URLS.length === 0) {
				ENABLE_ANTHROPIC_API = false;
				toast.info($i18n.t('Anthropic API disabled'));
			}

			const res = await updateAnthropicConfig(localStorage.token, {
				ENABLE_ANTHROPIC_API: ENABLE_ANTHROPIC_API,
				ANTHROPIC_API_BASE_URLS: ANTHROPIC_API_BASE_URLS,
				ANTHROPIC_API_KEYS: ANTHROPIC_API_KEYS,
				ANTHROPIC_API_CONFIGS: ANTHROPIC_API_CONFIGS,
				ANTHROPIC_MODELS: []
			}).catch((error) => {
				toast.error(error);
			});

			if (res) {
				toast.success($i18n.t('Anthropic API settings updated'));
				await models.set(await getModels());
			}
		}
	};

	const addOpenAIConnectionHandler = async (connection) => {
		OPENAI_API_BASE_URLS = [...OPENAI_API_BASE_URLS, connection.url];
		OPENAI_API_KEYS = [...OPENAI_API_KEYS, connection.key];
		OPENAI_API_CONFIGS[connection.url] = connection.config;

		await updateOpenAIHandler();
	};

	const addOllamaConnectionHandler = async (connection) => {
		OLLAMA_BASE_URLS = [...OLLAMA_BASE_URLS, connection.url];
		OLLAMA_API_CONFIGS[connection.url] = connection.config;

		await updateOllamaHandler();
	};

	const addGoogleConnectionHandler = async (connection) => {
		GOOGLE_API_BASE_URLS = [...GOOGLE_API_BASE_URLS, connection.url];
		GOOGLE_API_KEYS = [...GOOGLE_API_KEYS, connection.key];
		GOOGLE_API_CONFIGS[connection.url] = connection.config;

		await updateGoogleHandler();
	};

	const addAnthropicConnectionHandler = async (connection) => {
		ANTHROPIC_API_BASE_URLS = [...ANTHROPIC_API_BASE_URLS, connection.url];
		ANTHROPIC_API_KEYS = [...ANTHROPIC_API_KEYS, connection.key];
		ANTHROPIC_API_CONFIGS[connection.url] = connection.config;

		await updateAnthropicHandler();
	};

	onMount(async () => {
		if ($user.role === 'admin') {
			let ollamaConfig = {};
			let openaiConfig = {};
			let anthropicConfig = {};
			let googleConfig = {};

			await Promise.all([
				(async () => {
					ollamaConfig = await getOllamaConfig(localStorage.token);
				})(),
				(async () => {
					openaiConfig = await getOpenAIConfig(localStorage.token);
				})(),
				(async () => {
					anthropicConfig = await getAnthropicConfig(localStorage.token);
				})(),
				(async () => {
					googleConfig = await getGoogleConfig(localStorage.token);
				})()
			]);

			ENABLE_OPENAI_API = openaiConfig.ENABLE_OPENAI_API;
			ENABLE_OLLAMA_API = ollamaConfig.ENABLE_OLLAMA_API;
			ENABLE_ANTHROPIC_API = anthropicConfig.ENABLE_ANTHROPIC_API;
			ENABLE_GOOGLE_API = googleConfig.ENABLE_GOOGLE_API;

			OPENAI_API_BASE_URLS = openaiConfig.OPENAI_API_BASE_URLS || [''];
			OPENAI_API_KEYS = openaiConfig.OPENAI_API_KEYS || [''];
			OPENAI_API_CONFIGS = openaiConfig.OPENAI_API_CONFIGS || {};

			GOOGLE_API_BASE_URLS = googleConfig.GOOGLE_API_BASE_URLS || [''];
			GOOGLE_API_KEYS = googleConfig.GOOGLE_API_KEYS || [''];
			GOOGLE_API_CONFIGS = googleConfig.GOOGLE_API_CONFIGS || {};

			OLLAMA_BASE_URLS = ollamaConfig.OLLAMA_BASE_URLS || [''];
			OLLAMA_API_CONFIGS = ollamaConfig.OLLAMA_API_CONFIGS || {};

			ANTHROPIC_API_BASE_URLS = anthropicConfig.ANTHROPIC_API_BASE_URLS || [''];
			ANTHROPIC_API_KEYS = anthropicConfig.ANTHROPIC_API_KEYS || [''];
			ANTHROPIC_API_CONFIGS = anthropicConfig.ANTHROPIC_API_CONFIGS || {};

			if (ENABLE_OPENAI_API) {
				for (const url of OPENAI_API_BASE_URLS) {
					if (!OPENAI_API_CONFIGS[url]) {
						OPENAI_API_CONFIGS[url] = {};
					}
				}

				OPENAI_API_BASE_URLS.forEach(async (url, idx) => {
					OPENAI_API_CONFIGS[url] = OPENAI_API_CONFIGS[url] || {};
					if (!(OPENAI_API_CONFIGS[url]?.enable ?? true)) {
						return;
					}
					const res = await getOpenAIModels(localStorage.token, idx);
					if (res.pipelines) {
						pipelineUrls[url] = true;
					}
				});
			}

			if (ENABLE_OLLAMA_API) {
				for (const url of OLLAMA_BASE_URLS) {
					if (!OLLAMA_API_CONFIGS[url]) {
						OLLAMA_API_CONFIGS[url] = {};
					}
				}
			}

			if (ENABLE_ANTHROPIC_API) {
				for (const url of ANTHROPIC_API_BASE_URLS) {
					if (!ANTHROPIC_API_CONFIGS[url]) {
						ANTHROPIC_API_CONFIGS[url] = {};
					}
				}
			}

			if (ENABLE_GOOGLE_API) {
				for (const url of GOOGLE_API_BASE_URLS) {
					if (!GOOGLE_API_CONFIGS[url]) {
						GOOGLE_API_CONFIGS[url] = {};
					}
				}
			}
		}
	});
</script>

<AddConnectionModal
	bind:show={showAddOpenAIConnectionModal}
	onSubmit={addOpenAIConnectionHandler}
/>

<AddConnectionModal
	bind:show={showAddOllamaConnectionModal}
	ollama
	onSubmit={addOllamaConnectionHandler}
/>

<AddConnectionModal
	bind:show={showAddAnthropicConnectionModal}
	anthropic
	onSubmit={addAnthropicConnectionHandler}
/>

<AddConnectionModal
	bind:show={showAddGoogleConnectionModal}
	google
	onSubmit={addGoogleConnectionHandler}
/>

<form
	class="flex flex-col h-full justify-between text-sm"
	on:submit|preventDefault={() => {
		updateOpenAIHandler();
		updateOllamaHandler();
		updateAnthropicHandler();
		updateGoogleHandler();
		dispatch('save');
	}}
>
	<div class=" overflow-y-scroll scrollbar-hidden h-full">
		{#if ENABLE_OPENAI_API !== null || ENABLE_OLLAMA_API !== null || ENABLE_ANTHROPIC_API !== null || ENABLE_GOOGLE_API !== null}
			<div class="my-2">
				<div class="mt-2 space-y-2 pr-1.5">
					<div class="flex justify-between items-center text-sm">
						<div class="  font-medium">{$i18n.t('OpenAI API')}</div>

						<div class="flex items-center">
							<div class="">
								<Switch
									bind:state={ENABLE_OPENAI_API}
									on:change={async () => {
										updateOpenAIHandler();
									}}
								/>
							</div>
						</div>
					</div>

					{#if ENABLE_OPENAI_API}
						<hr class=" border-gray-50 dark:border-gray-850" />

						<div class="">
							<div class="flex justify-between items-center">
								<div class="font-medium">{$i18n.t('Manage OpenAI API Connections')}</div>

								<Tooltip content={$i18n.t(`Add Connection`)}>
									<button
										class="px-1"
										on:click={() => {
											showAddOpenAIConnectionModal = true;
										}}
										type="button"
									>
										<Plus />
									</button>
								</Tooltip>
							</div>

							<div class="flex flex-col gap-1.5 mt-1.5">
								{#each OPENAI_API_BASE_URLS as url, idx}
									<OpenAIConnection
										pipeline={pipelineUrls[url] ? true : false}
										bind:url
										bind:key={OPENAI_API_KEYS[idx]}
										bind:config={OPENAI_API_CONFIGS[url]}
										onSubmit={() => {
											updateOpenAIHandler();
										}}
										onDelete={() => {
											OPENAI_API_BASE_URLS = OPENAI_API_BASE_URLS.filter(
												(url, urlIdx) => idx !== urlIdx
											);
											OPENAI_API_KEYS = OPENAI_API_KEYS.filter((key, keyIdx) => idx !== keyIdx);
										}}
									/>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<hr class=" border-gray-50 dark:border-gray-850" />

			<div class="pr-1.5 my-2">
				<div class="flex justify-between items-center text-sm mb-2">
					<div class="  font-medium">{$i18n.t('Ollama API')}</div>

					<div class="mt-1">
						<Switch
							bind:state={ENABLE_OLLAMA_API}
							on:change={async () => {
								updateOllamaHandler();
							}}
						/>
					</div>
				</div>

				{#if ENABLE_OLLAMA_API}
					<hr class=" border-gray-50 dark:border-gray-850 my-2" />

					<div class="">
						<div class="flex justify-between items-center">
							<div class="font-medium">{$i18n.t('Manage Ollama API Connections')}</div>

							<Tooltip content={$i18n.t(`Add Connection`)}>
								<button
									class="px-1"
									on:click={() => {
										showAddOllamaConnectionModal = true;
									}}
									type="button"
								>
									<Plus />
								</button>
							</Tooltip>
						</div>

						<div class="flex w-full gap-1.5">
							<div class="flex-1 flex flex-col gap-1.5 mt-1.5">
								{#each OLLAMA_BASE_URLS as url, idx}
									<OllamaConnection
										bind:url
										bind:config={OLLAMA_API_CONFIGS[url]}
										{idx}
										onSubmit={() => {
											updateOllamaHandler();
										}}
										onDelete={() => {
											OLLAMA_BASE_URLS = OLLAMA_BASE_URLS.filter((url, urlIdx) => idx !== urlIdx);
										}}
									/>
								{/each}
							</div>
						</div>

						<div class="mt-1 text-xs text-gray-400 dark:text-gray-500">
							{$i18n.t('Trouble accessing Ollama?')}
							<a
								class=" text-gray-300 font-medium underline"
								href="https://github.com/open-webui/open-webui#troubleshooting"
								target="_blank"
							>
								{$i18n.t('Click here for help.')}
							</a>
						</div>
					</div>
				{/if}
			</div>

			<hr class=" border-gray-50 dark:border-gray-850" />

			<div class="pr-1.5 my-2">
				<div class="flex justify-between items-center text-sm mb-2">
					<div class="  font-medium">{$i18n.t('Anthropic API')}</div>

					<div class="mt-1">
						<Switch
							bind:state={ENABLE_ANTHROPIC_API}
							on:change={async () => {
								updateAnthropicHandler();
							}}
						/>
					</div>
				</div>

				{#if ENABLE_ANTHROPIC_API}
					<hr class=" border-gray-50 dark:border-gray-850 my-2" />

					<div class="">
						<div class="flex justify-between items-center">
							<div class="font-medium">{$i18n.t('Manage Anthropic API Connections')}</div>

							<Tooltip content={$i18n.t(`Add Connection`)}>
								<button
									class="px-1"
									on:click={() => {
										showAddAnthropicConnectionModal = true;
									}}
									type="button"
								>
									<Plus />
								</button>
							</Tooltip>
						</div>

						<div class="flex w-full gap-1.5">
							<div class="flex-1 flex flex-col gap-1.5 mt-1.5">
								{#each ANTHROPIC_API_BASE_URLS as url, idx}
									<AnthropicConnection
										bind:url
										bind:key={ANTHROPIC_API_KEYS[idx]}
										bind:config={ANTHROPIC_API_CONFIGS[url]}
										onSubmit={() => {
											updateAnthropicHandler();
										}}
										onDelete={() => {
											ANTHROPIC_API_BASE_URLS = ANTHROPIC_API_BASE_URLS.filter((url, urlIdx) => idx !== urlIdx);
											ANTHROPIC_API_KEYS = ANTHROPIC_API_KEYS.filter((key, keyIdx) => idx !== keyIdx);
										}}
									/>
								{/each}
							</div>
						</div>

						<div class="mt-1 text-xs text-gray-400 dark:text-gray-500">
							{$i18n.t('Trouble accessing Anthropic?')}
							<a
								class=" text-gray-300 font-medium underline"
								href="https://github.com/open-webui/open-webui#troubleshooting"
								target="_blank"
							>
								{$i18n.t('Click here for help.')}
							</a>
						</div>
					</div>
				{/if}

				<div class="pr-1.5 my-2">
					<div class="flex justify-between items-center text-sm mb-2">
						<div class="  font-medium">{$i18n.t('Google API')}</div>
	
						<div class="mt-1">
							<Switch
								bind:state={ENABLE_GOOGLE_API}
								on:change={async () => {
									updateGoogleHandler();
								}}
							/>
						</div>
					</div>
	
					{#if ENABLE_GOOGLE_API}
						<hr class=" border-gray-50 dark:border-gray-850 my-2" />
	
						<div class="">
							<div class="flex justify-between items-center">
								<div class="font-medium">{$i18n.t('Manage Google API Connections')}</div>
	
								<Tooltip content={$i18n.t(`Add Connection`)}>
									<button
										class="px-1"
										on:click={() => {
											showAddGoogleConnectionModal = true;
										}}
										type="button"
									>
										<Plus />
									</button>
								</Tooltip>
							</div>
	
							<div class="flex w-full gap-1.5">
								<div class="flex-1 flex flex-col gap-1.5 mt-1.5">
									{#each GOOGLE_API_BASE_URLS as url, idx}
										<GoogleConnection
											bind:url
											bind:key={GOOGLE_API_KEYS[idx]}
											bind:config={GOOGLE_API_CONFIGS[url]}
											onSubmit={() => {
												updateGoogleHandler();
											}}
											onDelete={() => {
												GOOGLE_API_BASE_URLS = GOOGLE_API_BASE_URLS.filter((url, urlIdx) => idx !== urlIdx);
												GOOGLE_API_KEYS = GOOGLE_API_KEYS.filter((key, keyIdx) => idx !== keyIdx);
											}}
										/>
									{/each}
								</div>
							</div>
	
							<div class="mt-1 text-xs text-gray-400 dark:text-gray-500">
								{$i18n.t('Trouble accessing Google?')}
								<a
									class=" text-gray-300 font-medium underline"
									href="https://github.com/open-webui/open-webui#troubleshooting"
									target="_blank"
								>
									{$i18n.t('Click here for help.')}
								</a>
							</div>
						</div>
					{/if}
				</div>
			</div>

		{:else}
			<div class="flex h-full justify-center">
				<div class="my-auto">
					<Spinner className="size-6" />
				</div>
			</div>
		{/if}
	</div>

	<div class="flex justify-end pt-3 text-sm font-medium">
		<button
			class="px-3.5 py-1.5 text-sm font-medium bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full"
			type="submit"
		>
			{$i18n.t('Save')}
		</button>
	</div>
</form>
