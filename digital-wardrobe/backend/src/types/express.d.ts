import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthUser {
  uid: string;
  email?: string;
  decodedToken?: DecodedIdToken;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
