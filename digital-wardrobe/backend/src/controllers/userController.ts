import { Request, Response } from 'express';
import { User, IUser } from '../models/User';

/**
 * Synchronizes the Firebase authenticated user with the MongoDB database.
 * Creates a new User document if it does not exist, or returns the existing record.
 */
export async function syncUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || !req.user.uid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authenticated user attached to request',
      });
      return;
    }

    const { uid, email } = req.user;
    const { name, bodyType, skinTone, stylePreferences, budgetRange } = req.body || {};

    // Check if user document already exists
    let user = await User.findOne({ firebaseUid: uid });
    let isNew = false;

    if (!user) {
      // Determine default display name if not provided
      const resolvedName =
        name || (email ? email.split('@')[0] : 'User');

      user = new User({
        firebaseUid: uid,
        email: email || req.body.email || `${uid}@placeholder.com`,
        name: resolvedName,
        bodyType: bodyType || undefined,
        skinTone: skinTone || undefined,
        stylePreferences: Array.isArray(stylePreferences) ? stylePreferences : [],
        budgetRange: budgetRange || { min: 0, max: 0 },
      });

      await user.save();
      isNew = true;
    } else {
      // Optionally update profile fields if provided
      let hasUpdates = false;
      if (name && user.name !== name) {
        user.name = name;
        hasUpdates = true;
      }
      if (bodyType && user.bodyType !== bodyType) {
        user.bodyType = bodyType;
        hasUpdates = true;
      }
      if (skinTone && user.skinTone !== skinTone) {
        user.skinTone = skinTone;
        hasUpdates = true;
      }
      if (stylePreferences && Array.isArray(stylePreferences)) {
        user.stylePreferences = stylePreferences;
        hasUpdates = true;
      }
      if (budgetRange) {
        user.budgetRange = budgetRange;
        hasUpdates = true;
      }

      if (hasUpdates) {
        await user.save();
      }
    }

    res.status(isNew ? 201 : 200).json({
      status: 'success',
      isNew,
      user,
    });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to sync user data with database',
      details: error?.message || error,
    });
  }
}
