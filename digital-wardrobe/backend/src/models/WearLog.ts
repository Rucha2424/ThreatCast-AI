import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IWearLog extends Document {
  userId: Types.ObjectId;
  itemId: Types.ObjectId;
  wornOn: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WearLogSchema: Schema<IWearLog> = new Schema<IWearLog>(
  {
    // Reference to the User who logged wearing this item
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Reference to the WardrobeItem that was worn on the specified date
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      required: true,
      index: true,
    },
    // The specific calendar date or timestamp when the garment was worn
    wornOn: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    // Automatically manages createdAt and updatedAt timestamps for entry auditing
    timestamps: true,
  }
);

// Compound index to quickly fetch outfit wear history for a user sorted by date worn
WearLogSchema.index({ userId: 1, wornOn: -1 });

// Compound index to calculate wear frequency / cost-per-wear for a specific wardrobe item
WearLogSchema.index({ itemId: 1, wornOn: -1 });

export const WearLog: Model<IWearLog> = mongoose.model<IWearLog>('WearLog', WearLogSchema);
export default WearLog;
