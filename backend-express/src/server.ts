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

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});


// Security middleware
// Configure helmet to be less strict for HTTP (development)
app.use(helmet({
  crossOriginOpenerPolicy: false, // Disable COOP for HTTP
  crossOriginEmbedderPolicy: false, // Disable COEP for HTTP
}));

// CORS configuration
app.use(cors(corsConfig));

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', commutesRoutes);
app.use('/api', emissionsRoutes);
app.use('/api', recommenderRoutes);
app.use('/api/test', testRoutes);

// Debug: Log all registered routes
console.log('Registered routes:');
console.log('  GET /api/health');
console.log('  GET /api/test/hello');

// 404 handler for unmatched routes (must be before error handler)
app.use((req, res, next) => {
  res.status(404).json({
    timestamp: new Date().toISOString(),
    status: 404,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
});

export default app;


