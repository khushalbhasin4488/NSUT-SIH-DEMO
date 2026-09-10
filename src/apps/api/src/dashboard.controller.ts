import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';
import { stateScope } from './tenant.util';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    const stakeholderWhere = stateScope(user);
    const applicationWhere = { applicant: stateScope(user) };
    const [stakeholders, applications, scheduled, issued, failed] = await Promise.all([
      this.prisma.stakeholder.count({ where: stakeholderWhere }),
      this.prisma.application.count({ where: applicationWhere }),
      this.prisma.application.count({ where: { ...applicationWhere, status: 'SCHEDULED' } }),
      this.prisma.application.count({ where: { ...applicationWhere, status: 'CERTIFICATE_ISSUED' } }),
      this.prisma.application.count({ where: { ...applicationWhere, status: 'VERIFICATION_FAILED' } }),
    ]);
    return { stakeholders, applications, scheduled, certificatesIssued: issued, failedVerifications: failed };
  }
}
