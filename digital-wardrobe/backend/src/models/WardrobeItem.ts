import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type WardrobeCategory = 'top' | 'bottom' | 'dress' | 'footwear' | 'accessory' | 'outerwear';

export const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  'top',
  'bottom',
  'dress',
  'footwear',
  'accessory',
  'outerwear',
];

export interface IWardrobeItem extends Document {
  userId: Types.ObjectId;
  originalImageUrl: string;
  cleanedImageUrl?: string | null;
  category: WardrobeCategory;
  color: string;
  occasionTags: string[];
  brand?: string;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

const WardrobeItemSchema: Schema<IWardrobeItem> = new Schema<IWardrobeItem>(
  {
    // Reference to the User who owns this wardrobe piece
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Raw photo URL of the clothing item uploaded by the user
    originalImageUrl: {
      type: String,
      required: true,
    },
    // Background-removed or segmented garment image URL for virtual try-on and wardrobe grids
    cleanedImageUrl: {
      type: String,
      default: null,
    },
    // Clothing taxonomy bucket used for outfit construction and closet organization
    category: {
      type: String,
      enum: WARDROBE_CATEGORIES,
      default: 'top',
      required: true,
      index: true,
    },
    // Primary color name or hex code for color-coordination and outfit matching
    color: {
      type: String,
      default: 'unspecified',
      required: true,
      trim: true,
    },
    // Event/context tags (e.g. "party wear", "casual", "college wear") to categorize items by suitable occasions
    occasionTags: {
      type: [String],
      default: [],
      index: true,
    },
    // Fashion label or designer of the garment for user reference and style profiling
    brand: {
      type: String,
      trim: true,
    },
    // Purchase or estimated cost of the item used for wardrobe value tracking and budget analytics
    price: {
      type: Number,
      min: 0,
    },
  },
  {
    // Automatically manages createdAt and updatedAt timestamps for closet sorting and activity feeds
    timestamps: true,
  }
);

// Compound index to optimize filtering a user's closet by specific garment categories
WardrobeItemSchema.index({ userId: 1, category: 1 });

// Compound index to optimize filtering a user's closet by occasion tags
WardrobeItemSchema.index({ userId: 1, occasionTags: 1 });

export const WardrobeItem: Model<IWardrobeItem> = mongoose.model<IWardrobeItem>(
  'WardrobeItem',
  WardrobeItemSchema
);
export default WardrobeItem;
