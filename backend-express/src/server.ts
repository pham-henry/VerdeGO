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
import testRoutes from './routes/test.routes';
import goalsRoutes from './routes/goals.routes';
import { authenticateToken } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

// Handle uncaught exceptions and unhandled promise rejections
// These handlers prevent the server from crashing and getting stuck in restart loops
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception (this should not happen):', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  // Log but don't exit - let the error handler middleware deal with it
  // Exiting would cause ts-node-dev to restart, potentially causing a loop
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Promise Rejection (this should not happen):', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  // Log but don't exit - errors should be caught in route handlers
});

const app = express();
const PORT = Number(process.env.PORT) || 8080;

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

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (all require valid access token)
const protectedRouter = express.Router();
protectedRouter.use(authenticateToken);
protectedRouter.use('/users', userRoutes);
protectedRouter.use('/', commutesRoutes);
protectedRouter.use('/', emissionsRoutes);
protectedRouter.use('/', recommenderRoutes);
protectedRouter.use('/goals', goalsRoutes);
protectedRouter.use('/test', testRoutes);
app.use('/api', protectedRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

export default app;


