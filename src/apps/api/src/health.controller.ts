import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Public } from './public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @Public()
  async health() {
    let database = 'ok';
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { database = 'error'; }
    return { status: database === 'ok' ? 'ok' : 'degraded', service: 'legal-metrology-api', database, timestamp: new Date().toISOString() };
  }
}
