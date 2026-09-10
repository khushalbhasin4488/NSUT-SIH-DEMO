import { assertStateAccess, stateScope } from '../src/tenant.util';
import { ForbiddenException } from '@nestjs/common';

describe('tenant scoping', () => {
  it('scopes non-central-admin users to their own state', () => {
    expect(stateScope({ sub: '1', roles: ['STATE_ADMIN'], stateCode: 'DL' })).toEqual({ stateCode: 'DL' });
  });

  it('does not scope central admins', () => {
    expect(stateScope({ sub: '1', roles: ['CENTRAL_ADMIN'] })).toEqual({});
  });

  it('rejects access to a resource outside the user state', () => {
    expect(() => assertStateAccess({ sub: '1', roles: ['STATE_ADMIN'], stateCode: 'DL' }, 'MH')).toThrow(ForbiddenException);
  });

  it('allows central admins to access any state resource', () => {
    expect(() => assertStateAccess({ sub: '1', roles: ['CENTRAL_ADMIN'] }, 'MH')).not.toThrow();
  });
});
