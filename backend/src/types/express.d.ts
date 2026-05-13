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
    }
  }
}
