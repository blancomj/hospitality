import { UserRow } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}
