import type { DynamicModule, Type } from '@nestjs/common';

// Fallback stub in cosmo-studio; cosmo-cloud overrides @ee/* to return enterprise NestJS modules.
export function getEnterpriseModules(): Array<Type<unknown> | DynamicModule> {
    return [];
}
