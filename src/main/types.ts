const TYPES = {
    IpcHandlerRegistry: Symbol.for('IpcHandlerRegistry'),
    ChatStreamingService: Symbol.for("ChatStreamingService"),
    WorkflowRunStreamingService: Symbol.for('WorkflowRunStreamingService'),
    ModelProviderService: Symbol.for('ModelProviderService'),
    StreamingChatController: Symbol.for('StreamingChatController'),
    Controller: Symbol.for('Controller'),
    WorkflowExecutionService: Symbol.for('WorkflowExecutionService'),
};

export { TYPES };
