import { homedir } from 'os';
import path from 'path';

/**
 * Central utility for all standard CosmoStudio directories.
 * Keeps all agent installations, runtimes, skills, and downloads
 * centrally located under ~/.cosmo-studio/.
 */
export class CosmoPaths {
    /**
     * Root directory for all CosmoStudio user data (~/.cosmo-studio).
     * Can be overridden by the COSMO_HOME environment variable for testing or custom setups.
     */
    public static getHomeDir(): string {
        return process.env.COSMO_HOME ? path.resolve(process.env.COSMO_HOME) : path.join(homedir(), '.cosmo-studio');
    }

    /**
     * Central directory for ACP binary agent installations (~/.cosmo-studio/acp-agents).
     */
    public static getAcpAgentsDir(): string {
        return path.join(this.getHomeDir(), 'acp-agents');
    }

    /**
     * Central directory for runtime dependencies (e.g. ~/.cosmo-studio/runtime/node).
     */
    public static getRuntimeDir(subpath?: string): string {
        const base = path.join(this.getHomeDir(), 'runtime');
        return subpath ? path.join(base, subpath) : base;
    }

    /**
     * Central directory for skills (~/.cosmo-studio/skills).
     */
    public static getSkillsDir(): string {
        return path.join(this.getHomeDir(), 'skills');
    }
}
