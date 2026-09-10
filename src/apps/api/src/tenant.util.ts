import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from './auth.types';

/** CENTRAL_ADMIN is the only role permitted to see data across all states. */
export function stateScope(user: AuthUser) {
  if (user.roles.includes('CENTRAL_ADMIN')) return {};
  if (!user.stateCode) throw new ForbiddenException('User has no assigned state');
  return { stateCode: user.stateCode };
}

export function assertStateAccess(user: AuthUser, resourceStateCode: string | null | undefined) {
  if (user.roles.includes('CENTRAL_ADMIN')) return;
  if (!user.stateCode || resourceStateCode !== user.stateCode) throw new ForbiddenException('Resource is outside your assigned state');
}
