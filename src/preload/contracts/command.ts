import type {
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
    CommandUpdateInput,
} from '../../../packages/core/dto';

export interface CommandApi {
    listAll(): Promise<CommandDefinition[]>;
    create(input: CommandCreateInput): Promise<CommandDefinition>;
    update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition>;
    delete(id: string): Promise<void>;
    execute(input: { input: string }): Promise<CommandExecution>;
}
