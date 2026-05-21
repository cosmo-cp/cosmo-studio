const CORETYPES = {
    DatabaseManager: Symbol.for('DatabaseManager'),
    SecretStore: Symbol.for("SecretStore"),
    // repositories
    ChatRepository: Symbol.for('ChatRepository'),
    MessageRepository: Symbol.for('MessageRepository'),
    ModelProviderRepository: Symbol.for('ModelProviderRepository'),
    PersonaRepository: Symbol.for('PersonaRepository'),
    CommandRepository: Symbol.for('CommandRepository'),
    McpServerRepository: Symbol.for('McpServerRepository'),
    AcpAgentRepository: Symbol.for('AcpAgentRepository'),
    WebSearchConfigRepository: Symbol.for("WebSearchConfigRepository"),
    WorkflowRepository: Symbol.for('WorkflowRepository'),
    WorkflowRunRepository: Symbol.for('WorkflowRunRepository'),
    // services
    ChatService: Symbol.for('ChatService'),
    MessageService: Symbol.for('MessageService'),
    ModelProviderService: Symbol.for('ModelProviderService'),
    PersonaService: Symbol.for('PersonaService'),
    CommandService: Symbol.for('CommandService'),
    McpServerService: Symbol.for('McpServerService'),
    McpClientManager: Symbol.for('McpClientManager'),
    AcpAgentService: Symbol.for('AcpAgentService'),
    AcpRegistryService: Symbol.for('AcpRegistryService'),
    WebSearchConfigService: Symbol.for("WebSearchConfigService"),
    WorkflowService: Symbol.for('WorkflowService'),
    WorkflowRunService: Symbol.for('WorkflowRunService'),
};

export { CORETYPES };
