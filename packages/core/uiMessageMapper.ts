import type {UIMessage} from 'ai';
import type {Message} from './dto';

// Convert persisted message rows into UI SDK messages while tolerating legacy rows with missing roles.
export function toUiMessages(messages: Message[]): UIMessage[] {
    return messages.map((message) => {
        const parts: {type: 'text' | 'reasoning'; text: string}[] = [];

        if (message.text) {
            parts.push({type: 'text', text: message.text});
        }
        if (message.reasoning) {
            parts.push({type: 'reasoning', text: message.reasoning});
        }

        const metadata = message.modelIdentifier ? {modelId: message.modelIdentifier} : undefined;
        const base: UIMessage = {
            id: message.id,
            role: message.role ?? 'user',
            parts,
        };

        return metadata ? {...base, metadata} : base;
    });
}
