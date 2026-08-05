import 'reflect-metadata';
import { Body, Controller, HttpStatus, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { deserialize, serialize } from 'superjson';
import { z } from 'zod';
import { IPC_ARGS_SCHEMA_METADATA_KEY, IPC_CONTROLLER_METADATA_KEY, IPC_HANDLE_METADATA_KEY } from '../ipc/Decorators';
import { Controller as CosmoController } from '../controllers/Controller';
import { TYPES } from '../types';
import { httpContainer } from './http-container';

type RpcEnvelope = { ok: true; result: unknown } | { ok: false; error: { code: string; message: string } };
type SerializedSuperJson = Parameters<typeof deserialize>[0];

const rpcRequestSchema = z
    .object({
        args: z.array(z.unknown()),
    })
    .strict();

@Controller('api/rpc')
export class RpcController {
    private readonly handlers = this.buildHandlerMap();

    @Post(':controller/:handler')
    public async invoke(
        @Param('controller') controllerPrefix: string,
        @Param('handler') handlerName: string,
        @Body() body: unknown,
        @Res({ passthrough: true }) response: Response,
    ): Promise<unknown> {
        const routeKey = this.routeKey(controllerPrefix, handlerName);
        const handler = this.handlers.get(routeKey);
        if (!handler) {
            response.status(HttpStatus.NOT_FOUND);
            return this.serialize({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `RPC handler '${routeKey}' was not found.`,
                },
            });
        }

        try {
            const payload = this.deserializeBody(body);
            const parsedArgs = handler.argsSchema.parse(payload.args);
            const result = await handler.method(...parsedArgs);
            response.status(HttpStatus.OK);
            return this.serialize({ ok: true, result: result });
        } catch (error) {
            const isValidationError = error instanceof z.ZodError;
            response.status(isValidationError ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR);
            return this.serialize({
                ok: false,
                error: {
                    code: isValidationError ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
                    message: error instanceof Error ? error.message : 'RPC handler failed.',
                },
            });
        }
    }

    private buildHandlerMap() {
        const handlers = new Map<
            string,
            {
                argsSchema: z.ZodTuple;
                method: (...args: unknown[]) => unknown;
            }
        >();

        const controllers = httpContainer.getAll<CosmoController>(TYPES.Controller);
        for (const controller of controllers) {
            const controllerPrefix = Reflect.getMetadata(IPC_CONTROLLER_METADATA_KEY, controller.constructor);
            const handleMetadata = Reflect.getMetadata(IPC_HANDLE_METADATA_KEY, controller.constructor) || {};
            const argSchemas = Reflect.getMetadata(IPC_ARGS_SCHEMA_METADATA_KEY, controller.constructor) || {};

            for (const methodName in handleMetadata) {
                const handlerName = handleMetadata[methodName];
                const argsSchema = argSchemas[methodName];
                const maybeMethod = (controller as Record<string, unknown>)[methodName];
                if (!argsSchema || typeof maybeMethod !== 'function') {
                    continue;
                }
                handlers.set(this.routeKey(controllerPrefix, handlerName), {
                    argsSchema: argsSchema,
                    method: maybeMethod.bind(controller) as (...args: unknown[]) => unknown,
                });
            }
        }

        return handlers;
    }

    private deserializeBody(body: unknown): { args: unknown[] } {
        const decoded =
            body && typeof body === 'object' && 'json' in body ? deserialize(body as SerializedSuperJson) : body;
        return rpcRequestSchema.parse(decoded);
    }

    private serialize(envelope: RpcEnvelope): unknown {
        return serialize(envelope);
    }

    private routeKey(controllerPrefix: string, handlerName: string): string {
        return `${controllerPrefix}/${handlerName}`;
    }
}
