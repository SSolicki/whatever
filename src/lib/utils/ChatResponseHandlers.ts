    import { v4 as uuidv4 } from 'uuid';
import { toast } from 'svelte-sonner';

import { getContext, onDestroy, onMount, tick } from 'svelte';
import { initChatHandler } from '$lib/utils/ChatLogicHandlers';
import { get, type Writable } from 'svelte/store';
import { WEBUI_BASE_URL } from '$lib/constants';

import {
    chats,
    currentChatPage
} from '$lib/stores';

import {
    copyToClipboard,
    getMessageContentParts,
    promptTemplate,
    splitStream
} from '$lib/utils';

import { generateChatCompletion } from '$lib/apis/ollama';
import {
    getChatList
} from '$lib/apis/chats';
import { generateOpenAIChatCompletion } from '$lib/apis/openai';
import { createOpenAITextStream } from '$lib/apis/streaming';
import { queryMemory } from '$lib/apis/memories';
import { getAndUpdateUserLocation } from '$lib/apis/users';

export const sendPrompt = async (
    prompt: string,
    parentId: string,
    { modelId = null, modelIdx = null, newChat = false } = {}
) => {
    // Create new chat if newChat is true and first user message
    if (
        newChat &&
        history.messages[history.currentId].parentId === null &&
        history.messages[history.currentId].role === 'user'
    ) {
        await initChatHandler();
    }

    let _responses: string[] = [];
    // If modelId is provided, use it, else use selected model
    let selectedModelIds = modelId
        ? [modelId]
        : atSelectedModel !== undefined
            ? [atSelectedModel.id]
            : selectedModels;

    // Create response messages for each selected model
    const responseMessageIds: Record<PropertyKey, string> = {};
    for (const [_modelIdx, modelId] of selectedModelIds.entries()) {
        const model = $models.filter((m) => m.id === modelId).at(0);

        if (model) {
            let responseMessageId = uuidv4();
            let responseMessage = {
                parentId: parentId,
                id: responseMessageId,
                childrenIds: [],
                role: 'assistant',
                content: '',
                model: model.id,
                modelName: model.name ?? model.id,
                modelIdx: modelIdx ? modelIdx : _modelIdx,
                userContext: null,
                timestamp: Math.floor(Date.now() / 1000) // Unix epoch
            };

            // Add message to history and Set currentId to messageId
            history.messages[responseMessageId] = responseMessage;
            history.currentId = responseMessageId;

            // Append messageId to childrenIds of parent message
            if (parentId !== null) {
                history.messages[parentId].childrenIds = [
                    ...history.messages[parentId].childrenIds,
                    responseMessageId
                ];
            }

            responseMessageIds[`${modelId}-${modelIdx ? modelIdx : _modelIdx}`] = responseMessageId;
        }
    }
    await tick();

    const _chatId = JSON.parse(JSON.stringify($chatId));
    await Promise.all(
        selectedModelIds.map(async (modelId, _modelIdx) => {
            console.log('modelId', modelId);
            const model = $models.filter((m) => m.id === modelId).at(0);

            if (model) {
                const messages = createMessagesList(parentId);
                // If there are image files, check if model is vision capable
                const hasImages = messages.some((message) =>
                    message.files?.some((file) => file.type === 'image')
                );

                if (hasImages && !(model.info?.meta?.capabilities?.vision ?? true)) {
                    toast.error(
                        $i18n.t('Model {{modelName}} is not vision capable', {
                            modelName: model.name ?? model.id
                        })
                    );
                }

                let responseMessageId =
                    responseMessageIds[`${modelId}-${modelIdx ? modelIdx : _modelIdx}`];
                let responseMessage = history.messages[responseMessageId];

                let userContext = null;
                if ($settings?.memory ?? false) {
                    if (userContext === null) {
                        const res = await queryMemory(localStorage.token, prompt).catch((error) => {
                            toast.error(error);
                            return null;
                        });
                        if (res) {
                            if (res.documents[0].length > 0) {
                                userContext = res.documents[0].reduce((acc, doc, index) => {
                                    const createdAtTimestamp = res.metadatas[0][index].created_at;
                                    const createdAtDate = new Date(createdAtTimestamp * 1000)
                                        .toISOString()
                                        .split('T')[0];
                                    return `${acc}${index + 1}. [${createdAtDate}]. ${doc}\n`;
                                }, '');
                            }

                            console.log(userContext);
                        }
                    }
                }
                responseMessage.userContext = userContext;

                const chatEventEmitter = await getChatEventEmitter(model.id, _chatId);

                scrollToBottom();
                if (webSearchEnabled) {
                    await getWebSearchResults(model.id, parentId, responseMessageId);
                }

                let _response = null;
                if (model?.owned_by === 'ollama') {
                    _response = await sendPromptOllama(model, prompt, responseMessageId, _chatId);
                } else if (model) {
                    _response = await sendPromptOpenAI(model, prompt, responseMessageId, _chatId);
                }
                _responses.push(_response);

                if (chatEventEmitter) clearInterval(chatEventEmitter);
            } else {
                toast.error($i18n.t(`Model {{modelId}} not found`, { modelId }));
            }
        })
    );

    currentChatPage.set(1);
    chats.set(await getChatList(localStorage.token, $currentChatPage));

    return _responses;
};

export const sendPromptOllama = async (model, userPrompt, responseMessageId, _chatId) => {
    let _response: string | null = null;

    const responseMessage = history.messages[responseMessageId];
    const userMessage = history.messages[responseMessage.parentId];

    // Wait until history/message have been updated
    await tick();

    // Scroll down
    scrollToBottom();

    const messagesBody = [
        params?.system || $settings.system || (responseMessage?.userContext ?? null)
            ? {
                    role: 'system',
                    content: `${promptTemplate(
                        params?.system ?? $settings?.system ?? '',
                        $user.name,
                        $settings?.userLocation
                            ? await getAndUpdateUserLocation(localStorage.token)
                            : undefined
                    )}${
                        (responseMessage?.userContext ?? null)
                            ? `\n\nUser Context:\n${responseMessage?.userContext ?? ''}`
                            : ''
                    }`
                }
            : undefined,
        ...createMessagesList(responseMessageId)
    ]
        .filter((message) => message?.content?.trim())
        .map((message) => {
            // Prepare the base message object
            const baseMessage = {
                role: message.role,
                content: message?.merged?.content ?? message.content
            };

            // Extract and format image URLs if any exist
            const imageUrls = message.files
                ?.filter((file) => file.type === 'image')
                .map((file) => file.url.slice(file.url.indexOf(',') + 1));

            // Add images array only if it contains elements
            if (imageUrls && imageUrls.length > 0 && message.role === 'user') {
                baseMessage.images = imageUrls;
            }
            return baseMessage;
        });

    let lastImageIndex = -1;

    // Find the index of the last object with images
    messagesBody.forEach((item, index) => {
        if (item.images) {
            lastImageIndex = index;
        }
    });

    // Remove images from all but the last one
    messagesBody.forEach((item, index) => {
        if (index !== lastImageIndex) {
            delete item.images;
        }
    });

    let files = JSON.parse(JSON.stringify(chatFiles));
    if (model?.info?.meta?.knowledge ?? false) {
        // Only initialize and add status if knowledge exists
        responseMessage.statusHistory = [
            {
                action: 'knowledge_search',
                description: $i18n.t(`Searching Knowledge for "{{searchQuery}}"`, {
                    searchQuery: userMessage.content
                }),
                done: false
            }
        ];
        files.push(
            ...model.info.meta.knowledge.map((item) => {
                if (item?.collection_name) {
                    return {
                        id: item.collection_name,
                        name: item.name,
                        legacy: true
                    };
                } else if (item?.collection_names) {
                    return {
                        name: item.name,
                        type: 'collection',
                        collection_names: item.collection_names,
                        legacy: true
                    };
                } else {
                    return item;
                }
            })
        );
        history.messages[responseMessageId] = responseMessage;
    }
    files.push(
        ...(userMessage?.files ?? []).filter((item) =>
            ['doc', 'file', 'collection'].includes(item.type)
        ),
        ...(responseMessage?.files ?? []).filter((item) => ['web_search_results'].includes(item.type))
    );

    // Remove duplicates
    files = files.filter(
        (item, index, array) =>
            array.findIndex((i) => JSON.stringify(i) === JSON.stringify(item)) === index
    );

    scrollToBottom();

    eventTarget.dispatchEvent(
        new CustomEvent('chat:start', {
            detail: {
                id: responseMessageId
            }
        })
    );

    await tick();

    const stream =
        model?.info?.params?.stream_response ??
        $settings?.params?.stream_response ??
        params?.stream_response ??
        true;
    const [res, controller] = await generateChatCompletion(localStorage.token, {
        stream: stream,
        model: model.id,
        messages: messagesBody,
        options: {
            ...{ ...($settings?.params ?? {}), ...params },
            stop:
                (params?.stop ?? $settings?.params?.stop ?? undefined)
                    ? (params?.stop.split(',').map((token) => token.trim()) ?? $settings.params.stop).map(
                            (str) => decodeURIComponent(JSON.parse('"' + str.replace(/\"/g, '\\"') + '"'))
                        )
                    : undefined,
            num_predict: params?.max_tokens ?? $settings?.params?.max_tokens ?? undefined,
            repeat_penalty:
                params?.frequency_penalty ?? $settings?.params?.frequency_penalty ?? undefined
        },
        format: $settings.requestFormat ?? undefined,
        keep_alive: $settings.keepAlive ?? undefined,
        tool_ids: selectedToolIds.length > 0 ? selectedToolIds : undefined,
        files: files.length > 0 ? files : undefined,
        session_id: $socket?.id,
        chat_id: $chatId,
        id: responseMessageId
    });

    if (res && res.ok) {
        if (!stream) {
            const response = await res.json();
            console.log(response);

            responseMessage.content = response.message.content;
            responseMessage.info = {
                eval_count: response.eval_count,
                eval_duration: response.eval_duration,
                load_duration: response.load_duration,
                prompt_eval_count: response.prompt_eval_count,
                prompt_eval_duration: response.prompt_eval_duration,
                total_duration: response.total_duration
            };
            responseMessage.done = true;
        } else {
            console.log('controller', controller);

            const reader = res.body
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(splitStream('\n'))
                .getReader();

            while (true) {
                const { value, done } = await reader.read();
                if (done || stopResponseFlag || _chatId !== $chatId) {
                    responseMessage.done = true;
                    history.messages[responseMessageId] = responseMessage;

                    if (stopResponseFlag) {
                        controller.abort('User: Stop Response');
                    }

                    _response = responseMessage.content;
                    break;
                }

                try {
                    let lines = value.split('\n');

                    for (const line of lines) {
                        if (line !== '') {
                            console.log(line);
                            let data = JSON.parse(line);

                            if ('sources' in data) {
                                responseMessage.sources = data.sources;
                                // Only remove status if it was initially set
                                if (model?.info?.meta?.knowledge ?? false) {
                                    responseMessage.statusHistory = responseMessage.statusHistory.filter(
                                        (status) => status.action !== 'knowledge_search'
                                    );
                                }
                                continue;
                            }

                            if ('detail' in data) {
                                throw data;
                            }

                            if (data.done == false) {
                                if (responseMessage.content == '' && data.message.content == '\n') {
                                    continue;
                                } else {
                                    responseMessage.content += data.message.content;

                                    if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
                                        navigator.vibrate(5);
                                    }

                                    const messageContentParts = getMessageContentParts(
                                        responseMessage.content,
                                        $config?.audio?.tts?.split_on ?? 'punctuation'
                                    );
                                    messageContentParts.pop();

                                    // dispatch only last sentence and make sure it hasn't been dispatched before
                                    if (
                                        messageContentParts.length > 0 &&
                                        messageContentParts[messageContentParts.length - 1] !==
                                            responseMessage.lastSentence
                                    ) {
                                        responseMessage.lastSentence =
                                            messageContentParts[messageContentParts.length - 1];
                                        eventTarget.dispatchEvent(
                                            new CustomEvent('chat', {
                                                detail: {
                                                    id: responseMessageId,
                                                    content: messageContentParts[messageContentParts.length - 1]
                                                }
                                            })
                                        );
                                    }

                                    history.messages[responseMessageId] = responseMessage;
                                }
                            } else {
                                responseMessage.done = true;

                                if (responseMessage.content == '') {
                                    responseMessage.error = {
                                        code: 400,
                                        content: `Oops! No text generated from Ollama, Please try again.`
                                    };
                                }

                                responseMessage.context = data.context ?? null;
                                responseMessage.info = {
                                    total_duration: data.total_duration,
                                    load_duration: data.load_duration,
                                    sample_count: data.sample_count,
                                    sample_duration: data.sample_duration,
                                    prompt_eval_count: data.prompt_eval_count,
                                    prompt_eval_duration: data.prompt_eval_duration,
                                    eval_count: data.eval_count,
                                    eval_duration: data.eval_duration
                                };

                                history.messages[responseMessageId] = responseMessage;

                                if ($settings.notificationEnabled && !document.hasFocus()) {
                                    const notification = new Notification(`${model.id}`, {
                                        body: responseMessage.content,
                                        icon: `${WEBUI_BASE_URL}/static/favicon.png`
                                    });
                                }

                                if ($settings?.responseAutoCopy ?? false) {
                                    copyToClipboard(responseMessage.content);
                                }

                                if ($settings.responseAutoPlayback && !$showCallOverlay) {
                                    await tick();
                                    document.getElementById(`speak-button-${responseMessage.id}`)?.click();
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.log(error);
                    if ('detail' in error) {
                        toast.error(error.detail);
                    }
                    break;
                }

                if (autoScroll) {
                    scrollToBottom();
                }
            }
        }
    } else {
        if (res !== null) {
            const error = await res.json();
            console.log(error);
            if ('detail' in error) {
                toast.error(error.detail);
                responseMessage.error = { content: error.detail };
            } else {
                toast.error(error.error);
                responseMessage.error = { content: error.error };
            }
        } else {
            toast.error(
                $i18n.t(`Uh-oh! There was an issue connecting to {{provider}}.`, { provider: 'Ollama' })
            );
            responseMessage.error = {
                content: $i18n.t(`Uh-oh! There was an issue connecting to {{provider}}.`, {
                    provider: 'Ollama'
                })
            };
        }
        responseMessage.done = true;

        if (responseMessage.statusHistory) {
            responseMessage.statusHistory = responseMessage.statusHistory.filter(
                (status) => status.action !== 'knowledge_search'
            );
        }
    }
    await saveChatHandler(_chatId);

    history.messages[responseMessageId] = responseMessage;

    await chatCompletedHandler(
        _chatId,
        model.id,
        responseMessageId,
        createMessagesList(responseMessageId)
    );

    stopResponseFlag = false;
    await tick();

    let lastMessageContentPart =
        getMessageContentParts(
            responseMessage.content,
            $config?.audio?.tts?.split_on ?? 'punctuation'
        )?.at(-1) ?? '';
    if (lastMessageContentPart) {
        eventTarget.dispatchEvent(
            new CustomEvent('chat', {
                detail: { id: responseMessageId, content: lastMessageContentPart }
            })
        );
    }

    eventTarget.dispatchEvent(
        new CustomEvent('chat:finish', {
            detail: {
                id: responseMessageId,
                content: responseMessage.content
            }
        })
    );

    if (autoScroll) {
        scrollToBottom();
    }

    const messages = createMessagesList(responseMessageId);
    if (messages.length == 2 && messages.at(-1).content !== '' && selectedModels[0] === model.id) {
        window.history.replaceState(history.state, '', `/c/${_chatId}`);

        const title = await generateChatTitle(messages);
        await setChatTitle(_chatId, title);

        if ($settings?.autoTags ?? true) {
            await setChatTags(messages);
        }
    }

    return _response;
};

export const sendPromptOpenAI = async (model, userPrompt, responseMessageId, _chatId) => {
    let _response = null;

    const responseMessage = history.messages[responseMessageId];
    const userMessage = history.messages[responseMessage.parentId];

    let files = JSON.parse(JSON.stringify(chatFiles));
    if (model?.info?.meta?.knowledge ?? false) {
        // Only initialize and add status if knowledge exists
        responseMessage.statusHistory = [
            {
                action: 'knowledge_search',
                description: $i18n.t(`Searching Knowledge for "{{searchQuery}}"`, {
                    searchQuery: userMessage.content
                }),
                done: false
            }
        ];
        files.push(
            ...model.info.meta.knowledge.map((item) => {
                if (item?.collection_name) {
                    return {
                        id: item.collection_name,
                        name: item.name,
                        legacy: true
                    };
                } else if (item?.collection_names) {
                    return {
                        name: item.name,
                        type: 'collection',
                        collection_names: item.collection_names,
                        legacy: true
                    };
                } else {
                    return item;
                }
            })
        );
        history.messages[responseMessageId] = responseMessage;
    }
    files.push(
        ...(userMessage?.files ?? []).filter((item) =>
            ['doc', 'file', 'collection'].includes(item.type)
        ),
        ...(responseMessage?.files ?? []).filter((item) => ['web_search_results'].includes(item.type))
    );
    // Remove duplicates
    files = files.filter(
        (item, index, array) =>
            array.findIndex((i) => JSON.stringify(i) === JSON.stringify(item)) === index
    );

    scrollToBottom();

    eventTarget.dispatchEvent(
        new CustomEvent('chat:start', {
            detail: {
                id: responseMessageId
            }
        })
    );
    await tick();

    try {
        const stream =
            model?.info?.params?.stream_response ??
            $settings?.params?.stream_response ??
            params?.stream_response ??
            true;

        const [res, controller] = await generateOpenAIChatCompletion(
            localStorage.token,
            {
                stream: stream,
                model: model.id,
                ...(stream && (model.info?.meta?.capabilities?.usage ?? false)
                    ? {
                            stream_options: {
                                include_usage: true
                            }
                        }
                    : {}),
                messages: [
                    params?.system || $settings.system || (responseMessage?.userContext ?? null)
                        ? {
                                role: 'system',
                                content: `${promptTemplate(
                                    params?.system ?? $settings?.system ?? '',
                                    $user.name,
                                    $settings?.userLocation
                                        ? await getAndUpdateUserLocation(localStorage.token)
                                        : undefined
                                )}${
                                    (responseMessage?.userContext ?? null)
                                        ? `\n\nUser Context:\n${responseMessage?.userContext ?? ''}`
                                        : ''
                                }`
                            }
                        : undefined,
                    ...createMessagesList(responseMessageId)
                ]
                    .filter((message) => message?.content?.trim())
                    .map((message, idx, arr) => ({
                        role: message.role,
                        ...((message.files?.filter((file) => file.type === 'image').length > 0) &&
                        message.role === 'user'
                            ? {
                                images: message.files
                                    ?.filter((file) => file.type === 'image')
                                    .map((file) => file.url.slice(file.url.indexOf(',') + 1))
                            }
                            : {})
                    })),
                seed: params?.seed ?? $settings?.params?.seed ?? undefined,
                stop:
                    (params?.stop ?? $settings?.params?.stop ?? undefined)
                        ? (params?.stop.split(',').map((token) => token.trim()) ?? $settings.params.stop).map(
                                (str) => decodeURIComponent(JSON.parse('"' + str.replace(/\"/g, '\\"') + '"'))
                            )
                        : undefined,
                temperature: params?.temperature ?? $settings?.params?.temperature ?? undefined,
                top_p: params?.top_p ?? $settings?.params?.top_p ?? undefined,
                frequency_penalty:
                    params?.frequency_penalty ?? $settings?.params?.frequency_penalty ?? undefined,
                max_tokens: params?.max_tokens ?? $settings?.params?.max_tokens ?? undefined,
                tool_ids: selectedToolIds.length > 0 ? selectedToolIds : undefined,
                files: files.length > 0 ? files : undefined,
                session_id: $socket?.id,
                chat_id: $chatId,
                id: responseMessageId
            },
            `${WEBUI_BASE_URL}/api`
        );

        // Wait until history/message have been updated
        await tick();

        scrollToBottom();

        if (res && res.ok && res.body) {
            if (!stream) {
                const response = await res.json();
                console.log(response);

                responseMessage.content = response.choices[0].message.content;
                responseMessage.info = { ...response.usage, openai: true };
                responseMessage.done = true;
            } else {
                const textStream = await createOpenAITextStream(res.body, $settings.splitLargeChunks);

                for await (const update of textStream) {
                    const { value, done, sources, selectedModelId, error, usage } = update;
                    if (error) {
                        await handleOpenAIError(error, null, model, responseMessage);
                        break;
                    }
                    if (done || stopResponseFlag || _chatId !== $chatId) {
                        responseMessage.done = true;
                        history.messages[responseMessageId] = responseMessage;

                        if (stopResponseFlag) {
                            controller.abort('User: Stop Response');
                        }
                        _response = responseMessage.content;
                        break;
                    }

                    if (usage) {
                        responseMessage.info = { ...usage, openai: true, usage };
                    }

                    if (selectedModelId) {
                        responseMessage.selectedModelId = selectedModelId;
                        responseMessage.arena = true;
                        continue;
                    }

                    if (sources) {
                        responseMessage.sources = sources;
                        // Only remove status if it was initially set
                        if (model?.info?.meta?.knowledge ?? false) {
                            responseMessage.statusHistory = responseMessage.statusHistory.filter(
                                (status) => status.action !== 'knowledge_search'
                            );
                        }
                        continue;
                    }

                    if (responseMessage.content == '' && value == '\n') {
                        continue;
                    } else {
                        responseMessage.content += value;

                        if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
                            navigator.vibrate(5);
                        }

                        const messageContentParts = getMessageContentParts(
                            responseMessage.content,
                            $config?.audio?.tts?.split_on ?? 'punctuation'
                        );
                        messageContentParts.pop();

                        // dispatch only last sentence and make sure it hasn't been dispatched before
                        if (
                            messageContentParts.length > 0 &&
                            messageContentParts[messageContentParts.length - 1] !== responseMessage.lastSentence
                        ) {
                            responseMessage.lastSentence = messageContentParts[messageContentParts.length - 1];
                            eventTarget.dispatchEvent(
                                new CustomEvent('chat', {
                                    detail: {
                                        id: responseMessageId,
                                        content: messageContentParts[messageContentParts.length - 1]
                                    }
                                })
                            );
                        }

                        history.messages[responseMessageId] = responseMessage;
                    }

                    if (autoScroll) {
                        scrollToBottom();
                    }
                }
            }

            if ($settings.notificationEnabled && !document.hasFocus()) {
                const notification = new Notification(`${model.id}`, {
                    body: responseMessage.content,
                    icon: `${WEBUI_BASE_URL}/static/favicon.png`
                });
            }

            if ($settings.responseAutoCopy) {
                copyToClipboard(responseMessage.content);
            }

            if ($settings.responseAutoPlayback && !$showCallOverlay) {
                await tick();

                document.getElementById(`speak-button-${responseMessage.id}`)?.click();
            }
        } else {
            await handleOpenAIError(null, res, model, responseMessage);
        }
    } catch (error) {
        await handleOpenAIError(error, null, model, responseMessage);
    }

    await saveChatHandler(_chatId);

    history.messages[responseMessageId] = responseMessage;

    await chatCompletedHandler(
        _chatId,
        model.id,
        responseMessageId,
        createMessagesList(responseMessageId)
    );

    stopResponseFlag = false;
    await tick();

    let lastMessageContentPart =
        getMessageContentParts(
            responseMessage.content,
            $config?.audio?.tts?.split_on ?? 'punctuation'
        )?.at(-1) ?? '';
    if (lastMessageContentPart) {
        eventTarget.dispatchEvent(
            new CustomEvent('chat', {
                detail: { id: responseMessageId, content: lastMessageContentPart }
            })
        );
    }

    eventTarget.dispatchEvent(
        new CustomEvent('chat:finish', {
            detail: {
                id: responseMessageId,
                content: responseMessage.content
            }
        })
    );

    if (autoScroll) {
        scrollToBottom();
    }

    const messages = createMessagesList(responseMessageId);
    if (messages.length == 2 && selectedModels[0] === model.id) {
        window.history.replaceState(history.state, '', `/c/${_chatId}`);

        const title = await generateChatTitle(messages);
        await setChatTitle(_chatId, title);

        if ($settings?.autoTags ?? true) {
            await setChatTags(messages);
        }
    }

    return _response;
};

export const handleOpenAIError = async (error, res: Response | null, model, responseMessage) => {
    let errorMessage = '';
    let innerError;

    if (error) {
        innerError = error;
    } else if (res !== null) {
        innerError = await res.json();
    }
    console.error(innerError);
    if ('detail' in innerError) {
        toast.error(innerError.detail);
        errorMessage = innerError.detail;
    } else if ('error' in innerError) {
        if ('message' in innerError.error) {
            toast.error(innerError.error.message);
            errorMessage = innerError.error.message;
        } else {
            toast.error(innerError.error);
            errorMessage = innerError.error;
        }
    } else if ('message' in innerError) {
        toast.error(innerError.message);
        errorMessage = innerError.message;
    }

    responseMessage.error = {
        content:
            $i18n.t(`Uh-oh! There was an issue connecting to {{provider}}.`, {
                provider: model.name ?? model.id
            }) +
            '\n' +
            errorMessage
    };
    responseMessage.done = true;

    if (responseMessage.statusHistory) {
        responseMessage.statusHistory = responseMessage.statusHistory.filter(
            (status) => status.action !== 'knowledge_search'
        );
    }

    history.messages[responseMessage.id] = responseMessage;
};