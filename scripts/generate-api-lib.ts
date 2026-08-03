import {
  IPC_ARGS_SCHEMA_METADATA_KEY,
  IPC_CONTROLLER_METADATA_KEY,
  IPC_HANDLE_METADATA_KEY,
  IPC_ON_METADATA_KEY,
} from '../src/main/ipc/Decorators';

export type ControllerSource = {
  controller: {name: string};
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
const PRELOAD_WEB_SEARCH_SCHEMA_IMPORT =
  '../../../packages/core/database/schema/webSearchConfigSchema';

const PRELOAD_TYPE_IMPORTS = [
  {name: 'NewChat', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'ModelProviderLite', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'ChatAbortArgs', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'ChatSendMessageArgs', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'Chat', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'ModelProviderCreateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'NewMessage', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'Message', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'NewModel', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'ProviderWithModels', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'ChatWithMessages', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'ModelIdentifier', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'AgentIdentifier', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'PersonaIdentifier', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'Persona', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'NewPersona', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'McpServer', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'McpServerCreateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'McpServerUpdateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'McpToolDefinition', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'CommandCreateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'CommandDefinition', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'CommandExecution', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'CommandUpdateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WebSearchConfigSaveInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WebSearchConfigView', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'Workflow', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowCreateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowGraph', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowRun', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowRunInsert', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowRunStatus', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowVersion', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'AcpAgentCreateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'AcpAgentUpdateInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'AcpAgentView', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'AcpRegistryInstallInput', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'AcpRegistryView', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'AcpAgentTestResult', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowRunStreamStartArgs', source: PRELOAD_CORE_DTO_IMPORT},
  {name: 'WorkflowRunStreamAbortArgs', source: PRELOAD_CORE_DTO_IMPORT},
  {
    name: 'WebSearchProviderTypeEnum',
    source: PRELOAD_WEB_SEARCH_SCHEMA_IMPORT,
  },
  {name: 'UIMessage', source: 'ai'},
  {name: 'UIMessageChunk', source: 'ai'},
] as const;

const PRELOAD_TYPE_IMPORT_NAMES: ReadonlySet<string> = new Set(
  PRELOAD_TYPE_IMPORTS.map((entry) => entry.name),
);

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getMethodSignature(controllerFileContent: string, methodName: string): {
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
      return {params: '', args: '', returnType};
    }

    const paramParts = paramsStr
      .split(',')
      .map((param) => param.trim())
      .filter((param) => param && !param.includes('IpcMainEvent'));
    const typedParams = paramParts.join(', ');
    const argNames = paramParts
      .map((param) => param.split(':')[0].trim())
      .filter(Boolean)
      .join(', ');

    return {params: typedParams, args: argNames, returnType};
  }

  console.warn(`Could not find signature for method ${methodName}. Falling back to void.`);
  return {params: '', args: '', returnType: 'void'};
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
  for (const {source} of PRELOAD_TYPE_IMPORTS) {
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

function renderPreloadGroupFileContent(group: PreloadGroupDescriptor): string {
  const importNames = Array.from(group.importNames);
  const importLines = [
    `import { ipcRenderer } from 'electron';`,
    ...groupImportedTypeNames(importNames),
  ];

  const interfaceMembers = [
    ...group.methods.map(
      ({methodName, params, returnType}) => `    ${methodName}(${params}): Promise<${returnType}>;`,
    ),
    ...group.onMethods.map(({methodName, params}) => `    ${methodName}(${params}): void;`),
  ];

  const objectMembers = [
    ...group.methods.map(
      ({methodName, params, args, channel}) =>
        `    ${methodName}: (${params}) => ipcRenderer.invoke('${channel}'${args ? `, ${args}` : ''})`,
    ),
    ...group.onMethods.map(
      ({methodName, params, args, channel}) =>
        `    ${methodName}: (${params}) => ipcRenderer.send('${channel}'${args ? `, ${args}` : ''})`,
    ),
  ];

  return `${importLines.join('\n')}

export interface ${group.interfaceName} {
${interfaceMembers.join('\n')}
}

export const ${group.constName}: ${group.interfaceName} = {
${objectMembers.join(',\n')}
};
`;
}

function renderPreloadStreamingFileContent(group: PreloadGroupDescriptor): string {
  const importNames = new Set(group.importNames);
  importNames.add('UIMessageChunk');
  const importLines = [
    `import { ipcRenderer } from 'electron';`,
    ...groupImportedTypeNames(Array.from(importNames)),
  ];

  const interfaceMembers = [
    ...group.onMethods.map(({methodName, params}) => `    ${methodName}(${params}): void;`),
    '    onData: (channel: string, listener: (data: UIMessageChunk) => void) => void;',
    '    onEnd: (channel: string, listener: () => void) => void;',
    '    onError: (channel: string, listener: (error: unknown) => void) => void;',
    '    removeListeners: (channel: string) => void;',
  ];

  const objectMembers = [
    ...group.onMethods.map(
      ({methodName, params, args, channel}) =>
        `    ${methodName}: (${params}) => ipcRenderer.send('${channel}'${args ? `, ${args}` : ''})`,
    ),
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

export interface StreamingApi {
${interfaceMembers.join('\n')}
}

export const streamingApi: StreamingApi = {
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

  for (const {controller, source} of controllers) {
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
      const {params, args, returnType} = getMethodSignature(source, methodName);

      if (!groups[controllerPrefix]) {
        groups[controllerPrefix] = createPreloadGroupDescriptor(controllerPrefix);
      }

      const group = groups[controllerPrefix];

      group.methods.push({
        methodName,
        handlerName,
        channel,
        params,
        args,
        returnType,
      });
      addPreloadImports(group, params, returnType);
    }

    const onMetadata = Reflect.getMetadata(IPC_ON_METADATA_KEY, controller) || {};
    for (const methodName in onMetadata) {
      const handlerName = onMetadata[methodName];
      const channel = `${controllerPrefix}:${handlerName}`;
      const {params, args} = getMethodSignature(source, methodName);

      if (!streamingGroup) {
        streamingGroup = createPreloadGroupDescriptor('streaming');
      }

      streamingGroup.onMethods.push({
        methodName,
        handlerName,
        channel,
        params,
        args,
        returnType: 'void',
      });
      addPreloadImports(streamingGroup, params);
    }
  }

  return {groups, streamingGroup};
}

// Builds the preload API file set so generator tests can validate deterministic output.
export function generatePreloadApiFiles(controllers: ControllerSource[]): Record<string, string> {
  const {groups, streamingGroup} = buildPreloadApiModel(controllers);
  const fileContents: Record<string, string> = {};
  const groupNames = Object.keys(groups);
  const rootInterfaceMembers: string[] = [];
  const rootObjectMembers: string[] = [];
  const rootImports: string[] = [];
  const rootTypeExports: string[] = [];

  for (const groupName of groupNames) {
    const group = groups[groupName];
    const filePath = `src/preload/api/${groupName}.ts`;
    fileContents[filePath] = renderPreloadGroupFileContent(group);
    rootImports.push(
      `import { ${group.constName}, type ${group.interfaceName} } from './api/${groupName}';`,
    );
    rootTypeExports.push(`export type { ${group.interfaceName} } from './api/${groupName}';`);
    rootInterfaceMembers.push(`  ${groupName}: ${group.interfaceName};`);
    rootObjectMembers.push(`  ${groupName}: ${group.constName},`);
  }

  if (streamingGroup) {
    const filePath = 'src/preload/api/streaming.ts';
    fileContents[filePath] = renderPreloadStreamingFileContent(streamingGroup);
    rootImports.push(`import { streamingApi, type StreamingApi } from './api/streaming';`);
    rootTypeExports.push(`export type { StreamingApi } from './api/streaming';`);
    rootInterfaceMembers.push('  streaming: StreamingApi;');
    rootObjectMembers.push('  streaming: streamingApi,');
  }

  fileContents['src/preload/api.ts'] = `${rootImports.join('\n')}

${rootTypeExports.join('\n')}

export interface Api {
${rootInterfaceMembers.join('\n')}
}

export const api: Api = {
${rootObjectMembers.join('\n')}
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

  for (const {controller, source} of controllers) {
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
      const {params, args, returnType} = getMethodSignature(source, methodName);
      descriptors.push({
        controllerName,
        controllerPrefix,
        methodName,
        handlerName: handleMetadata[methodName],
        params,
        args,
        returnType,
      });
    }
  }

  return descriptors;
}

// Builds a tiny generated manifest so the Nest runtime can import the same controller source of truth.
export function generateHttpRpcManifestContent(controllers: ControllerSource[]): string {
  const descriptors = getHandleDescriptors(controllers);
  const controllerNames = Array.from(new Set(descriptors.map((descriptor) => descriptor.controllerName)));
  const controllerImports = controllerNames
    .map((controllerName) => `import {${controllerName}} from "../controllers/${controllerName}";`)
    .join('\n');

  return `${controllerImports}

export const rpcControllerConstructors = [${controllerNames.join(', ')}] as const;
`;
}

// Builds the renderer HTTP client with the same method groups as the preload API.
export function generateHttpClientContent(controllers: ControllerSource[]): string {
  const descriptors = getHandleDescriptors(controllers);
  const apiGroups: Record<string, string[]> = {};
  const apiGroupInterfaces: Record<string, string[]> = {};
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  for (const descriptor of descriptors) {
    if (!apiGroups[descriptor.controllerPrefix]) {
      apiGroups[descriptor.controllerPrefix] = [];
      apiGroupInterfaces[descriptor.controllerPrefix] = [];
    }

    apiGroups[descriptor.controllerPrefix].push(
      `    ${descriptor.methodName}: (${descriptor.params}) => callRpc<${descriptor.returnType}>('${descriptor.controllerPrefix}', '${descriptor.handlerName}', [${descriptor.args}])`,
    );
    apiGroupInterfaces[descriptor.controllerPrefix].push(
      `    ${descriptor.methodName}(${descriptor.params}): Promise<${descriptor.returnType}>;`,
    );
  }

  let content = `import superjson from "superjson";
import type {
    NewChat,
    ModelProviderLite,
    Chat,
    ModelProviderCreateInput,
    NewMessage,
    Message,
    NewModel,
    ProviderWithModels,
    ChatWithMessages,
    ModelIdentifier,
    AgentIdentifier,
    PersonaIdentifier,
    Persona,
    NewPersona,
    McpServer,
    McpServerCreateInput,
    McpServerUpdateInput,
    McpToolDefinition,
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
    CommandUpdateInput,
    WebSearchConfigSaveInput,
    WebSearchConfigView,
    Workflow,
    WorkflowCreateInput,
    WorkflowGraph,
    WorkflowRun,
    WorkflowRunInsert,
    WorkflowRunStatus,
    WorkflowVersion,
    AcpAgentCreateInput,
    AcpAgentUpdateInput,
    AcpAgentView,
    AcpRegistryInstallInput,
    AcpRegistryView,
    AcpAgentTestResult,
} from "core/dto";
import type {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import type {UIMessage} from "ai";

type RpcEnvelope<T> =
    | {ok: true; result: T}
    | {ok: false; error: {code: string; message: string}};

const apiBase = process.env.NEXT_PUBLIC_COSMO_API_BASE ?? "/api";

function buildRpcUrl(group: string, handler: string): string {
    const base = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    return \`\${base}/rpc/\${group}/\${handler}\`;
}

async function callRpc<T>(group: string, handler: string, args: unknown[]): Promise<T> {
    const response = await fetch(buildRpcUrl(group, handler), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: superjson.stringify({args}),
    });
    const envelope = superjson.parse<RpcEnvelope<T>>(await response.text());
    if (!envelope.ok) {
        throw new Error(envelope.error.message || "HTTP RPC request failed.");
    }
    if (!response.ok) {
        throw new Error(response.statusText || "HTTP RPC request failed.");
    }
    return envelope.result;
}

`;

  const mainApiInterfaceMembers: string[] = [];
  for (const groupName in apiGroupInterfaces) {
    const interfaceName = `${capitalize(groupName)}HttpApi`;
    content += `export interface ${interfaceName} {\n${apiGroupInterfaces[groupName].join('\n')}\n}\n\n`;
    mainApiInterfaceMembers.push(`  ${groupName}: ${interfaceName};`);
  }

  content += `export interface HttpApi {\n${mainApiInterfaceMembers.join('\n')}\n}\n\n`;
  content += `export const httpApi: HttpApi = {\n`;
  for (const groupName in apiGroups) {
    content += `  ${groupName}: {\n${apiGroups[groupName].join(',\n')}\n  },\n`;
  }
  content += `};\n`;

  return content;
}
