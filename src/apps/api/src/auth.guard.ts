import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthUser } from './auth.types';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly issuer = process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/legal-metrology';
  private readonly jwks = createRemoteJWKSet(new URL(`${process.env.KEYCLOAK_JWKS_ISSUER ?? this.issuer}/protocol/openid-connect/certs`));
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    const path = `${request.method} ${request.url}`;
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      await this.recordFailure(path, 'Missing bearer token');
      throw new UnauthorizedException('Bearer token is required');
    }
    try {
      const verifyOptions: { issuer: string; audience?: string } = { issuer: this.issuer };
      if (process.env.KEYCLOAK_AUDIENCE) verifyOptions.audience = process.env.KEYCLOAK_AUDIENCE;
      const { payload } = await jwtVerify(token, this.jwks, verifyOptions);
      const realmRoles = Array.isArray((payload.realm_access as { roles?: unknown })?.roles) ? (payload.realm_access as { roles: string[] }).roles : [];
      const clientRoles = Array.isArray((payload.resource_access as Record<string, { roles?: unknown }>)?.[process.env.KEYCLOAK_CLIENT_ID ?? 'metrology-api']?.roles) ? (payload.resource_access as Record<string, { roles: string[] }>)[process.env.KEYCLOAK_CLIENT_ID ?? 'metrology-api'].roles : [];
      const user: AuthUser = { sub: String(payload.sub), roles: [...new Set([...realmRoles, ...clientRoles])], stateCode: typeof payload.state_code === 'string' ? payload.state_code : undefined, districtCode: typeof payload.district_code === 'string' ? payload.district_code : undefined, email: typeof payload.email === 'string' ? payload.email : undefined, name: typeof payload.name === 'string' ? payload.name : undefined };
      request.user = user;
      return true;
    } catch {
      await this.recordFailure(path, 'Invalid or expired access token');
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private async recordFailure(path: string, reason: string) {
    await this.prisma.auditLog.create({ data: { action: 'AUTH_FAILURE', entityType: 'auth', entityId: 'anonymous', metadata: { path, reason } } }).catch(() => undefined);
  }
}
