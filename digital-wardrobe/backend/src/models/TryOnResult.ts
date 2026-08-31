import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import crypto from 'crypto';

export type TryOnStatus = 'saved' | 'favorited' | 'rejected';

export const TRY_ON_STATUSES: TryOnStatus[] = ['saved', 'favorited', 'rejected'];

export interface ITryOnResult extends Document {
  userId: Types.ObjectId;
  referencePhotoUrl: string;
  garmentItemId: Types.ObjectId;
  resultImageUrl: string;
  status: TryOnStatus;
  cacheKey: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generates a deterministic SHA-256 hash cache key for a try-on request
 */
export function generateTryOnCacheKey(
  userId: string | Types.ObjectId,
  garmentItemId: string | Types.ObjectId,
  referencePhotoUrl: string
): string {
  const payload = `${String(userId)}:${String(garmentItemId)}:${referencePhotoUrl.trim()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const TryOnResultSchema: Schema<ITryOnResult> = new Schema<ITryOnResult>(
  {
    // Reference to the User requesting and viewing the virtual try-on render
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Full body or portrait reference photograph URL of the user used for virtual fit rendering
    referencePhotoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    // Reference to the specific garment piece from the user's wardrobe being virtually tried on
    garmentItemId: {
      type: Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      required: true,
      index: true,
    },
    // Generated image URL showing the virtual try-on result rendered by the AI vision pipeline
    resultImageUrl: {
      type: String,
      required: true,
    },
    // User feedback/triage state (saved, favorited, rejected) to curate try-on history and preferences
    status: {
      type: String,
      enum: TRY_ON_STATUSES,
      default: 'saved',
      index: true,
    },
    // SHA-256 hash of (userId + garmentItemId + referencePhotoUrl) to prevent redundant AI model invocations
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    // Automatically manages createdAt and updatedAt timestamps for history tracking and cache TTL
    timestamps: true,
  }
);

// Pre-validate hook to automatically compute the deterministic cacheKey if not provided
TryOnResultSchema.pre<ITryOnResult>('validate', function (next) {
  if (!this.cacheKey && this.userId && this.garmentItemId && this.referencePhotoUrl) {
    this.cacheKey = generateTryOnCacheKey(
      this.userId,
      this.garmentItemId,
      this.referencePhotoUrl
    );
  }
  next();
});

// Compound index to quickly fetch all try-on results for a user sorted by creation date
TryOnResultSchema.index({ userId: 1, createdAt: -1 });

export const TryOnResult: Model<ITryOnResult> = mongoose.model<ITryOnResult>(
  'TryOnResult',
  TryOnResultSchema
);
export default TryOnResult;
