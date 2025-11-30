import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { corsConfig } from './config/cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import commutesRoutes from './routes/commutes.routes';
import emissionsRoutes from './routes/emissions.routes';
import recommenderRoutes from './routes/recommender.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});


// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(corsConfig));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', commutesRoutes);
app.use('/api', emissionsRoutes);
app.use('/api', recommenderRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;


