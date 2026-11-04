import { inject, injectable } from 'inversify';
import { TaskComment, TaskCommentCreateInput } from '../dto';
import { getCoreLogger } from '../platform/CoreLogger';
import { TaskCommentRepository } from '../repositories/TaskCommentRepository';
import { TaskRepository } from '../repositories/TaskRepository';
import { CORETYPES } from '../types/types';

// Mask common credential formats to prevent accidental secret leakage into database records.
const scrubSecrets = (text: string): string => {
    return text
        .replace(/Bearer\s+[A-Za-z0-9_.-]{20,}/gi, 'Bearer [REDACTED]')
        .replace(/\b(sk-[A-Za-z0-9_-]{20,})\b/g, '[REDACTED_API_KEY]')
        .replace(/\b(ghp_[A-Za-z0-9]{20,})\b/g, '[REDACTED_GITHUB_TOKEN]');
};

@injectable()
export class TaskCommentService {
    constructor(
        @inject(CORETYPES.TaskCommentRepository)
        private taskCommentRepository: TaskCommentRepository,
        @inject(CORETYPES.TaskRepository)
        private taskRepository: TaskRepository,
    ) {}

    // Retrieve the chronological discussion and event log for a given task.
    public async listComments(taskId: string): Promise<TaskComment[]> {
        const existingTask = await this.taskRepository.getById(taskId);
        if (!existingTask) {
            throw new Error(`Task ${taskId} does not exist.`);
        }
        return this.taskCommentRepository.listByTaskId(taskId);
    }

    // Persist a note, agent outcome summary, or system status update with secret scrubbing.
    public async createComment(input: TaskCommentCreateInput): Promise<TaskComment> {
        if (!input.content || input.content.trim().length === 0) {
            throw new Error('Comment content cannot be empty.');
        }

        const existingTask = await this.taskRepository.getById(input.taskId);
        if (!existingTask) {
            throw new Error(`Task ${input.taskId} does not exist.`);
        }

        const scrubbedContent = scrubSecrets(input.content.trim());
        getCoreLogger().info(`Adding comment by ${input.authorLabel} (${input.authorType}) to task ${input.taskId}`);

        return this.taskCommentRepository.create({
            ...input,
            content: scrubbedContent,
        });
    }

    // Retrieve a single comment by identifier for audit or verification.
    public async getById(id: string): Promise<TaskComment | undefined> {
        return this.taskCommentRepository.getById(id);
    }
}
