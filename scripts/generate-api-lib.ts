import {
  IPC_ARGS_SCHEMA_METADATA_KEY,
  IPC_CONTROLLER_METADATA_KEY,
  IPC_HANDLE_METADATA_KEY,
  IPC_ON_METADATA_KEY
} from "../src/main/ipc/Decorators"

export type ControllerSource = {
  controller: (abstract new (...args: unknown[]) => unknown) & {name: string}
  source: string
}

type MethodSignature = {
  params: string
  args: string
  returnType: string
}

type HandlerDescriptor = {
  controllerName: string
  controllerPrefix: string
  methodName: string
  handlerName: string
  params: string
  args: string
  returnType: string
}

// Parses controller method signatures so generated APIs reflect current IPC types.
export function getMethodSignature(controllerFileContent: string, methodName: string): MethodSignature {
  const methodRegex = new RegExp(
    `(?:@IpcHandler\\(|@IpcOn\\()[\\s\\S]*?public (?:async )?${methodName}\\s*\\(([^)]*)\\)(?::\\s*([^{]*))?`,
    "m"
  )
  const match = controllerFileContent.match(methodRegex)

  if (match) {
    const paramsStr = match[1] ? match[1].trim() : ""
    let returnType = match[2] ? match[2].trim() : "void"

    if (returnType.startsWith("Promise")) {
      returnType = returnType.replace(/Promise<(.+)>/, "$1")
    }

    if (!paramsStr) {
      return { params: "", args: "", returnType }
    }

    const paramParts = paramsStr
      .split(",")
      .map((param) => param.trim())
      .filter((param) => param && !param.includes("IpcMainEvent"))
    const typedParams = paramParts.join(", ")
    const argNames = paramParts
      .map((param) => param.split(":")[0].trim())
      .filter(Boolean)
      .join(", ")

    return { params: typedParams, args: argNames, returnType }
  }

  console.warn(`Could not find signature for method ${methodName}. Falling back to void.`)
  return { params: "", args: "", returnType: "void" }
}

// Builds the preload API string so generator tests can validate deterministic output.
export function generateApiContent(controllers: ControllerSource[]): string {
  const apiGroups: Record<string, string[]> = {}
  const onHandlers: string[] = []
  const apiGroupInterfaces: Record<string, string[]> = {}
  const onHandlerInterfaceMembers: string[] = []

  // Ensures interface names match controller prefixes.
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

  for (const { controller, source } of controllers) {
    const controllerName = controller.name
    if (!source) {
      console.error(`Could not read content of controller ${controllerName}`)
      continue
    }

    const controllerPrefix = Reflect.getMetadata(IPC_CONTROLLER_METADATA_KEY, controller)

    if (controllerPrefix && !apiGroups[controllerPrefix]) {
      apiGroups[controllerPrefix] = []
      apiGroupInterfaces[controllerPrefix] = []
    }

    const handleMetadata = Reflect.getMetadata(IPC_HANDLE_METADATA_KEY, controller) || {}
    for (const methodName in handleMetadata) {
      const handlerName = handleMetadata[methodName]
      const channel = controllerPrefix !== undefined ? `${controllerPrefix}:${handlerName}` : handlerName
      if (controllerPrefix !== undefined) {
        const { params, args, returnType } = getMethodSignature(source, methodName)
        const methodArgs = args ? `, ${args}` : ""
        apiGroups[controllerPrefix].push(
          `    ${methodName}: (${params}) => ipcRenderer.invoke('${channel}'${methodArgs})`
        )
        apiGroupInterfaces[controllerPrefix].push(
          `    ${methodName}(${params}): Promise<${returnType}>;`
        )
      }
    }

    const onMetadata = Reflect.getMetadata(IPC_ON_METADATA_KEY, controller) || {}
    for (const methodName in onMetadata) {
      const handlerName = onMetadata[methodName]
      const channel = controllerPrefix !== undefined ? `${controllerPrefix}:${handlerName}` : handlerName
      const { params, args } = getMethodSignature(source, methodName)
      const methodArgs = args ? `, ${args}` : ""
      onHandlers.push(`    ${methodName}: (${params}) => ipcRenderer.send('${channel}'${methodArgs})`)
      onHandlerInterfaceMembers.push(`    ${methodName}(${params}): void;`)
    }
  }

  let apiContent = `import { ipcRenderer } from 'electron';
import {
    NewChat,
    ModelProviderLite,
    ChatAbortArgs,
    ChatSendMessageArgs,
    Chat,
    ModelProviderCreateInput,
    NewMessage,
    Message,
    NewModel,
    ProviderWithModels,
    ChatWithMessages,
    ModelIdentifier,
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
} from '../../packages/core/dto';
import {WebSearchProviderTypeEnum} from '../../packages/core/database/schema/webSearchConfigSchema';
import {UIMessage} from "ai";
`

  const mainApiInterfaceMembers: string[] = []

  for (const groupName in apiGroupInterfaces) {
    const interfaceName = `${capitalize(groupName)}Api`
    if (apiGroupInterfaces[groupName].length > 0) {
      apiContent += `export interface ${interfaceName} {\n${apiGroupInterfaces[groupName].join(
        "\n"
      )}\n}\n\n`
      mainApiInterfaceMembers.push(`  ${groupName}: ${interfaceName};`)
    }
  }

  if (onHandlers.length > 0) {
    const streamingInterfaceMembers = [
      ...onHandlerInterfaceMembers,
      "    onData: (channel: string, listener: (data: unknown) => void) => void;",
      "    onEnd: (channel: string, listener: () => void) => void;",
      "    onError: (channel: string, listener: (error: unknown) => void) => void;",
      "    removeListeners: (channel: string) => void;",
    ]
    apiContent += `export interface StreamingApi {\n${streamingInterfaceMembers.join(
      "\n"
    )}\n}\n\n`
    mainApiInterfaceMembers.push("  streaming: StreamingApi;")
  }

  if (mainApiInterfaceMembers.length > 0) {
    apiContent += `export interface Api {\n${mainApiInterfaceMembers.join("\n")}\n}\n\n`
  }

  apiContent += `export const api: Api = {\n`

  for (const groupName in apiGroups) {
    if (apiGroups[groupName].length > 0) {
      apiContent += `  ${groupName}: {\n${apiGroups[groupName].join(",\n")}\n  },\n`
    }
  }

  if (onHandlers.length > 0) {
    apiContent += `  streaming: {\n${onHandlers.join(",\n")},\n`
    apiContent += `    onData: (channel: string, listener: (data: unknown) => void) => {\n`
    apiContent += `      const subscription = (_event: unknown, data: unknown) => listener(data);\n`
    apiContent += `      ipcRenderer.on(\`\${channel}-data\`, subscription);\n`
    apiContent += `    },\n`
    apiContent += `    onEnd: (channel: string, listener: () => void) => {\n`
    apiContent += `      ipcRenderer.on(\`\${channel}-end\`, listener);\n`
    apiContent += `    },\n`
    apiContent += `    onError: (channel: string, listener: (error: unknown) => void) => {\n`
    apiContent += `      const subscription = (_event: unknown, error: unknown) => listener(error);\n`
    apiContent += `      ipcRenderer.on(\`\${channel}-error\`, subscription);\n`
    apiContent += `    },\n`
    apiContent += `    removeListeners: (channel: string) => {\n`
    apiContent += `      ipcRenderer.removeAllListeners(\`\${channel}-error\`);\n`
    apiContent += `      ipcRenderer.removeAllListeners(\`\${channel}-end\`);\n`
    apiContent += `      ipcRenderer.removeAllListeners(\`\${channel}-data\`);\n`
    apiContent += `    },\n`
    apiContent += `  },\n`
  }

  apiContent += `};\n`

  return apiContent
}

function getHandleDescriptors(controllers: ControllerSource[]): HandlerDescriptor[] {
  const descriptors: HandlerDescriptor[] = []

  for (const { controller, source } of controllers) {
    const controllerName = controller.name
    if (!source) {
      console.error(`Could not read content of controller ${controllerName}`)
      continue
    }

    const controllerPrefix = Reflect.getMetadata(IPC_CONTROLLER_METADATA_KEY, controller)
    if (controllerPrefix === undefined) {
      continue
    }

    const handleMetadata = Reflect.getMetadata(IPC_HANDLE_METADATA_KEY, controller) || {}
    const argSchemas = Reflect.getMetadata(IPC_ARGS_SCHEMA_METADATA_KEY, controller) || {}
    for (const methodName in handleMetadata) {
      if (!argSchemas[methodName]) {
        throw new Error(`${controllerName}.${methodName} is missing an IPC args zod tuple schema.`)
      }
      const { params, args, returnType } = getMethodSignature(source, methodName)
      descriptors.push({
        controllerName,
        controllerPrefix,
        methodName,
        handlerName: handleMetadata[methodName],
        params,
        args,
        returnType,
      })
    }
  }

  return descriptors
}

// Builds a tiny generated manifest so the Nest runtime can import the same controller source of truth.
export function generateHttpRpcManifestContent(controllers: ControllerSource[]): string {
  const descriptors = getHandleDescriptors(controllers)
  const controllerNames = Array.from(new Set(descriptors.map((descriptor) => descriptor.controllerName)))
  const controllerImports = controllerNames
    .map((controllerName) => `import {${controllerName}} from "../controllers/${controllerName}";`)
    .join("\n")

  return `${controllerImports}

export const rpcControllerConstructors = [${controllerNames.join(", ")}] as const;
`
}

// Builds the renderer HTTP client with the same method groups as the preload API.
export function generateHttpClientContent(controllers: ControllerSource[]): string {
  const descriptors = getHandleDescriptors(controllers)
  const apiGroups: Record<string, string[]> = {}
  const apiGroupInterfaces: Record<string, string[]> = {}
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

  for (const descriptor of descriptors) {
    if (!apiGroups[descriptor.controllerPrefix]) {
      apiGroups[descriptor.controllerPrefix] = []
      apiGroupInterfaces[descriptor.controllerPrefix] = []
    }

    apiGroups[descriptor.controllerPrefix].push(
      `    ${descriptor.methodName}: (${descriptor.params}) => callRpc<${descriptor.returnType}>('${descriptor.controllerPrefix}', '${descriptor.handlerName}', [${descriptor.args}])`
    )
    apiGroupInterfaces[descriptor.controllerPrefix].push(
      `    ${descriptor.methodName}(${descriptor.params}): Promise<${descriptor.returnType}>;`
    )
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

`

  const mainApiInterfaceMembers: string[] = []
  for (const groupName in apiGroupInterfaces) {
    const interfaceName = `${capitalize(groupName)}HttpApi`
    content += `export interface ${interfaceName} {\n${apiGroupInterfaces[groupName].join("\n")}\n}\n\n`
    mainApiInterfaceMembers.push(`  ${groupName}: ${interfaceName};`)
  }

  content += `export interface HttpApi {\n${mainApiInterfaceMembers.join("\n")}\n}\n\n`
  content += `export const httpApi: HttpApi = {\n`
  for (const groupName in apiGroups) {
    content += `  ${groupName}: {\n${apiGroups[groupName].join(",\n")}\n  },\n`
  }
  content += `};\n`

  return content
}
