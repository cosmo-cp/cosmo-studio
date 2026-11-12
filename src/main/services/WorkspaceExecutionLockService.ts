import * as path from 'path';
import { injectable } from 'inversify';

export class WorkspaceBusyError extends Error {
    constructor(
        public readonly path: string,
        public readonly ownerType: 'task' | 'chat',
        public readonly ownerId: string,
        message?: string,
    ) {
        super(message ?? `Workspace "${path}" is currently in use by ${ownerType} (${ownerId}).`);
        this.name = 'WorkspaceBusyError';
    }
}

export interface WorkspaceLease {
    canonicalPath: string;
    ownerType: 'task' | 'chat';
    ownerId: string;
    acquiredAt: Date;
    abortListener?: () => void;
}

/**
 * Checks whether two filesystem paths are equal or have a parent-child containment hierarchy.
 */
export function isPathOverlapping(pathA: string, pathB: string): boolean {
    const normA = path.resolve(pathA);
    const normB = path.resolve(pathB);
    const relAtoB = path.relative(normA, normB);
    const relBtoA = path.relative(normB, normA);
    const aContainsB = !relAtoB.startsWith('..') && !path.isAbsolute(relAtoB);
    const bContainsA = !relBtoA.startsWith('..') && !path.isAbsolute(relBtoA);
    return aContainsB || bContainsA;
}

@injectable()
export class WorkspaceExecutionLockService {
    private readonly activeLeases = new Map<string, WorkspaceLease>();

    /**
     * Attempts to acquire an execution lease on a workspace directory.
     * Throws WorkspaceBusyError if the directory or any containing/nested directory is already leased.
     */
    public acquireLease(
        canonicalPath: string,
        ownerType: 'task' | 'chat',
        ownerId: string,
        abortSignal?: AbortSignal,
    ): void {
        const normalized = path.resolve(canonicalPath);

        // Check for hierarchical path overlap with existing leases
        for (const [existingPath, lease] of this.activeLeases.entries()) {
            if (isPathOverlapping(normalized, existingPath)) {
                // If it's already leased by the SAME owner, allow re-entrancy
                if (lease.ownerType === ownerType && lease.ownerId === ownerId) {
                    return;
                }
                throw new WorkspaceBusyError(
                    normalized,
                    lease.ownerType,
                    lease.ownerId,
                    `Workspace "${normalized}" is currently in use by ${lease.ownerType} (${lease.ownerId}).`,
                );
            }
        }

        let abortListener: (() => void) | undefined;
        if (abortSignal) {
            if (abortSignal.aborted) {
                return;
            }
            abortListener = () => {
                this.releaseLease(normalized, ownerId);
            };
            abortSignal.addEventListener('abort', abortListener, { once: true });
        }

        this.activeLeases.set(normalized, {
            canonicalPath: normalized,
            ownerType: ownerType,
            ownerId: ownerId,
            acquiredAt: new Date(),
            abortListener: abortListener,
        });
    }

    /**
     * Releases an active lease on a workspace directory held by ownerId.
     */
    public releaseLease(canonicalPath: string, ownerId: string): boolean {
        const normalized = path.resolve(canonicalPath);
        const lease = this.activeLeases.get(normalized);
        if (!lease) {
            return false;
        }

        if (lease.ownerId !== ownerId) {
            return false;
        }

        this.activeLeases.delete(normalized);
        return true;
    }

    /**
     * Checks if a workspace directory or any nested/parent path is currently leased.
     */
    public getActiveLease(canonicalPath: string): WorkspaceLease | undefined {
        const normalized = path.resolve(canonicalPath);
        for (const [existingPath, lease] of this.activeLeases.entries()) {
            if (isPathOverlapping(normalized, existingPath)) {
                return lease;
            }
        }
        return undefined;
    }

    /**
     * Returns true if the given path is currently locked by any active lease.
     */
    public isWorkspaceBusy(canonicalPath: string): boolean {
        return this.getActiveLease(canonicalPath) !== undefined;
    }
}
