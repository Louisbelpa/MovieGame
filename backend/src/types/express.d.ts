import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string | null;
        displayName: string;
        avatarUrl: string | null;
      } | null;
      /** Raw `user_sessions.id` when auth resolved (cookie or Bearer). */
      userSessionId?: string;
    }
  }
}
