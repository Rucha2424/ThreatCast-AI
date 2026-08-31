import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBudgetRange {
  min: number;
  max: number;
}

export interface IUser extends Document {
  firebaseUid: string;
  name: string;
  email: string;
  bodyType?: string;
  skinTone?: string;
  stylePreferences: string[];
  budgetRange?: IBudgetRange;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema<IUser>(
  {
    // Unique identifier mapped directly from Firebase Auth for secure user identification
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // User's full display name for personalization across the app
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // User's contact email address used for communication and account lookup
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Body silhouette or shape classification used by virtual try-on and fit recommendation algorithms
    bodyType: {
      type: String,
      trim: true,
    },
    // Skin tone descriptor or color code used to recommend flattering color palettes
    skinTone: {
      type: String,
      trim: true,
    },
    // Array of preferred fashion aesthetics (e.g. "minimalist", "streetwear") for styling recommendations
    stylePreferences: {
      type: [String],
      default: [],
    },
    // Budget boundaries ({ min, max }) used to filter shopping recommendations and price-based styling
    budgetRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
  },
  {
    // Automatically manages createdAt and updatedAt timestamps for audit and temporal queries
    timestamps: true,
  }
);

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;
