import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
    @Get()
    public getHealth(): { ok: true; runtime: 'http' } {
        return {
            ok: true,
            runtime: 'http',
        };
    }
}
