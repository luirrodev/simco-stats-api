/**
 * JWT Payload Token Interface
 */
export interface PayloadToken {
  /** Subject identifier, always the base `users.id` regardless of userType. */
  sub: number;

  /** Distinguishes the session audience; determines which JWT strategy/guard accepts the token. */
  type: 'staff' | 'customer';

  /** Server-side session that can revoke all access tokens issued for it. */
  sid: string;

  /** Role ID from roles table */
  roleId?: number;

  /** Role version - used for permission cache invalidation.
   *  If this doesn't match the current role version, user must re-authenticate
   */
  roleVersion: number;
}

/**
 * Authenticated user attached to `request.user` by the JWT strategies.
 * Extends the token payload with the actual user data loaded from the DB,
 * so consumers (e.g. `@CurrentUser()`) get real user info, not just IDs.
 */
export interface AuthenticatedUser extends PayloadToken {
  id: number;
  email: string;
  firstName: string;
  secondName: string | null;
  lastName: string;
  secondLastName: string | null;
  role: string;
  permissions: string[];
}
