import { inject, injectable } from 'inversify';
import { CORETYPES } from '../types/types';
import { McpServerRepository } from '../repositories/McpServerRepository';
import {
    HttpTransportConfig,
    McpServer,
    McpServerCreateInput,
    McpServerUpdateInput,
    SseTransportConfig,
    StdioTransportConfig,
} from '../dto';

const normalizeRequired = (value: string | null | undefined, field: string) => {
    if (!value || value.trim().length === 0) {
        throw new Error(`${field} is required.`);
    }

    return value.trim();
};

const validateTransportConfig = (transportType: string, config: unknown) => {
    if (!config || typeof config !== 'object') {
        throw new Error('Transport config is required and must be an object.');
    }

    switch (transportType) {
        case 'sse': {
            const sseConfig = config as SseTransportConfig;
            if (!sseConfig.url || typeof sseConfig.url !== 'string') {
                throw new Error('SSE transport requires a valid URL.');
            }
            break;
        }
        case 'http': {
            const httpConfig = config as HttpTransportConfig;
            if (!httpConfig.url || typeof httpConfig.url !== 'string') {
                throw new Error('HTTP transport requires a valid URL.');
            }
            break;
        }
        case 'stdio': {
            const stdioConfig = config as StdioTransportConfig;
            if (!stdioConfig.command || typeof stdioConfig.command !== 'string') {
                throw new Error('Stdio transport requires a valid command.');
            }
            if (stdioConfig.args && !Array.isArray(stdioConfig.args)) {
                throw new Error('Stdio transport args must be an array.');
            }
            if (stdioConfig.env && typeof stdioConfig.env !== 'object') {
                throw new Error('Stdio transport env must be an object.');
            }
            break;
        }
        default:
            throw new Error(`Invalid transport type: ${transportType}. Must be one of: sse, http, stdio.`);
    }
};

@injectable()
export class McpServerService {
    constructor(@inject(CORETYPES.McpServerRepository) private mcpServerRepository: McpServerRepository) {}

    public async getAll(): Promise<McpServer[]> {
        return this.mcpServerRepository.getAll();
    }

    public async getAllEnabled(): Promise<McpServer[]> {
        return this.mcpServerRepository.getAllEnabled();
    }

    public async getById(id: string): Promise<McpServer | undefined> {
        return this.mcpServerRepository.getById(id);
    }

    public async getByName(name: string): Promise<McpServer | undefined> {
        return this.mcpServerRepository.getByName(name);
    }

    public async create(data: McpServerCreateInput): Promise<McpServer> {
        const name = normalizeRequired(data.name, 'Name');
        const transportType = normalizeRequired(data.transportType, 'Transport Type');

        validateTransportConfig(transportType, data.config);

        return this.mcpServerRepository.create({
            ...data,
            name: name,
            transportType: transportType,
        });
    }

    public async update(id: string, updates: McpServerUpdateInput): Promise<McpServer> {
        const normalizedUpdates: McpServerUpdateInput = {
            ...updates,
        };

        if (updates.name !== undefined) {
            normalizedUpdates.name = normalizeRequired(updates.name, 'Name');
        }

        if (updates.transportType !== undefined) {
            normalizedUpdates.transportType = normalizeRequired(updates.transportType, 'Transport Type');
        }

        if (updates.config !== undefined) {
            const transportType = normalizedUpdates.transportType ?? (await this.getById(id))?.transportType;
            if (!transportType) {
                throw new Error('Cannot validate config: transport type not found.');
            }
            validateTransportConfig(transportType, updates.config);
        }

        return this.mcpServerRepository.update(id, normalizedUpdates);
    }

    public async delete(id: string): Promise<void> {
        return this.mcpServerRepository.delete(id);
    }

    public async enable(id: string): Promise<McpServer> {
        return this.mcpServerRepository.update(id, { enabled: true });
    }

    public async disable(id: string): Promise<McpServer> {
        return this.mcpServerRepository.update(id, { enabled: false });
    }
}
