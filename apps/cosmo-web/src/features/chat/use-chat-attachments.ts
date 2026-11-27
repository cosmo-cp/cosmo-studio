import type { FileUIPart } from 'ai';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';

type ChatAttachment = FileUIPart & { id: string };

// Keep attachment URLs alive while composing, and release them on removal or unmount.
export function useChatAttachments() {
    const [files, setFiles] = useState<ChatAttachment[]>([]);
    const filesRef = useRef<ChatAttachment[]>([]);
    const add = useCallback((incoming: File[] | FileList) => {
        const added: ChatAttachment[] = Array.from(incoming, (file) => ({
            id: nanoid(),
            type: 'file',
            filename: file.name,
            mediaType: file.type,
            url: URL.createObjectURL(file),
        }));
        filesRef.current = [...filesRef.current, ...added];
        setFiles(filesRef.current);
    }, []);
    const remove = useCallback((id: string) => {
        const file = filesRef.current.find((item) => item.id === id);
        if (file) URL.revokeObjectURL(file.url);
        filesRef.current = filesRef.current.filter((item) => item.id !== id);
        setFiles(filesRef.current);
    }, []);
    const clear = useCallback(() => {
        filesRef.current.forEach((file) => URL.revokeObjectURL(file.url));
        filesRef.current = [];
        setFiles([]);
    }, []);
    useEffect(
        () => () => {
            filesRef.current.forEach((file) => URL.revokeObjectURL(file.url));
        },
        [],
    );
    useEffect(() => {
        const dragOver = (event: DragEvent) => {
            if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
        };
        const drop = (event: DragEvent) => {
            if (event.dataTransfer?.files.length) {
                event.preventDefault();
                add(event.dataTransfer.files);
            }
        };
        document.addEventListener('dragover', dragOver);
        document.addEventListener('drop', drop);
        return () => {
            document.removeEventListener('dragover', dragOver);
            document.removeEventListener('drop', drop);
        };
    }, [add]);
    return { files, add, remove, clear };
}

// Persist file contents before their temporary object URLs are revoked.
export async function serializeChatAttachments(files: ChatAttachment[]): Promise<FileUIPart[]> {
    return Promise.all(
        files.map(async ({ id, ...file }) => {
            void id;
            const blob = await fetch(file.url).then((response) => response.blob());
            const url = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            });
            return { ...file, url };
        }),
    );
}
