'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { McpServer } from 'core/dto';
import { ChevronUp, RefreshCw, Wrench } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface McpTool {
    name: string;
    title?: string;
    description?: string;
}

export function McpToolsSelector() {
    const [servers, setServers] = useState<McpServer[]>([]);
    const [serverTools, setServerTools] = useState<Record<string, McpTool[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingToolsFor, setLoadingToolsFor] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const loadServers = useCallback(async () => {
        try {
            const list = await window.api.mcpServer.getAll();
            setServers(list.filter((s) => s.enabled));
        } catch (error) {
            console.error('Failed to load MCP servers', error);
        }
    }, []);

    const loadToolsForServer = useCallback(async (serverId: string) => {
        setLoadingToolsFor(serverId);
        try {
            const tools = await window.api.mcpServer.getServerTools(serverId);
            setServerTools((prev) => ({ ...prev, [serverId]: tools }));
        } catch (error) {
            console.error(`Failed to load tools for server ${serverId}`, error);
            setServerTools((prev) => ({ ...prev, [serverId]: [] }));
        } finally {
            setLoadingToolsFor(null);
        }
    }, []);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            loadServers();
        }
    };

    useEffect(() => {
        if (isOpen) {
            servers.forEach((server) => {
                if (!serverTools[server.id]) {
                    loadToolsForServer(server.id);
                }
            });
        }
    }, [isOpen, servers, serverTools, loadToolsForServer]);

    const totalTools = Object.values(serverTools).reduce((acc, tools) => acc + tools.length, 0);
    const enabledServersCount = servers.length;

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-3 flex items-center gap-2 border border-border/40 bg-background/50 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                            >
                                <Wrench className="h-4 w-4" />
                                <span className="text-sm font-medium">Tools</span>
                                {totalTools > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="h-5 px-1.5 min-w-[20px] justify-center text-[10px] bg-accent/50"
                                    >
                                        {totalTools}
                                    </Badge>
                                )}
                                <ChevronUp className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                        <p>Available MCP Tools</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <PopoverContent align="end" className="w-[320px] p-0 overflow-hidden" side="top" sideOffset={8}>
                <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Active MCP Tools</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                            setIsLoading(true);
                            loadServers().finally(() => {
                                servers.forEach((s) => loadToolsForServer(s.id));
                                setIsLoading(false);
                            });
                        }}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <Separator />

                <ScrollArea className="h-[350px]">
                    <div className="p-2 space-y-4">
                        {enabledServersCount === 0 ? (
                            <div className="p-4 text-center">
                                <p className="text-xs text-muted-foreground">No enabled MCP servers.</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Enable servers in Settings to use tools.
                                </p>
                            </div>
                        ) : (
                            servers.map((server) => (
                                <div key={server.id} className="space-y-2">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                                            <span className="text-xs font-bold truncate">{server.name}</span>
                                        </div>
                                        {serverTools[server.id] && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 h-4 font-normal"
                                            >
                                                {serverTools[server.id].length} tools
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="grid gap-1">
                                        {loadingToolsFor === server.id ? (
                                            <div className="px-2 py-1 text-[11px] text-muted-foreground">
                                                Loading tools...
                                            </div>
                                        ) : serverTools[server.id]?.length === 0 ? (
                                            <div className="px-2 py-1 text-[11px] text-muted-foreground italic">
                                                No tools available for this server.
                                            </div>
                                        ) : (
                                            serverTools[server.id]?.map((tool) => (
                                                <div
                                                    key={tool.name}
                                                    className="group flex flex-col gap-0.5 rounded-md border border-transparent bg-background/50 px-2.5 py-2 hover:border-border hover:bg-accent/30 transition-all duration-200"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[11px] font-semibold font-mono text-primary group-hover:text-foreground transition-colors">
                                                            {tool.name}
                                                        </span>
                                                    </div>
                                                    {(tool.description || tool.title) && (
                                                        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 italic">
                                                            {tool.description || tool.title}
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <Separator />
                <div className="p-2 bg-muted/10">
                    <p className="text-[10px] text-center text-muted-foreground px-4">
                        AI can automatically call these tools when needed to fulfill your requests.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}
