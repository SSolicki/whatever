import { processWeb, processYoutubeVideo } from '$lib/apis';
import { toast } from 'svelte-sonner';

export const uploadWeb = async (url: string, files: any[], setFiles: (files: any[]) => void): Promise<void> => {
    const fileItem = {
        type: 'doc',
        name: url,
        collection_name: '',
        status: 'uploading',
        url: url,
        error: ''
    };

    try {
        setFiles([...files, fileItem]);
        const res = await processWeb(localStorage.token, '', url);

        if (res) {
            fileItem.status = 'uploaded';
            fileItem.collection_name = res.collection_name;
            fileItem.file = {
                ...res.file,
                ...fileItem.file
            };

            setFiles([...files]);
        }
    } catch (e) {
        // Remove the failed doc from the files array
        setFiles(files.filter((f) => f.name !== url));
        toast.error(JSON.stringify(e));
    }
};

export const uploadYoutubeTranscription = async (url: string, files: any[], setFiles: (files: any[]) => void): Promise<void> => {
    const fileItem = {
        type: 'doc',
        name: url,
        collection_name: '',
        status: 'uploading',
        context: 'full',
        url: url,
        error: ''
    };

    try {
        setFiles([...files, fileItem]);
        const res = await processYoutubeVideo(localStorage.token, url);

        if (res) {
            fileItem.status = 'uploaded';
            fileItem.collection_name = res.collection_name;
            fileItem.file = {
                ...res.file,
                ...fileItem.file
            };
            setFiles([...files]);
        }
    } catch (e) {
        // Remove the failed doc from the files array
        setFiles(files.filter((f) => f.name !== url));
        toast.error(e);
    }
};

export const handleFileUpload = async (
    files: File[],
    chatFiles: any[],
    setChatFiles: (files: any[]) => void
): Promise<void> => {
    if (!files?.length) return;

    for (const file of files) {
        const fileItem = {
            type: file.type,
            name: file.name,
            collection_name: '',
            status: 'uploading',
            error: ''
        };

        try {
            setChatFiles([...chatFiles, fileItem]);

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/files', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                fileItem.status = 'uploaded';
                fileItem.collection_name = data.collection_name;
                fileItem.file = {
                    ...data.file,
                    ...fileItem.file
                };
                setChatFiles([...chatFiles]);
            } else {
                throw new Error('Failed to upload file');
            }
        } catch (e) {
            console.error('Error uploading file:', e);
            fileItem.status = 'error';
            fileItem.error = e.message;
            setChatFiles([...chatFiles]);
        }
    }
};

export const handleFileRemove = (
    file: any,
    chatFiles: any[],
    setChatFiles: (files: any[]) => void
): void => {
    setChatFiles(chatFiles.filter((f) => f.name !== file.name));
};

export const handleDrop = async (
    event: DragEvent,
    chatFiles: any[],
    setChatFiles: (files: any[]) => void,
    uploadWeb: (url: string) => Promise<void>
): Promise<void> => {
    event.preventDefault();

    const items = Array.from(event.dataTransfer.items);
    const files = [];

    for (const item of items) {
        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
                files.push(file);
            }
        } else if (item.kind === 'string' && item.type === 'text/plain') {
            item.getAsString(async (url) => {
                if (url.startsWith('http')) {
                    await uploadWeb(url);
                }
            });
        }
    }

    if (files.length > 0) {
        handleFileUpload(files, chatFiles, setChatFiles);
    }
};

export const handleDragOver = (event: DragEvent): void => {
    event.preventDefault();
};
