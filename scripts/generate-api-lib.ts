import {IPC_CONTROLLER_METADATA_KEY, IPC_HANDLE_METADATA_KEY, IPC_ON_METADATA_KEY} from "../src/main/ipc/Decorators"

export type ControllerSource = {
  controller: (abstract new (...args: unknown[]) => unknown) & {name: string}
  source: string
}

type MethodSignature = {
  params: string
  args: string
  returnType: string
}

// Parses controller method signatures so generated APIs reflect current IPC types.
export function getMethodSignature(controllerFileContent: string, methodName: string): MethodSignature {
  const methodRegex = new RegExp(
    `(?:@IpcHandler\\(|@IpcOn\\()(?:'[^']+'|\\"[^\\"]+\\")\\)[\\s\\S]*?public (?:async )?${methodName}\\s*\\(([^)]*)\\)(?::\\s*([^{]*))?`,
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
