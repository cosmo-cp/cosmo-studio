import {Controller, Get, HttpCode, Post, Req, Res, Body} from "@nestjs/common";
import type {Request, Response} from "express";
import {pipeUIMessageStreamToResponse, type UIMessage} from "ai";
import {z} from "zod";
import type {ChatSendMessageArgs} from "core/dto";
import {CORETYPES} from "core/types/types";
import {ChatService} from "core/services/ChatService";
import {ChatStreamingService} from "../services/ChatStreamingService";
import {TYPES} from "../types";
import {httpContainer} from "./http-container";

const chatRequestSchema = z.object({
    id: z.string().min(1),
    messages: z.custom<UIMessage[]>(),
    metadata: z.object({
        modelId: z.string().optional(),
        runtime: z.enum(["model", "agent"]).optional(),
        agentId: z.string().nullable().optional(),
        agentCwd: z.string().nullable().optional(),
        personaId: z.string().nullable().optional(),
        personaName: z.string().optional(),
    }).optional(),
}).passthrough();

@Controller("api/chat")
export class ChatHttpController {
    private readonly chatStreamingService = httpContainer.get<ChatStreamingService>(TYPES.ChatStreamingService);
    private readonly chatService = httpContainer.get<ChatService>(CORETYPES.ChatService);

    @Post()
    public async sendMessage(
        @Body() body: unknown,
        @Req() request: Request,
        @Res() response: Response
    ): Promise<void> {
        const parsed = chatRequestSchema.parse(body);
        const chat = await this.chatService.getChatById(parsed.id);
        const runtime = parsed.metadata?.runtime ?? chat?.selectedRuntime ?? "model";
        const modelIdentifier = parsed.metadata?.modelId ?? this.getModelIdentifierFromChatRecord(chat);
        const agentId = parsed.metadata?.agentId ?? chat?.selectedAgentId ?? null;
        if (runtime === "model" && !modelIdentifier) {
            response.status(400).json({error: "modelId is required"});
            return;
        }
        if (runtime === "agent" && !agentId) {
            response.status(400).json({error: "agentId is required"});
            return;
        }

        const abortController = new AbortController();
        request.on("close", () => abortController.abort());

        const args: ChatSendMessageArgs = {
            chatId: parsed.id,
            messages: parsed.messages,
            streamChannel: `http-chat-stream-${parsed.id}`,
            modelIdentifier: modelIdentifier ?? undefined,
            personaId: parsed.metadata?.personaId ?? undefined,
            personaName: parsed.metadata?.personaName,
            runtime,
            agentId,
            agentCwd: parsed.metadata?.agentCwd ?? null,
        };

        const stream = await this.chatStreamingService.createMessageStream(args, abortController.signal);
        pipeUIMessageStreamToResponse({
            response,
            status: 200,
            stream,
        });
    }

    @Get(":chatId/stream")
    @HttpCode(204)
    public reconnectToStream(): void {
        return;
    }

    private getModelIdentifierFromChatRecord(chat: Awaited<ReturnType<ChatService["getChatById"]>>): string | null {
        if (!chat?.selectedProvider || !chat.selectedModelId) {
            return null;
        }
        return `${chat.selectedProvider}:${chat.selectedModelId}`;
    }
}
