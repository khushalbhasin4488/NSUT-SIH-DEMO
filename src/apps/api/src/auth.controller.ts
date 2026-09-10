import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from './tenant.decorator';
import { AuthUser } from './auth.types';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { PrismaService } from './prisma.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('me') me(@CurrentUser() user: AuthUser) { return { user }; }
  @Get('config') @Public() config() { return { issuer: process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/legal-metrology', clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'metrology-web', audience: process.env.KEYCLOAK_CLIENT_ID ?? 'metrology-api' }; }
  @Get('audit-events')
  @Roles('CENTRAL_ADMIN')
  auditEvents() { return this.prisma.auditLog.findMany({ where: { entityType: 'auth' }, orderBy: { createdAt: 'desc' }, take: 200 }); }
}
