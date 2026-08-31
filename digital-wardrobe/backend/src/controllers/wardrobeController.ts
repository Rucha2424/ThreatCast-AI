import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { WardrobeItem } from '../models/WardrobeItem';
import { uploadBufferToStorage } from '../services/storageService';
import { removeBackground } from '../services/backgroundRemovalService';

/**
 * Helper to execute asynchronous background image cleanup without blocking the HTTP response.
 */
async function processBackgroundCleanup(
  itemId: Types.ObjectId | string,
  userId: string,
  imageBuffer: Buffer,
  originalName: string
): Promise<void> {
  try {
    console.log(`[Background Task] Starting background removal for item: ${itemId}`);
    const cleanedBuffer = await removeBackground(imageBuffer);

    const cleanedImageUrl = await uploadBufferToStorage(cleanedBuffer, {
      userId,
      folder: 'cleaned',
      contentType: 'image/png',
      originalName: `cleaned_${originalName}.png`,
    });

    const updatedItem = await WardrobeItem.findByIdAndUpdate(
      itemId,
      { cleanedImageUrl },
      { new: true }
    );

    console.log(`[Background Task] Finished cleanup for item ${itemId}: ${cleanedImageUrl}`);
  } catch (error: any) {
    console.error(`[Background Task] Cleanup failed for item ${itemId}:`, error?.message || error);
  }
}

/**
 * POST /api/wardrobe
 * Uploads clothing image, saves item record, and responds immediately.
 * Dispatches background worker to remove background and update cleanedImageUrl later.
 */
export async function uploadWardrobeItem(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'BadRequest', message: 'No image file uploaded' });
      return;
    }

    // 1. Resolve or auto-provision MongoDB User record
    let user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      user = await User.create({
        firebaseUid: req.user.uid,
        email: req.user.email || `${req.user.uid}@placeholder.com`,
        name: req.user.email?.split('@')[0] || 'User',
      });
    }

    const userIdStr = user._id.toString();

    // 2. Upload the original image to storage
    const originalImageUrl = await uploadBufferToStorage(req.file.buffer, {
      userId: userIdStr,
      folder: 'originals',
      contentType: req.file.mimetype,
      originalName: req.file.originalname || 'upload.jpg',
    });

    // 3. Save initial WardrobeItem document with cleanedImageUrl set to null
    const wardrobeItem = new WardrobeItem({
      userId: user._id,
      originalImageUrl,
      cleanedImageUrl: null,
      category: (req.body.category as any) || 'top',
      color: req.body.color || 'unspecified',
      occasionTags: req.body.occasionTags ? JSON.parse(req.body.occasionTags) : [],
      brand: req.body.brand || undefined,
      price: req.body.price ? Number(req.body.price) : undefined,
    });

    await wardrobeItem.save();

    // 4. RESPOND IMMEDIATELY: Don't make the user wait for external AI background removal
    res.status(201).json({
      status: 'success',
      message: 'Item uploaded successfully. Background removal processing asynchronously.',
      item: wardrobeItem,
    });

    // 5. ASYNC BACKGROUND STEP: Trigger cleanup in the background
    processBackgroundCleanup(
      wardrobeItem._id,
      userIdStr,
      req.file.buffer,
      req.file.originalname || 'upload'
    );
  } catch (error: any) {
    console.error('Error uploading wardrobe item:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to upload wardrobe item',
      details: error?.message || error,
    });
  }
}

/**
 * GET /api/wardrobe
 * Returns all wardrobe items for the authenticated user.
 */
export async function getWardrobeItems(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      res.status(200).json({ status: 'success', count: 0, items: [] });
      return;
    }

    const items = await WardrobeItem.find({ userId: user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Error fetching wardrobe items:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch wardrobe items',
      details: error?.message || error,
    });
  }
}
