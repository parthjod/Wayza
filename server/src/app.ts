import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import discoveryRoutes from './modules/discovery/discovery.routes';
import groupRoutes from './modules/group/group.routes';
import chatRoutes from './modules/chat/chat.routes';
import journeyRoutes from './modules/journey/journey.routes';
import fareRoutes from './modules/fare/fare.routes';
import reportRoutes from './modules/report/report.routes';
import locationRoutes from './modules/location/location.routes';
import adminRoutes from './modules/admin/admin.routes';
import feedbackRoutes from './modules/feedback/feedback.routes';

const app = express();

// Trust reverse proxy (Nginx / CloudFront) for correct client IP detection in rate limiting
app.set('trust proxy', 1);

// HTTP request logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[REQ] ${req.method} ${req.originalUrl || req.url}`);
  res.on('finish', () => {
    console.log(`[RES] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Health check endpoint (placed before rate limits so it never gets blocked)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Core Middleware ---

// CORS — restricted to frontend URL only (plus local dev ports in development)
const cleanFrontend = env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, '') : '';

export const allowedOrigins = [
  cleanFrontend,
  'https://www.wayza.co.in',
  'https://wayza.co.in',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
].filter(Boolean);

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin || env.NODE_ENV === 'development') return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/(www\.)?wayza\.co\.in$/.test(origin)) return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ['https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', `https://${env.AWS_CLOUDFRONT_DOMAIN}`, 'https://*.amazonaws.com'],
      connectSrc: ["'self'"],
      mediaSrc: [`https://${env.AWS_CLOUDFRONT_DOMAIN}`],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Global rate limit
app.use(globalRateLimit);

// Custom security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
  next();
});

// Strip potentially dangerous characters (belt-and-suspenders)
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
});

function sanitizeObject(obj: any): void {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/fare', fareRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/feedback', feedbackRoutes);


// Global error handler (must be last)
app.use(errorHandler);

export default app;
