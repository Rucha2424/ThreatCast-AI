import { Router } from 'express';
import multer from 'multer';
import { authenticateFirebaseUser } from '../middleware/auth';
import { uploadWardrobeItem, getWardrobeItems } from '../controllers/wardrobeController';

const router = Router();

// Configure Multer for memory storage of uploaded clothing photos (limit 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

// Protected Routes
router.post('/', authenticateFirebaseUser, upload.single('image'), uploadWardrobeItem);
router.get('/', authenticateFirebaseUser, getWardrobeItems);

export default router;
