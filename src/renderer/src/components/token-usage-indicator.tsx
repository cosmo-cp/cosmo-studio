'use client';

import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DynamicToolUIPart, UIMessage } from 'ai';
import type { McpServer } from 'core/dto';
import { Info, PieChart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface TokenUsageIndicatorProps {
    messages: UIMessage[];
    modelId?: string;
    personaId?: string | null;
}

// Approximate char-to-token ratio
const CHARS_PER_TOKEN = 4;

const getSafeLength = (obj: unknown) => {
    if (obj == null) return 0;
    try {
        return JSON.stringify(obj)?.length ?? 0;
    } catch {
        return 0;
    }
};

export function TokenUsageIndicator({ messages, modelId, personaId }: TokenUsageIndicatorProps) {
    const [toolsLength, setToolsLength] = useState(0);
    const [personaLength, setPersonaLength] = useState(0);

    const [maxTokens, setMaxTokens] = useState<number>(128000);
    const [maxOutputTokens, setMaxOutputTokens] = useState<number>(4096);

    useEffect(() => {
        const fetchMaxTokens = async () => {
            if (!modelId) return;
            try {
                const providers = await window.api.modelProvider.getProvidersWithModels();
                for (const provider of providers) {
                    const found = provider.models.find((m) => m.modelId === modelId);
                    if (found) {
                        if (found.contextWindow && found.contextWindow > 0) setMaxTokens(found.contextWindow);
                        if (found.maxOutputWindow && found.maxOutputWindow > 0)
                            setMaxOutputTokens(found.maxOutputWindow);
                        return;
                    }
                }

                // Fallback
                const lowerModel = modelId.toLowerCase();
                if (lowerModel.includes('claude-3-5') || lowerModel.includes('claude-3-opus')) {
                    setMaxTokens(200000);
                    setMaxOutputTokens(8192);
                } else if (lowerModel.includes('gemini-1.5-pro')) {
                    setMaxTokens(2000000);
                    setMaxOutputTokens(8192);
                } else if (lowerModel.includes('gemini-1.5-flash')) {
                    setMaxTokens(1000000);
                    setMaxOutputTokens(8192);
                } else if (lowerModel.includes('gpt-4') || lowerModel.includes('gpt-4o')) {
                    setMaxTokens(128000);
                    setMaxOutputTokens(4096);
                } else if (lowerModel.includes('o1') || lowerModel.includes('o3')) {
                    setMaxTokens(200000);
                    setMaxOutputTokens(100000);
                } else {
                    setMaxTokens(128000);
                    setMaxOutputTokens(4096);
                }
            } catch (err) {
                console.error('Failed to parse models for token usage indicator', err);
            }
        };
        fetchMaxTokens();
    }, [modelId]);

    useEffect(() => {
        const fetchToolsLength = async () => {
            try {
                const list = await window.api.mcpServer.getAll();
                const enabledServers = list.filter((s: McpServer) => s.enabled);
                let length = 0;
                for (const server of enabledServers) {
                    const tools = await window.api.mcpServer.getServerTools(server.id);
                    length += JSON.stringify(tools).length;
                }
                setToolsLength(length);
            } catch (error) {
                console.error('Failed to calculate tools length for tokens', error);
            }
        };
        fetchToolsLength();
    }, []);

    useEffect(() => {
        const fetchPersonaLength = async () => {
            if (!personaId) {
                setPersonaLength(0);
                return;
            }
            try {
                const persona = await window.api.persona.getById(personaId);
                if (persona && persona.details) {
                    setPersonaLength(persona.details.length);
                } else {
                    setPersonaLength(0);
                }
            } catch (error) {
                console.error('Failed to fetch persona length for tokens', error);
                setPersonaLength(0);
            }
        };
        fetchPersonaLength();
    }, [personaId]);

    const tokens = useMemo(() => {
        const systemInstructionsTokens = Math.ceil(personaLength / CHARS_PER_TOKEN);
        const toolDefinitionsTokens = Math.ceil(toolsLength / CHARS_PER_TOKEN);

        let messagesTokens = 0;
        let toolResultsTokens = 0;

        for (const m of messages) {
            let contentString = '';
            if ('parts' in m && Array.isArray(m.parts)) {
                for (const p of m.parts) {
                    if (p.type === 'text') {
                        contentString += p.text;
                    } else if (p.type.startsWith('tool-') || p.type.endsWith('-tool')) {
                        const toolPart = p as DynamicToolUIPart & Record<string, unknown>;

                        // Accurately capture lengths across different AI SDK versions without double counting
                        const inputLength = getSafeLength(toolPart.input ?? toolPart.args);
                        const outputLength = getSafeLength(toolPart.output ?? toolPart.result);

                        toolResultsTokens += Math.ceil((inputLength + outputLength) / CHARS_PER_TOKEN);
                    }
                }
            } else if ('text' in m) {
                contentString = (m.text as string) ?? '';
            }

            const msgTokens = Math.ceil(contentString.length / CHARS_PER_TOKEN);

            if (m.role === 'user' || m.role === 'assistant') {
                messagesTokens += msgTokens;
            }

            // Legacy toolInvocations check just in case
            if ('toolInvocations' in m && Array.isArray(m.toolInvocations)) {
                for (const tool of m.toolInvocations) {
                    if ('result' in tool) {
                        toolResultsTokens += Math.ceil(JSON.stringify(tool.result).length / CHARS_PER_TOKEN);
                    }
                }
            }
        }

        const totalTokens = systemInstructionsTokens + toolDefinitionsTokens + messagesTokens + toolResultsTokens;

        return {
            systemInstructions: systemInstructionsTokens,
            toolDefinitions: toolDefinitionsTokens,
            messages: messagesTokens,
            toolResults: toolResultsTokens,
            totalTokens,
        };
    }, [messages, toolsLength, personaLength]);

    const formatTokens = (num: number) => {
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const getPercentage = (amount: number) => {
        const pct = (amount / maxTokens) * 100;
        return pct < 0.1 && pct > 0 ? '<0.1%' : pct.toFixed(1) + '%';
    };

    const totalPercentage = (tokens.totalTokens / maxTokens) * 100;

    return (
        <HoverCard openDelay={100}>
            <HoverCardTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    className="h-9 w-9 border border-border/40 bg-background/50 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-default select-none pointer-events-auto"
                >
                    <PieChart className="h-4 w-4" />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent align="end" className="w-[300px] p-0" side="top" sideOffset={8}>
                <div className="p-4 space-y-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <h4 className="font-semibold text-sm">Token Limits</h4>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[220px]">
                                        <p className="text-xs">
                                            This is a rough estimate based on character count approximations and may not
                                            match the actual token usage entirely.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Context Range</span>
                                <div className="flex items-center gap-2">
                                    <span>
                                        {formatTokens(tokens.totalTokens)} / {formatTokens(maxTokens)}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                                        {totalPercentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Max Output</span>
                                <span>{formatTokens(maxOutputTokens)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <h5 className="text-sm font-semibold mb-1">System</h5>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>System Instructions</span>
                                    <span>{getPercentage(tokens.systemInstructions)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Tool Definitions</span>
                                    <span>{getPercentage(tokens.toolDefinitions)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h5 className="text-sm font-semibold mb-1">User Context</h5>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Messages</span>
                                    <span>{getPercentage(tokens.messages)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Tool Results</span>
                                    <span>{getPercentage(tokens.toolResults)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
