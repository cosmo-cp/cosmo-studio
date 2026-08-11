import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { WorkflowRunStreamingService } from '../services/WorkflowRunStreamingService';
import { TYPES } from '../types';
import { httpContainer } from './http-container';

const routeParamsSchema = z.strictObject({ runId: z.string().uuid() });

@Controller('api/workflows/runs')
export class WorkflowRunHttpController {
    private readonly workflowRunStreamingService = httpContainer.get<WorkflowRunStreamingService>(
        TYPES.WorkflowRunStreamingService,
    );

    @Get(':runId/stream')
    public async streamRun(
        @Param() params: unknown,
        @Req() request: Request,
        @Res() response: Response,
    ): Promise<void> {
        const { runId } = routeParamsSchema.parse(params);
        const afterSequence = Number.parseInt((request.query.afterSequence as string) ?? '0', 10);
        const abortController = new AbortController();
        request.on('close', () => {
            return abortController.abort();
        });

        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');

        for await (const envelope of this.workflowRunStreamingService.streamRunEvents(
            runId,
            abortController.signal,
            Number.isFinite(afterSequence) ? afterSequence : 0,
        )) {
            response.write(`event: workflow-run\n`);
            response.write(`data: ${JSON.stringify(envelope)}\n\n`);
        }

        response.end();
    }
}
