import { AuthenticatedUser } from './jwt.payload';

declare module 'express' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
  }
}
