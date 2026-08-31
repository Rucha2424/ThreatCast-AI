import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import userRoutes from './routes/userRoutes';
import wardrobeRoutes from './routes/wardrobeRoutes';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads folder statically for dev fallback
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/wardrobe', wardrobeRoutes);

// Connect to Database and Start Server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

export default app;
