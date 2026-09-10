import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from './prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (required.some((role: string) => user?.roles?.includes(role))) return true;
    await this.prisma.auditLog.create({
      data: { actorId: user?.sub, action: 'AUTHZ_DENIED', entityType: 'auth', entityId: user?.sub ?? 'anonymous', metadata: { path: `${request.method} ${request.url}`, requiredRoles: required, userRoles: user?.roles } },
    }).catch(() => undefined);
    throw new ForbiddenException('Insufficient role for this operation');
  }
}
