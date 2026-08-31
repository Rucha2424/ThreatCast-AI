import { Router } from 'express';
import { authenticateFirebaseUser } from '../middleware/auth';
import { syncUser } from '../controllers/userController';

const router = Router();

// Protected route to synchronize/create User document based on Firebase ID token
router.post('/sync', authenticateFirebaseUser, syncUser);

export default router;
