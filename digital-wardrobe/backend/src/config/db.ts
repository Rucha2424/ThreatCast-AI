import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async (): Promise<typeof mongoose | void> => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/digital-wardrobe';

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
