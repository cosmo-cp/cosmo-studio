/** Coordinates exclusive streaming and deletion of each conversation. */
export class ChatRunRegistry {
    private readonly runs = new Map<
        string,
        { controller: AbortController; finished: Promise<void>; resolve: () => void }
    >();
    private readonly deleting = new Set<string>();

    // Reserve a conversation before any asynchronous work can start.
    public start(chatId: string): AbortController | null {
        if (this.runs.has(chatId) || this.deleting.has(chatId)) return null;
        const controller = new AbortController();
        let resolve!: () => void;
        const finished = new Promise<void>((done) => {
            resolve = done;
        });
        this.runs.set(chatId, { controller: controller, finished: finished, resolve: resolve });
        return controller;
    }

    // A late completion must never remove a newer run's reservation.
    public finish(chatId: string, controller: AbortController): void {
        const run = this.runs.get(chatId);
        if (run?.controller === controller) {
            this.runs.delete(chatId);
            run.resolve();
        }
    }

    // Stop an active run and hold the chat exclusively until deletion finishes.
    public async deleteChat(chatId: string, remove: () => Promise<void>): Promise<void> {
        if (this.deleting.has(chatId)) throw new Error('Chat deletion is already in progress');
        this.deleting.add(chatId);
        try {
            const run = this.runs.get(chatId);
            if (run) {
                run.controller.abort();
                let timer: ReturnType<typeof setTimeout> | undefined;
                try {
                    await Promise.race([
                        run.finished,
                        new Promise<never>((_resolve, reject) => {
                            timer = setTimeout(() => {
                                return reject(new Error('Timed out waiting for the chat response to stop'));
                            }, 30000);
                        }),
                    ]);
                } finally {
                    if (timer) clearTimeout(timer);
                }
            }
            await remove();
        } finally {
            this.deleting.delete(chatId);
        }
    }
}
