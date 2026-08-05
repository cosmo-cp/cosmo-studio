import {
    IPC_ARGS_SCHEMA_METADATA_KEY,
    IPC_CONTROLLER_METADATA_KEY,
    IPC_HANDLE_METADATA_KEY,
    IPC_ON_METADATA_KEY,
} from '../src/main/ipc/Decorators';

export type ControllerSource = {
    controller: { name: string };
    source: string;
};

type HandlerDescriptor = {
    controllerName: string;
    controllerPrefix: string;
    methodName: string;
    handlerName: string;
    params: string;
    args: string;
    returnType: string;
};

type PreloadMethodDescriptor = {
    methodName: string;
    handlerName: string;
    channel: string;
    params: string;
    args: string;
    returnType: string;
};

type PreloadGroupDescriptor = {
    interfaceName: string;
    constName: string;
    methods: PreloadMethodDescriptor[];
    onMethods: PreloadMethodDescriptor[];
    importNames: Set<string>;
};

const PRELOAD_CORE_DTO_IMPORT = '../../../packages/core/dto';
const PRELOAD_WEB_SEARCH_SCHEMA_IMPORT = '../../../packages/core/database/schema/webSearchConfigSchema';

const PRELOAD_TYPE_IMPORTS = [
    { name: 'NewChat', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'ModelProviderLite', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'ChatAbortArgs', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'ChatSendMessageArgs', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'Chat', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'ModelProviderCreateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'NewMessage', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'Message', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'NewModel', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'ProviderWithModels', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'ChatWithMessages', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'ModelIdentifier', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'AgentIdentifier', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'PersonaIdentifier', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'Persona', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'NewPersona', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'McpServer', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'McpServerCreateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'McpServerUpdateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'McpToolDefinition', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'CommandCreateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'CommandDefinition', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'CommandExecution', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'CommandUpdateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WebSearchConfigSaveInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WebSearchConfigView', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'Workflow', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowCreateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowGraph', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowRun', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowRunInsert', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowRunStatus', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowVersion', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'AcpAgentCreateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'AcpAgentUpdateInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'AcpAgentView', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'AcpRegistryInstallInput', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'AcpRegistryView', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'AcpAgentTestResult', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowRunStreamStartArgs', source: PRELOAD_CORE_DTO_IMPORT },
    { name: 'WorkflowRunStreamAbortArgs', source: PRELOAD_CORE_DTO_IMPORT },
    {
        name: 'WebSearchProviderTypeEnum',
        source: PRELOAD_WEB_SEARCH_SCHEMA_IMPORT,
    },
    { name: 'UIMessage', source: 'ai' },
    { name: 'UIMessageChunk', source: 'ai' },
] as const;

const PRELOAD_TYPE_IMPORT_NAMES: ReadonlySet<string> = new Set(
    PRELOAD_TYPE_IMPORTS.map((entry) => {
        return entry.name;
    }),
);

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getMethodSignature(
    controllerFileContent: string,
    methodName: string,
): {
    params: string;
    args: string;
    returnType: string;
} {
    const methodRegex = new RegExp(
        `(?:@IpcHandler\\(|@IpcOn\\()[\\s\\S]*?public (?:async )?${methodName}\\s*\\(([^)]*)\\)(?::\\s*([^{]*))?`,
        'm',
    );
    const match = controllerFileContent.match(methodRegex);

    if (match) {
        const paramsStr = match[1] ? match[1].trim() : '';
        let returnType = match[2] ? match[2].trim() : 'void';

        if (returnType.startsWith('Promise')) {
            returnType = returnType.replace(/Promise<(.+)>/, '$1');
        }

        if (!paramsStr) {
            return { params: '', args: '', returnType: returnType };
        }

        const paramParts = paramsStr
            .split(',')
            .map((param) => {
                return param.trim();
            })
            .filter((param) => {
                return param && !param.includes('IpcMainEvent');
            });
        const typedParams = paramParts.join(', ');
        const argNames = paramParts
            .map((param) => {
                return param.split(':')[0].trim();
            })
            .filter(Boolean)
            .join(', ');

        return { params: typedParams, args: argNames, returnType: returnType };
    }

    console.warn(`Could not find signature for method ${methodName}. Falling back to void.`);
    return { params: '', args: '', returnType: 'void' };
}

function collectImportedTypeNames(...values: string[]): string[] {
    const importedTypeNames = new Set<string>();
    for (const value of values) {
        for (const match of value.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)) {
            if (PRELOAD_TYPE_IMPORT_NAMES.has(match[0])) {
                importedTypeNames.add(match[0]);
            }
        }
    }
    return Array.from(importedTypeNames);
}

function groupImportedTypeNames(typeNames: string[]): string[] {
    const groupedNames = new Map<string, string[]>();
    const importedTypeNameSet = new Set(typeNames);

    for (const entry of PRELOAD_TYPE_IMPORTS) {
        if (!importedTypeNameSet.has(entry.name)) {
            continue;
        }

        const existingNames = groupedNames.get(entry.source) ?? [];
        existingNames.push(entry.name);
        groupedNames.set(entry.source, existingNames);
    }

    const groupedImports: string[] = [];
    for (const { source } of PRELOAD_TYPE_IMPORTS) {
        const names = groupedNames.get(source);
        if (!names || names.length === 0) {
            continue;
        }

        groupedImports.push(`import type {${names.join(', ')}} from '${source}';`);
        groupedNames.delete(source);
    }

    return groupedImports;
}

function createPreloadGroupDescriptor(prefix: string): PreloadGroupDescriptor {
    return {
        interfaceName: `${capitalize(prefix)}Api`,
        constName: `${prefix}Api`,
        methods: [],
        onMethods: [],
        importNames: new Set<string>(),
    };
}

function addPreloadImports(group: PreloadGroupDescriptor, ...values: string[]): void {
    for (const typeName of collectImportedTypeNames(...values)) {
        group.importNames.add(typeName);
    }
}

function renderContractGroupFileContent(group: PreloadGroupDescriptor): string {
    const importNames = Array.from(group.importNames);
    const importLines = [...groupImportedTypeNames(importNames)];

    const interfaceMembers = [
        ...group.methods.map(({ methodName, params, returnType }) => {
            return `    ${methodName}(${params}): Promise<${returnType}>;`;
        }),
    ];

    return `${importLines.join('\n')}

export interface ${group.interfaceName} {
${interfaceMembers.join('\n')}
}
`;
}

function renderRpcGroupFileContent(group: PreloadGroupDescriptor): string {
    const importNames = Array.from(group.importNames);
    const importLines = [
        `import { ipcRenderer } from 'electron';`,
        ...groupImportedTypeNames(importNames),
        `import type { ${group.interfaceName} } from '../contracts/${group.constName.replace(/Api$/, '')}';`,
    ];

    const objectMembers = [
        ...group.methods.map(({ methodName, params, args, channel }) => {
            return `    ${methodName}: (${params}) => ipcRenderer.invoke('${channel}'${args ? `, ${args}` : ''})`;
        }),
        ...group.onMethods.map(({ methodName, params, args, channel }) => {
            return `    ${methodName}: (${params}) => ipcRenderer.send('${channel}'${args ? `, ${args}` : ''})`;
        }),
    ];

    return `${importLines.join('\n')}

export const ${group.constName}: ${group.interfaceName} = {
${objectMembers.join(',\n')}
};
`;
}

function renderHttpGroupFileContent(groupName: string, group: PreloadGroupDescriptor): string {
    const importNames = Array.from(group.importNames);
    const importLines = [
        ...groupImportedTypeNames(importNames),
        `import type { ${group.interfaceName} } from '../contracts/${group.constName.replace(/Api$/, '')}';`,
        `import { callRpc } from '../api/common';`,
    ];

    const objectMembers = [
        ...group.methods.map(({ methodName, params, args, handlerName, returnType }) => {
            return `    ${methodName}: (${params}) => callRpc<${returnType}>('${groupName}', '${handlerName}', [${args}])`;
        }),
    ];

    return `${importLines.join('\n')}

export const ${groupName}HttpApi: ${group.interfaceName} = {
${objectMembers.join(',\n')}
};
`;
}

function renderContractStreamingFileContent(group: PreloadGroupDescriptor): string {
    const importNames = new Set(group.importNames);
    importNames.add('UIMessageChunk');
    const importLines = [...groupImportedTypeNames(Array.from(importNames))];

    const interfaceMembers = [
        ...group.onMethods.map(({ methodName, params }) => {
            return `    ${methodName}(${params}): void;`;
        }),
        '    onData: (channel: string, listener: (data: UIMessageChunk) => void) => void;',
        '    onEnd: (channel: string, listener: () => void) => void;',
        '    onError: (channel: string, listener: (error: unknown) => void) => void;',
        '    removeListeners: (channel: string) => void;',
    ];

    return `${importLines.join('\n')}

export interface StreamingApi {
${interfaceMembers.join('\n')}
}
`;
}

function renderRpcStreamingFileContent(group: PreloadGroupDescriptor): string {
    const importNames = new Set(group.importNames);
    importNames.add('UIMessageChunk');
    const importLines = [
        `import { ipcRenderer } from 'electron';`,
        ...groupImportedTypeNames(Array.from(importNames)),
        `import type { StreamingApi } from '../contracts/streaming';`,
    ];

    const objectMembers = [
        ...group.onMethods.map(({ methodName, params, args, channel }) => {
            return `    ${methodName}: (${params}) => ipcRenderer.send('${channel}'${args ? `, ${args}` : ''})`;
        }),
        `    onData: (channel: string, listener: (data: UIMessageChunk) => void) => {
      const subscription = (_event: unknown, data: UIMessageChunk) => listener(data);
      ipcRenderer.on(\`${'${channel}'}-data\`, subscription);
    }`,
        `    onEnd: (channel: string, listener: () => void) => {
      ipcRenderer.on(\`${'${channel}'}-end\`, listener);
    }`,
        `    onError: (channel: string, listener: (error: unknown) => void) => {
      const subscription = (_event: unknown, error: unknown) => listener(error);
      ipcRenderer.on(\`${'${channel}'}-error\`, subscription);
    }`,
        `    removeListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(\`${'${channel}'}-error\`);
      ipcRenderer.removeAllListeners(\`${'${channel}'}-end\`);
      ipcRenderer.removeAllListeners(\`${'${channel}'}-data\`);
    }`,
    ];

    return `${importLines.join('\n')}

export const streamingApi: StreamingApi = {
${objectMembers.join(',\n')}
};
`;
}

function renderHttpStreamingFileContent(group: PreloadGroupDescriptor): string {
    const importNames = new Set(group.importNames);
    importNames.add('UIMessageChunk');
    const importLines = [
        ...groupImportedTypeNames(Array.from(importNames)),
        `import type { StreamingApi } from '../contracts/streaming';`,
    ];

    const objectMembers = [
        `    sendMessage: () => {
      throw new Error('Streaming is handled by createChatTransport() in HTTP builds.');
    }`,
        `    abortMessage: () => {
      throw new Error('Streaming is handled by createChatTransport() in HTTP builds.');
    }`,
        ...group.onMethods
            .filter(({ methodName }) => {
                return methodName !== 'sendMessage' && methodName !== 'abortMessage';
            })
            .map(({ methodName }) => {
                return `    ${methodName}: () => {
      throw new Error('Workflow streaming is not available through the HTTP RPC client.');
    }`;
            }),
        '    onData: () => undefined',
        '    onEnd: () => undefined',
        '    onError: () => undefined',
        '    removeListeners: () => undefined',
    ];

    return `${importLines.join('\n')}

export const streamingHttpApi: StreamingApi = {
${objectMembers.join(',\n')}
};
`;
}

function buildPreloadApiModel(controllers: ControllerSource[]): {
    groups: Record<string, PreloadGroupDescriptor>;
    streamingGroup: PreloadGroupDescriptor | null;
} {
    const groups: Record<string, PreloadGroupDescriptor> = {};
    let streamingGroup: PreloadGroupDescriptor | null = null;

    for (const { controller, source } of controllers) {
        const controllerName = controller.name;
        if (!source) {
            console.error(`Could not read content of controller ${controllerName}`);
            continue;
        }

        const controllerPrefix = Reflect.getMetadata(IPC_CONTROLLER_METADATA_KEY, controller);
        if (controllerPrefix === undefined) {
            continue;
        }

        const handleMetadata = Reflect.getMetadata(IPC_HANDLE_METADATA_KEY, controller) || {};
        for (const methodName in handleMetadata) {
            const handlerName = handleMetadata[methodName];
            const channel = `${controllerPrefix}:${handlerName}`;
            const { params, args, returnType } = getMethodSignature(source, methodName);

            if (!groups[controllerPrefix]) {
                groups[controllerPrefix] = createPreloadGroupDescriptor(controllerPrefix);
            }

            const group = groups[controllerPrefix];

            group.methods.push({
                methodName: methodName,
                handlerName: handlerName,
                channel: channel,
                params: params,
                args: args,
                returnType: returnType,
            });
            addPreloadImports(group, params, returnType);
        }

        const onMetadata = Reflect.getMetadata(IPC_ON_METADATA_KEY, controller) || {};
        for (const methodName in onMetadata) {
            const handlerName = onMetadata[methodName];
            const channel = `${controllerPrefix}:${handlerName}`;
            const { params, args } = getMethodSignature(source, methodName);

            if (!streamingGroup) {
                streamingGroup = createPreloadGroupDescriptor('streaming');
            }

            streamingGroup.onMethods.push({
                methodName: methodName,
                handlerName: handlerName,
                channel: channel,
                params: params,
                args: args,
                returnType: 'void',
            });
            addPreloadImports(streamingGroup, params);
        }
    }

    return { groups: groups, streamingGroup: streamingGroup };
}

// Builds the preload API file set so generator tests can validate deterministic output.
export function generatePreloadApiFiles(controllers: ControllerSource[]): Record<string, string> {
    const { groups, streamingGroup } = buildPreloadApiModel(controllers);
    const fileContents: Record<string, string> = {};
    const groupNames = Object.keys(groups);
    const httpRootInterfaceMembers: string[] = [];
    const httpRootObjectMembers: string[] = [];
    const httpRootImports: string[] = [];
    const httpRootTypeExports: string[] = [];
    const rpcRootObjectMembers: string[] = [];
    const rpcRootImports = [`import type { CosmoApi } from './api';`];

    for (const groupName of groupNames) {
        const group = groups[groupName];
        fileContents[`src/preload/contracts/${groupName}.ts`] = renderContractGroupFileContent(group);
        fileContents[`src/preload/api/${groupName}.ts`] = renderRpcGroupFileContent(group);
        fileContents[`src/preload/http-api/${groupName}.ts`] = renderHttpGroupFileContent(groupName, group);
        httpRootImports.push(`import { ${groupName}HttpApi } from './http-api/${groupName}';`);
        httpRootImports.push(`import type { ${group.interfaceName} } from './contracts/${groupName}';`);
        httpRootTypeExports.push(`export type { ${group.interfaceName} } from './contracts/${groupName}';`);
        httpRootInterfaceMembers.push(`  ${groupName}: ${group.interfaceName};`);
        httpRootObjectMembers.push(`  ${groupName}: ${groupName}HttpApi,`);
        rpcRootImports.push(`import { ${group.constName} as ${groupName}RpcApi } from './api/${groupName}';`);
        rpcRootObjectMembers.push(`  ${groupName}: ${groupName}RpcApi,`);
    }

    if (streamingGroup) {
        fileContents['src/preload/contracts/streaming.ts'] = renderContractStreamingFileContent(streamingGroup);
        fileContents['src/preload/api/streaming.ts'] = renderRpcStreamingFileContent(streamingGroup);
        fileContents['src/preload/http-api/streaming.ts'] = renderHttpStreamingFileContent(streamingGroup);
        httpRootImports.push(`import { streamingHttpApi } from './http-api/streaming';`);
        httpRootImports.push(`import type { StreamingApi } from './contracts/streaming';`);
        httpRootTypeExports.push(`export type { StreamingApi } from './contracts/streaming';`);
        httpRootInterfaceMembers.push('  streaming: StreamingApi;');
        httpRootObjectMembers.push('  streaming: streamingHttpApi,');
        rpcRootImports.push(`import { streamingApi } from './api/streaming';`);
        rpcRootObjectMembers.push('  streaming: streamingApi,');
    }

    fileContents['src/preload/api.ts'] = `${httpRootImports.join('\n')}

${httpRootTypeExports.join('\n')}

export interface CosmoApi {
${httpRootInterfaceMembers.join('\n')}
}

export const httpApi: CosmoApi = {
${httpRootObjectMembers.join('\n')}
};
`;

    fileContents['src/preload/rpc-api.ts'] = `${rpcRootImports.join('\n')}

export const rpcApi: CosmoApi = {
${rpcRootObjectMembers.join('\n')}
};
`;

    return fileContents;
}

// Builds the preload API string so existing callers can still generate the barrel file directly.
export function generateApiContent(controllers: ControllerSource[]): string {
    return generatePreloadApiFiles(controllers)['src/preload/api.ts'];
}

function getHandleDescriptors(controllers: ControllerSource[]): HandlerDescriptor[] {
    const descriptors: HandlerDescriptor[] = [];

    for (const { controller, source } of controllers) {
        const controllerName = controller.name;
        if (!source) {
            console.error(`Could not read content of controller ${controllerName}`);
            continue;
        }

        const controllerPrefix = Reflect.getMetadata(IPC_CONTROLLER_METADATA_KEY, controller);
        if (controllerPrefix === undefined) {
            continue;
        }

        const handleMetadata = Reflect.getMetadata(IPC_HANDLE_METADATA_KEY, controller) || {};
        const argSchemas = Reflect.getMetadata(IPC_ARGS_SCHEMA_METADATA_KEY, controller) || {};
        for (const methodName in handleMetadata) {
            if (!argSchemas[methodName]) {
                throw new Error(`${controllerName}.${methodName} is missing an IPC args zod tuple schema.`);
            }
            const { params, args, returnType } = getMethodSignature(source, methodName);
            descriptors.push({
                controllerName: controllerName,
                controllerPrefix: controllerPrefix,
                methodName: methodName,
                handlerName: handleMetadata[methodName],
                params: params,
                args: args,
                returnType: returnType,
            });
        }
    }

    return descriptors;
}

// Builds a tiny generated manifest so the Nest runtime can import the same controller source of truth.
export function generateHttpRpcManifestContent(controllers: ControllerSource[]): string {
    const descriptors = getHandleDescriptors(controllers);
    const controllerNames = Array.from(
        new Set(
            descriptors.map((descriptor) => {
                return descriptor.controllerName;
            }),
        ),
    );
    const controllerImports = controllerNames
        .map((controllerName) => {
            return `import {${controllerName}} from "../controllers/${controllerName}";`;
        })
        .join('\n');

    return `${controllerImports}

export const rpcControllerConstructors = [${controllerNames.join(', ')}] as const;
`;
}
