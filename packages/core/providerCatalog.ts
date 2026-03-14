import {ModelProviderTypeEnum} from "./database/schema/modelProviderSchema";

export type ProviderCatalogEntry = {
    type: ModelProviderTypeEnum;
    name: string;
    description: string;
    modelsSource: "models-dev" | "ollama" | "lmstudio" | "none";
    modelsDevKey?: string;
};

export const ProviderCatalog: ProviderCatalogEntry[] = [
    {
        type: ModelProviderTypeEnum.OPENAI,
        name: "OpenAI",
        description: "Access state-of-the-art models like GPT-4 and GPT-3.5.",
        modelsSource: "models-dev",
    },
    {
        type: ModelProviderTypeEnum.ANTHROPIC,
        name: "Anthropic",
        description: "Utilize the Claude family of models, known for safety and performance.",
        modelsSource: "models-dev",
    },
    {
        type: ModelProviderTypeEnum.GOOGLE,
        name: "Google",
        description: "Leverage the powerful Gemini family of models from Google AI.",
        modelsSource: "models-dev",
    },
    {
        type: ModelProviderTypeEnum.XAI,
        name: "xAI",
        description: "Truth-seeking AI Chatbot by xAI",
        modelsSource: "models-dev",
        modelsDevKey: "xai"
    },
    {
        type: ModelProviderTypeEnum.GROQ,
        name: "Groq",
        description: "Fast, low cost inference.",
        modelsSource: "models-dev",
    },
    {
        type: ModelProviderTypeEnum.MISTRAL,
        name: "Mistral AI",
        description: "Frontier AI. In your hands.",
        modelsSource: "models-dev",
        modelsDevKey: "mistral"
    },
    {
        type: ModelProviderTypeEnum.DEEPSEEK,
        name: "DeepSeek",
        description: "Into the unknown",
        modelsSource: "models-dev",
    },
    {
        type: ModelProviderTypeEnum.OLLAMA,
        name: "Ollama",
        description: "Chat & build with open models using Ollama.",
        modelsSource: "ollama",
    },
    {
        type: ModelProviderTypeEnum.MOONSHOT,
        name: "Moonshot",
        description: "Access Kimi and other Moonshot AI models.",
        modelsSource: "models-dev",
    },
    {
        type: ModelProviderTypeEnum.PERPLEXITY,
        name: "Perplexity",
        description: "Real-time web search AI with Sonar models.",
        modelsSource: "models-dev",
        modelsDevKey: "perplexity"
    },
    // {
    //     type: ModelProviderTypeEnum.BEDROCK,
    //     name: "Amazon Bedrock",
    //     description: "Access foundation models via AWS Amazon Bedrock.",
    //     modelsSource: "models-dev",
    //     modelsDevKey: "amazon-bedrock"
    // },
    {
        type: ModelProviderTypeEnum.COHERE,
        name: "Cohere",
        description: "Enterprise-grade language models by Cohere.",
        modelsSource: "models-dev",
        modelsDevKey: "cohere"
    },
    {
        type: ModelProviderTypeEnum.LMSTUDIO,
        name: "LM Studio",
        description: "Run open-source models locally with LM Studio.",
        modelsSource: "lmstudio",
    },
    {
        type: ModelProviderTypeEnum.HUGGINGFACE,
        name: "HuggingFace",
        description: "Access thousands of open-source models via HuggingFace.",
        modelsSource: "models-dev",
        modelsDevKey: "huggingface"
    },
    {
        type: ModelProviderTypeEnum.CUSTOM,
        name: "Custom",
        description: "Connect to any OpenAI-compatible API endpoint.",
        modelsSource: "none",
    },
];

export const ProviderCatalogByType = ProviderCatalog.reduce(
    (acc, entry) => {
        acc[entry.type] = entry;
        return acc;
    },
    {} as Record<ModelProviderTypeEnum, ProviderCatalogEntry>
);
