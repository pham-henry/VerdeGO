import { CorsOptions } from 'cors';

// Support multiple origins or allow all in development
const getCorsOrigin = (): string | string[] | boolean => {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (!corsOrigin) {
    // In development, allow all origins if CORS_ORIGIN is not set
    return process.env.NODE_ENV === 'production' ? 'http://localhost:5173' : true;
  }
  
  // Support comma-separated origins
  if (corsOrigin.includes(',')) {
    return corsOrigin.split(',').map(origin => origin.trim());
  }
  
  return corsOrigin;
};

export const corsConfig: CorsOptions = {
  origin: getCorsOrigin(),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600,
};


