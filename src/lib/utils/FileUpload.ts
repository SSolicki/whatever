import { WEBUI_BASE_URL } from '$lib/constants';
import { toast } from 'svelte-sonner';

interface UploadResponse {
    success: boolean;
    fileId?: string;
    error?: string;
}

/**
 * Uploads a file to the server
 * @param file - The file to upload
 * @returns Promise with the upload response
 */
export const uploadFile = async (file: File): Promise<UploadResponse> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${WEBUI_BASE_URL}/api/v1/files/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }

        const data = await response.json();
        return {
            success: true,
            fileId: data.id
        };
    } catch (error) {
        console.error('Upload error:', error);
        toast.error('Upload failed: ' + error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Processes a web URL for chat context
 * @param url - The URL to process
 * @returns Promise with the processing response
 */
export const uploadWeb = async (url: string): Promise<UploadResponse> => {
    try {
        const response = await fetch(`${WEBUI_BASE_URL}/api/v1/retrieval/web`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.token}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Web processing failed');
        }

        const data = await response.json();
        return {
            success: true,
            fileId: data.id
        };
    } catch (error) {
        console.error('Web processing error:', error);
        toast.error('Web processing failed: ' + error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Processes a YouTube video URL for transcription
 * @param url - The YouTube video URL
 * @returns Promise with the processing response
 */
export const uploadYoutubeTranscription = async (url: string): Promise<UploadResponse> => {
    try {
        const response = await fetch(`${WEBUI_BASE_URL}/api/v1/retrieval/youtube`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.token}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'YouTube processing failed');
        }

        const data = await response.json();
        return {
            success: true,
            fileId: data.id
        };
    } catch (error) {
        console.error('YouTube processing error:', error);
        toast.error('YouTube processing failed: ' + error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
