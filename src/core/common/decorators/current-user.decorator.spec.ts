import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { Request } from 'express';

import type { AuthenticatedUser } from '@common/types/jwt.payload';
import { CurrentUser } from './current-user.decorator';

interface CurrentUserMetadata {
  data: keyof AuthenticatedUser | undefined;
  factory: (
    data: keyof AuthenticatedUser | undefined,
    context: ExecutionContext,
  ) => unknown;
}

class TestController {
  handler(@CurrentUser('email') _email: string): void {
    return;
  }
}

describe('CurrentUser', () => {
  it('returns the requested property from the authenticated request user', () => {
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'handler',
    ) as Record<string, CurrentUserMetadata>;
    const currentUser = Object.values(metadata)[0];
    const request = {
      user: { email: 'ada@example.com' },
    } as unknown as Request;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(currentUser.factory(currentUser.data, context)).toBe(
      'ada@example.com',
    );
  });
});
