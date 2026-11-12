import * as fs from 'fs';
import * as path from 'path';
import { inject, injectable } from 'inversify';
import { Workspace, WorkspaceCreateInput, WorkspaceReachabilityResult, WorkspaceUpdateInput } from '../dto';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { CORETYPES } from '../types/types';
import { validateAndCanonicalizePath } from '../utils/pathSecurity';
import { isValidUuid } from '../utils/uuid';

@injectable()
export class WorkspaceService {
    constructor(
        @inject(CORETYPES.WorkspaceRepository)
        private workspaceRepository: WorkspaceRepository,
    ) {}

    /**
     * Lists all registered workspaces.
     */
    public async list(): Promise<Workspace[]> {
        return this.workspaceRepository.listAll();
    }

    /**
     * Finds a workspace by unique identifier.
     */
    public async get(id: string): Promise<Workspace | undefined> {
        return this.workspaceRepository.getById(id);
    }

    /**
     * Finds a workspace by canonical path.
     */
    public async getByCanonicalPath(canonicalPath: string): Promise<Workspace | undefined> {
        return this.workspaceRepository.findByCanonicalPath(canonicalPath);
    }

    /**
     * Registers a new workspace folder after security validation and canonicalization.
     */
    public async create(input: WorkspaceCreateInput): Promise<Workspace> {
        const validation = await validateAndCanonicalizePath(input.path);
        if (!validation.isValid || !validation.canonicalPath) {
            throw new Error(validation.error ?? 'Invalid workspace path');
        }

        const existing = await this.workspaceRepository.findByCanonicalPath(validation.canonicalPath);
        if (existing) {
            throw new Error(`A workspace with this path already exists: ${validation.canonicalPath}`);
        }

        const derivedName = input.name?.trim() || path.basename(validation.canonicalPath) || 'Workspace';

        return this.workspaceRepository.create({
            name: derivedName,
            canonicalPath: validation.canonicalPath,
            rawPath: input.path.trim(),
        });
    }

    /**
     * Updates an existing workspace name and/or directory path.
     */
    public async update(id: string, input: WorkspaceUpdateInput): Promise<Workspace> {
        const existing = await this.workspaceRepository.getById(id);
        if (!existing) {
            throw new Error(`Workspace not found: ${id}`);
        }

        const updates: Partial<Pick<Workspace, 'name' | 'canonicalPath' | 'rawPath'>> = {};

        if (input.name !== undefined) {
            const trimmedName = input.name.trim();
            if (!trimmedName) {
                throw new Error('Workspace name must not be empty');
            }
            updates.name = trimmedName;
        }

        if (input.path !== undefined) {
            const validation = await validateAndCanonicalizePath(input.path);
            if (!validation.isValid || !validation.canonicalPath) {
                throw new Error(validation.error ?? 'Invalid workspace path');
            }

            const conflict = await this.workspaceRepository.findByCanonicalPath(validation.canonicalPath);
            if (conflict && conflict.id !== id) {
                throw new Error(`A workspace with this path already exists: ${validation.canonicalPath}`);
            }

            updates.canonicalPath = validation.canonicalPath;
            updates.rawPath = input.path.trim();
            if (!updates.name && !input.name) {
                updates.name = path.basename(validation.canonicalPath) || existing.name;
            }
        }

        const updated = await this.workspaceRepository.update(id, updates);
        if (!updated) {
            throw new Error(`Failed to update workspace: ${id}`);
        }

        return updated;
    }

    /**
     * Relocates a workspace to a new directory path.
     */
    public async relocatePath(id: string, newPath: string): Promise<Workspace> {
        return this.update(id, { path: newPath });
    }

    /**
     * Deletes a workspace registration.
     */
    public async delete(id: string): Promise<boolean> {
        const existing = await this.workspaceRepository.getById(id);
        if (!existing) {
            return false;
        }
        return this.workspaceRepository.delete(id);
    }

    /**
     * JIT reachability check: verifies that the registered canonical path is currently accessible on disk.
     */
    public async validateReachability(idOrPath: string): Promise<WorkspaceReachabilityResult> {
        let canonicalPath = idOrPath;

        // Check if argument is a UUID matching an existing workspace
        if (isValidUuid(idOrPath)) {
            const ws = await this.workspaceRepository.getById(idOrPath);
            if (ws) {
                canonicalPath = ws.canonicalPath;
            }
        } else {
            const ws = await this.workspaceRepository.findByCanonicalPath(idOrPath);
            if (ws) {
                canonicalPath = ws.canonicalPath;
            }
        }

        try {
            const stat = await fs.promises.stat(canonicalPath);
            if (!stat.isDirectory()) {
                return {
                    reachable: false,
                    canonicalPath: canonicalPath,
                    error: `Workspace path is not a directory: ${canonicalPath}`,
                };
            }
            return {
                reachable: true,
                canonicalPath: canonicalPath,
            };
        } catch {
            return {
                reachable: false,
                canonicalPath: canonicalPath,
                error: `Workspace path does not exist or is inaccessible: ${canonicalPath}`,
            };
        }
    }
}
