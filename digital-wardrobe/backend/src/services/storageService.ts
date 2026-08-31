import { admin } from '../config/firebase';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure local uploads directory exists for local/dev fallback
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface UploadOptions {
  userId: string;
  folder?: 'originals' | 'cleaned' | 'tryon';
  contentType?: string;
  originalName?: string;
}

/**
 * Uploads a buffer to Firebase Storage (with local fallback if storage is unconfigured)
 */
export async function uploadBufferToStorage(
  buffer: Buffer,
  options: UploadOptions
): Promise<string> {
  const { userId, folder = 'originals', contentType = 'image/jpeg', originalName = 'photo.jpg' } = options;
  const ext = path.extname(originalName) || '.jpg';
  const fileHash = crypto.randomBytes(12).toString('hex');
  const filename = `${fileHash}${ext}`;
  const storagePath = `users/${userId}/${folder}/${filename}`;

  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_PROJECT_ID || 'digital-wardrobe'}.appspot.com`;

  try {
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          userId,
          folder,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make public or generate standard public URL
    try {
      await file.makePublic();
    } catch {
      // Ignored if bucket enforces Uniform Bucket-Level Access
    }

    // Public Firebase Storage URL format
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      storagePath
    )}?alt=media`;

    return publicUrl;
  } catch (storageError: any) {
    console.warn(
      `Firebase Storage upload failed (${storageError.message || storageError}). Using local static storage fallback.`
    );

    // Local dev fallback: save to local uploads directory
    const userFolder = path.join(UPLOADS_DIR, userId, folder);
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }

    const localFilePath = path.join(userFolder, filename);
    fs.writeFileSync(localFilePath, buffer);

    const port = process.env.PORT || 5000;
    return `http://localhost:${port}/uploads/${userId}/${folder}/${filename}`;
  }
}
