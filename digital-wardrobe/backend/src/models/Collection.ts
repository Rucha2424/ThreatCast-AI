import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ICollection extends Document {
  userId: Types.ObjectId;
  name: string;
  itemIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema: Schema<ICollection> = new Schema<ICollection>(
  {
    // Reference to the User who created and curated this custom collection / lookbook
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // User-assigned name for the outfit bundle or theme (e.g. "Party Wear", "Casual", "Summer Vacation")
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Array of WardrobeItem references that make up this curated look or collection
    itemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'WardrobeItem',
        required: true,
      },
    ],
  },
  {
    // Automatically manages createdAt and updatedAt timestamps for sorting lookbooks chronologically
    timestamps: true,
  }
);

// Compound index to quickly look up a user's collection by name or list all user collections
CollectionSchema.index({ userId: 1, name: 1 });

export const Collection: Model<ICollection> = mongoose.model<ICollection>(
  'Collection',
  CollectionSchema
);
export default Collection;
