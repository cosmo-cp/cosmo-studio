const CORETYPES = {
    DatabaseManager: Symbol.for("DatabaseManager"),
    // repositories
    ChatRepository: Symbol.for("ChatRepository"),
    MessageRepository: Symbol.for("MessageRepository"),
    ModelProviderRepository: Symbol.for("ModelProviderRepository"),
    PersonaRepository: Symbol.for("PersonaRepository"),
    CommandRepository: Symbol.for("CommandRepository"),
    McpServerRepository: Symbol.for("McpServerRepository"),
    WebSearchConfigRepository: Symbol.for("WebSearchConfigRepository"),
    // services
    ChatService: Symbol.for("ChatService"),
    MessageService: Symbol.for("MessageService"),
    ModelProviderService: Symbol.for("ModelProviderService"),
    PersonaService: Symbol.for("PersonaService"),
    CommandService: Symbol.for("CommandService"),
    McpServerService: Symbol.for("McpServerService"),
    McpClientManager: Symbol.for("McpClientManager"),
    WebSearchConfigService: Symbol.for("WebSearchConfigService"),
};

export {CORETYPES};
