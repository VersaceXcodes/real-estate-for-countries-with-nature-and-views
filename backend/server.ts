import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as jwt from 'jsonwebtoken';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Import PostgreSQL
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Import Zod schemas
import {
  userSchema, createUserInputSchema, updateUserInputSchema,
  propertySchema, createPropertyInputSchema, updatePropertyInputSchema, searchPropertiesInputSchema,
  propertyPhotoSchema, createPropertyPhotoInputSchema, updatePropertyPhotoInputSchema,
  propertyInquirySchema, createPropertyInquiryInputSchema, updatePropertyInquiryInputSchema, searchPropertyInquiriesInputSchema,
  savedPropertySchema, createSavedPropertyInputSchema, updateSavedPropertyInputSchema,
  savedSearchSchema, createSavedSearchInputSchema, updateSavedSearchInputSchema,
  notificationSchema, createNotificationInputSchema, updateNotificationInputSchema, searchNotificationsInputSchema,
  propertyViewSchema, createPropertyViewInputSchema,
  searchHistorySchema, createSearchHistoryInputSchema,
  userSessionSchema, createUserSessionInputSchema, updateUserSessionInputSchema,
  propertyAnalyticsSchema, createPropertyAnalyticsInputSchema, searchPropertyAnalyticsInputSchema,
  inquiryResponseSchema, createInquiryResponseInputSchema, updateInquiryResponseInputSchema
} from './schema';

// PostgreSQL setup
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'your-secret-key' } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
      }
);

const app = express();

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = parseInt(process.env.PORT || '3000');

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!existsSync(storageDir)) {
  mkdirSync(storageDir, { recursive: true });
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
  'https://123real-estate-for-countries-with-nature-and-views.launchpulse.ai',
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.includes('launchpulse.ai') ||
      origin.includes('localhost')
    )) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Session-Id'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 hours
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../vitereact/dist')));

// Serve storage files
app.use('/storage', express.static(storageDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storageDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

/*
Authentication middleware for protected routes
Validates JWT tokens and attaches user information to request
*/
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const client = await pool.connect();
    const result = await client.query(
      'SELECT user_id, email, name, user_type, profile_photo_url, is_verified, email_verified, created_at FROM users WHERE user_id = $1',
      [decoded.user_id]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

/*
Optional authentication middleware that doesn't require authentication
But attaches user info if token is present and valid
*/
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const client = await pool.connect();
    const result = await client.query(
      'SELECT user_id, email, name, user_type, profile_photo_url, is_verified, email_verified, created_at FROM users WHERE user_id = $1',
      [decoded.user_id]
    );
    client.release();
    
    if (result.rows.length > 0) {
      req.user = result.rows[0];
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

/*
@@need:external-api: Email service for sending verification emails, password resets, and notifications
Mock email service for development - replace with actual email service integration
*/
async function sendEmail({ to, subject, content, type = 'general' }) {
  // Mock email sending - in production, integrate with SendGrid, Mailgun, etc.
  console.log(`Mock Email Sent:
    To: ${to}
    Subject: ${subject}
    Type: ${type}
    Content: ${content}
  `);
  
  return {
    success: true,
    messageId: `mock-${uuidv4()}`,
    timestamp: new Date().toISOString()
  };
}

/*
@@need:external-api: Image processing service for photo optimization and resizing
Mock image processing for development - replace with actual image processing service
*/
async function processImage(imagePath, options = {}) {
  // Mock image processing - in production, integrate with Sharp, Cloudinary, etc.
  console.log(`Mock Image Processing:
    Path: ${imagePath}
    Options: ${JSON.stringify(options)}
  `);
  
  return {
    originalPath: imagePath,
    optimizedPath: imagePath,
    thumbnailPath: imagePath,
    fileSize: Math.floor(Math.random() * 1000000) + 500000, // Mock file size
    dimensions: { width: 1024, height: 768 }
  };
}

/*
Utility function to generate JWT tokens
Creates access tokens with user information and expiration
*/
function generateJWT(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/*
Utility function to create user session records
Tracks device information and session metadata for security
*/
async function createUserSession(userId, deviceInfo, ipAddress) {
  const sessionId = uuidv4();
  const token = generateJWT({ user_id: userId });
  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  
  const client = await pool.connect();
  await client.query(
    `INSERT INTO user_sessions (session_id, user_id, jwt_token, refresh_token, device_info, ip_address, is_active, expires_at, created_at, last_activity_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [sessionId, userId, token, refreshToken, deviceInfo, ipAddress, true, expiresAt, new Date().toISOString(), new Date().toISOString()]
  );
  client.release();
  
  return { token, refreshToken, expiresAt };
}

/*
Utility function to create notifications
Handles notification creation and optional email sending
*/
async function createNotification(userId, type, title, message, options: any = {}) {
  const notificationId = uuidv4();
  const {
    relatedPropertyId = null,
    relatedInquiryId = null,
    actionUrl = null,
    priority = 'normal',
    sendEmail = false
  } = options;
  
  const client = await pool.connect();
  
  // Create notification
  await client.query(
    `INSERT INTO notifications (notification_id, user_id, type, title, message, related_property_id, related_inquiry_id, is_read, is_email_sent, action_url, priority, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [notificationId, userId, type, title, message, relatedPropertyId, relatedInquiryId, false, false, actionUrl, priority, new Date().toISOString()]
  );
  
  // Send email if requested
  if (sendEmail) {
    const userResult = await client.query('SELECT email, name FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      await sendEmail({
        to: user.email,
        subject: title,
        content: `Hi ${user.name},\n\n${message}\n\nBest regards,\nNatureEstate Team`,
        type: type
      });
      
      // Update notification to mark email as sent
      await client.query(
        'UPDATE notifications SET is_email_sent = $1, email_sent_at = $2 WHERE notification_id = $3',
        [true, new Date().toISOString(), notificationId]
      );
    }
  }
  
  client.release();
  return notificationId;
}

// ==================== AUTHENTICATION ROUTES ====================

/*
User registration endpoint
Creates new user account with email verification workflow
CRITICAL: No password hashing - stores plain text for development
*/
app.post('/auth/register', async (req, res) => {
  try {
    const validatedData = createUserInputSchema.parse(req.body);
    
    const client = await pool.connect();
    
    // Check if user already exists
    const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', [validatedData.email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    
    // Create user - store password directly (no hashing for development)
    const userId = uuidv4();
    const emailVerificationToken = uuidv4();
    const now = new Date().toISOString();
    
    const result = await client.query(
      `INSERT INTO users (user_id, email, password_hash, name, phone, user_type, profile_photo_url, is_verified, email_verified, email_verification_token, notification_preferences, countries_of_interest, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING user_id, email, name, phone, user_type, profile_photo_url, is_verified, email_verified, created_at`,
      [
        userId,
        validatedData.email.toLowerCase(),
        validatedData.password, // Direct password storage for development
        validatedData.name,
        validatedData.phone || null,
        validatedData.user_type,
        validatedData.profile_photo_url || null,
        false, // Not verified initially
        false, // Email not verified initially
        emailVerificationToken,
        validatedData.notification_preferences || JSON.stringify({ email: true, sms: false, push: true }),
        validatedData.countries_of_interest || null,
        now,
        now
      ]
    );
    
    client.release();
    
    const user = result.rows[0];
    
    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Welcome to NatureEstate - Verify Your Email',
      content: `Welcome to NatureEstate! Please verify your email using token: ${emailVerificationToken}`,
      type: 'verification'
    });
    
    // Generate JWT token
    const sessionData = await createUserSession(
      user.user_id,
      req.headers['user-agent'] || 'Unknown',
      req.ip || req.connection.remoteAddress
    );
    
    res.status(201).json({
      user: user,
      token: sessionData.token,
      refresh_token: sessionData.refreshToken,
      expires_at: sessionData.expiresAt
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid input data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
User login endpoint
Authenticates user credentials and creates session
Direct password comparison for development (no hashing)
*/
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    const client = await pool.connect();
    
    // Find user and verify password (direct comparison for development)
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Direct password comparison (no hashing for development)
    if (password !== user.password_hash) {
      client.release();
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    
    // Update last login timestamp
    await client.query(
      'UPDATE users SET last_login_at = $1 WHERE user_id = $2',
      [new Date().toISOString(), user.user_id]
    );
    
    client.release();
    
    // Generate session
    const sessionData = await createUserSession(
      user.user_id,
      req.headers['user-agent'] || 'Unknown',
      req.ip || req.connection.remoteAddress
    );
    
    // Return user data (excluding sensitive fields)
    const { password_hash, email_verification_token, password_reset_token, ...safeUser } = user;
    
    res.json({
      user: safeUser,
      token: sessionData.token,
      refresh_token: sessionData.refreshToken,
      expires_at: sessionData.expiresAt
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
User logout endpoint
Deactivates current session
*/
app.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    const client = await pool.connect();
    
    // Deactivate session
    await client.query(
      'UPDATE user_sessions SET is_active = $1 WHERE jwt_token = $2',
      [false, token]
    );
    
    client.release();
    
    res.json({ success: true, message: 'Logout successful' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Password reset request endpoint
Generates reset token and sends email
*/
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const client = await pool.connect();
    
    // Check if user exists
    const userResult = await client.query('SELECT user_id, name FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (userResult.rows.length === 0) {
      client.release();
      // Return success even if user doesn't exist (security best practice)
      return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent' });
    }
    
    const user = userResult.rows[0];
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    
    // Store reset token
    await client.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3',
      [resetToken, resetExpires, user.user_id]
    );
    
    client.release();
    
    // Send reset email
    await sendEmail({
      to: email,
      subject: 'NatureEstate Password Reset',
      content: `Hi ${user.name},\n\nPlease use this token to reset your password: ${resetToken}\n\nThis token expires in 1 hour.`,
      type: 'password_reset'
    });
    
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent' });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Password reset endpoint with token
Validates reset token and updates password
*/
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }
    
    const client = await pool.connect();
    
    // Find user with valid reset token
    const result = await client.query(
      'SELECT user_id FROM users WHERE password_reset_token = $1 AND password_reset_expires > $2',
      [token, new Date().toISOString()]
    );
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    
    const userId = result.rows[0].user_id;
    
    // Update password and clear reset token (direct password storage for development)
    await client.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = $2 WHERE user_id = $3',
      [password, new Date().toISOString(), userId]
    );
    
    client.release();
    
    res.json({ success: true, message: 'Password reset successful' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Email verification endpoint
Validates verification token and marks email as verified
*/
app.post('/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
    
    const client = await pool.connect();
    
    // Find user with verification token
    const result = await client.query(
      'SELECT user_id FROM users WHERE email_verification_token = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }
    
    const userId = result.rows[0].user_id;
    
    // Mark email as verified
    await client.query(
      'UPDATE users SET email_verified = $1, is_verified = $2, email_verification_token = NULL, updated_at = $3 WHERE user_id = $4',
      [true, true, new Date().toISOString(), userId]
    );
    
    client.release();
    
    res.json({ success: true, message: 'Email verification successful' });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Token refresh endpoint
Refreshes JWT token using refresh token
*/
app.post('/auth/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }
    
    const client = await pool.connect();
    
    // Find active session with refresh token
    const sessionResult = await client.query(
      'SELECT user_id, expires_at FROM user_sessions WHERE refresh_token = $1 AND is_active = $2',
      [refresh_token, true]
    );
    
    if (sessionResult.rows.length === 0) {
      client.release();
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    
    const session = sessionResult.rows[0];
    
    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      client.release();
      return res.status(401).json({ success: false, message: 'Refresh token expired' });
    }
    
    // Get user data
    const userResult = await client.query(
      'SELECT user_id, email, name, user_type, profile_photo_url, is_verified, email_verified, created_at FROM users WHERE user_id = $1',
      [session.user_id]
    );
    
    if (userResult.rows.length === 0) {
      client.release();
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Generate new tokens
    const newToken = generateJWT(user);
    const newRefreshToken = uuidv4();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Update session
    await client.query(
      'UPDATE user_sessions SET jwt_token = $1, refresh_token = $2, expires_at = $3, last_activity_at = $4 WHERE refresh_token = $5',
      [newToken, newRefreshToken, newExpiresAt, new Date().toISOString(), refresh_token]
    );
    
    client.release();
    
    res.json({
      user: user,
      token: newToken,
      refresh_token: newRefreshToken,
      expires_at: newExpiresAt
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== USER ROUTES ====================

/*
Get current user profile endpoint
Returns authenticated user's complete profile
*/
app.get('/users/me', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT user_id, email, name, phone, user_type, profile_photo_url, is_verified, email_verified, notification_preferences, countries_of_interest, created_at, updated_at, last_login_at FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Update current user profile endpoint
Updates authenticated user's profile information
*/
app.put('/users/me', authenticateToken, async (req, res) => {
  try {
    const validatedData = updateUserInputSchema.parse({ user_id: req.user.user_id, ...req.body });
    
    const client = await pool.connect();
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    ['email', 'name', 'phone', 'user_type', 'profile_photo_url', 'notification_preferences', 'countries_of_interest'].forEach(field => {
      if (validatedData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(validatedData[field]);
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;
    
    values.push(req.user.user_id);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramCount} RETURNING user_id, email, name, phone, user_type, profile_photo_url, is_verified, email_verified, notification_preferences, countries_of_interest, created_at, updated_at, last_login_at`;
    
    const result = await client.query(query, values);
    client.release();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid input data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Delete current user account endpoint
Removes user account and related data
*/
app.delete('/users/me', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Delete user and cascade to related records
    await client.query('DELETE FROM users WHERE user_id = $1', [req.user.user_id]);
    
    client.release();
    
    res.json({ success: true, message: 'User account deleted successfully' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Get public user profile endpoint
Returns public profile information for any user
*/
app.get('/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT user_id, name, user_type, profile_photo_url, is_verified, created_at FROM users WHERE user_id = $1',
      [user_id]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== PROPERTY ROUTES ====================

/*
Search properties endpoint
Comprehensive property search with filtering, sorting, and pagination
Supports anonymous access with optional user context
*/
app.get('/properties', optionalAuth, async (req, res) => {
  try {
    const validatedData = searchPropertiesInputSchema.parse(req.query);
    
    const client = await pool.connect();
    
    // Build search query with filters
    let query = `
      SELECT p.*, u.name as owner_name, u.user_type as owner_type, u.is_verified as owner_verified,
             pp.photo_url as primary_photo_url, pp.caption as primary_photo_caption
      FROM properties p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN property_photos pp ON p.property_id = pp.property_id AND pp.is_primary = true
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;
    
    // Add filters
    if (validatedData.query) {
      query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      values.push(`%${validatedData.query}%`);
      paramCount++;
    }
    
    if (validatedData.country) {
      query += ` AND p.country ILIKE $${paramCount}`;
      values.push(`%${validatedData.country}%`);
      paramCount++;
    }
    
    if (validatedData.region) {
      query += ` AND p.region ILIKE $${paramCount}`;
      values.push(`%${validatedData.region}%`);
      paramCount++;
    }
    
    if (validatedData.city) {
      query += ` AND p.city ILIKE $${paramCount}`;
      values.push(`%${validatedData.city}%`);
      paramCount++;
    }
    
    if (validatedData.property_type) {
      query += ` AND p.property_type = $${paramCount}`;
      values.push(validatedData.property_type);
      paramCount++;
    }
    
    if (validatedData.status) {
      query += ` AND p.status = $${paramCount}`;
      values.push(validatedData.status);
      paramCount++;
    }
    
    if (validatedData.price_min !== undefined) {
      query += ` AND p.price >= $${paramCount}`;
      values.push(validatedData.price_min);
      paramCount++;
    }
    
    if (validatedData.price_max !== undefined) {
      query += ` AND p.price <= $${paramCount}`;
      values.push(validatedData.price_max);
      paramCount++;
    }
    
    if (validatedData.bedrooms_min !== undefined) {
      query += ` AND p.bedrooms >= $${paramCount}`;
      values.push(validatedData.bedrooms_min);
      paramCount++;
    }
    
    if (validatedData.bathrooms_min !== undefined) {
      query += ` AND p.bathrooms >= $${paramCount}`;
      values.push(validatedData.bathrooms_min);
      paramCount++;
    }
    
    if (validatedData.square_footage_min !== undefined) {
      query += ` AND p.square_footage >= $${paramCount}`;
      values.push(validatedData.square_footage_min);
      paramCount++;
    }
    
    if (validatedData.square_footage_max !== undefined) {
      query += ` AND p.square_footage <= $${paramCount}`;
      values.push(validatedData.square_footage_max);
      paramCount++;
    }
    
    if (validatedData.land_size_min !== undefined) {
      query += ` AND p.land_size >= $${paramCount}`;
      values.push(validatedData.land_size_min);
      paramCount++;
    }
    
    if (validatedData.land_size_max !== undefined) {
      query += ` AND p.land_size <= $${paramCount}`;
      values.push(validatedData.land_size_max);
      paramCount++;
    }
    
    if (validatedData.year_built_min !== undefined) {
      query += ` AND p.year_built >= $${paramCount}`;
      values.push(validatedData.year_built_min);
      paramCount++;
    }
    
    if (validatedData.year_built_max !== undefined) {
      query += ` AND p.year_built <= $${paramCount}`;
      values.push(validatedData.year_built_max);
      paramCount++;
    }
    
    if (validatedData.natural_features) {
      query += ` AND p.natural_features ILIKE $${paramCount}`;
      values.push(`%${validatedData.natural_features}%`);
      paramCount++;
    }
    
    if (validatedData.outdoor_amenities) {
      query += ` AND p.outdoor_amenities ILIKE $${paramCount}`;
      values.push(`%${validatedData.outdoor_amenities}%`);
      paramCount++;
    }
    
    if (validatedData.location_text) {
      query += ` AND (p.country ILIKE $${paramCount} OR p.region ILIKE $${paramCount} OR p.city ILIKE $${paramCount} OR p.address ILIKE $${paramCount})`;
      values.push(`%${validatedData.location_text}%`);
      paramCount++;
    }
    
    if (validatedData.is_featured !== undefined) {
      query += ` AND p.is_featured = $${paramCount}`;
      values.push(validatedData.is_featured);
      paramCount++;
    }
    
    // Add sorting
    const sortColumn = validatedData.sort_by === 'created_at' ? 'p.created_at' : 
                      validatedData.sort_by === 'price' ? 'p.price' :
                      validatedData.sort_by === 'view_count' ? 'p.view_count' :
                      validatedData.sort_by === 'title' ? 'p.title' :
                      validatedData.sort_by === 'square_footage' ? 'p.square_footage' : 'p.created_at';
    
    query += ` ORDER BY ${sortColumn} ${validatedData.sort_order.toUpperCase()}`;
    
    // Count total results
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*/, '');
    const countResult = await client.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(validatedData.limit, validatedData.offset);
    
    const result = await client.query(query, values);
    
    // Record search in history if user is authenticated
    if (req.user) {
      await client.query(
        `INSERT INTO search_history (search_history_id, user_id, country, property_type, price_min, price_max, bedrooms_min, bathrooms_min, square_footage_min, square_footage_max, land_size_min, land_size_max, natural_features, outdoor_amenities, location_text, sort_by, results_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          uuidv4(), req.user.user_id, validatedData.country, validatedData.property_type,
          validatedData.price_min, validatedData.price_max, validatedData.bedrooms_min, validatedData.bathrooms_min,
          validatedData.square_footage_min, validatedData.square_footage_max, validatedData.land_size_min, validatedData.land_size_max,
          validatedData.natural_features, validatedData.outdoor_amenities, validatedData.location_text,
          validatedData.sort_by, totalCount, new Date().toISOString()
        ]
      );
    }
    
    client.release();
    
    // Format response
    const properties = result.rows.map(row => {
      const property = { ...row };
      delete property.owner_name;
      delete property.owner_type;
      delete property.owner_verified;
      delete property.primary_photo_url;
      delete property.primary_photo_caption;
      
      if (row.primary_photo_url) {
        property.primary_photo = {
          photo_url: row.primary_photo_url,
          caption: row.primary_photo_caption
        };
      }
      
      return property;
    });
    
    const totalPages = Math.ceil(totalCount / validatedData.limit);
    const currentPage = Math.floor(validatedData.offset / validatedData.limit) + 1;
    
    res.json({
      properties,
      total_count: totalCount,
      page: currentPage,
      per_page: validatedData.limit,
      total_pages: totalPages
    });
    
  } catch (error) {
    console.error('Search properties error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid search parameters', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Create property endpoint
Creates new property listing for authenticated users
*/
app.post('/properties', authenticateToken, async (req, res) => {
  try {
    const validatedData = createPropertyInputSchema.parse({ user_id: req.user.user_id, ...req.body });
    
    const client = await pool.connect();
    
    const propertyId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + validatedData.listing_duration_days * 24 * 60 * 60 * 1000).toISOString();
    
    const result = await client.query(
      `INSERT INTO properties (
        property_id, user_id, title, description, property_type, status, price, currency,
        country, region, city, address, latitude, longitude, square_footage, land_size, land_size_unit,
        bedrooms, bathrooms, year_built, natural_features, outdoor_amenities, indoor_amenities,
        view_types, nearby_attractions, distance_to_landmarks, environmental_features, outdoor_activities,
        property_condition, special_features, listing_duration_days, is_featured, view_count,
        inquiry_count, favorite_count, created_at, updated_at, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38
      ) RETURNING *`,
      [
        propertyId, validatedData.user_id, validatedData.title, validatedData.description,
        validatedData.property_type, 'active', validatedData.price, validatedData.currency,
        validatedData.country, validatedData.region, validatedData.city, validatedData.address,
        validatedData.latitude, validatedData.longitude, validatedData.square_footage,
        validatedData.land_size, validatedData.land_size_unit, validatedData.bedrooms,
        validatedData.bathrooms, validatedData.year_built, validatedData.natural_features,
        validatedData.outdoor_amenities, validatedData.indoor_amenities, validatedData.view_types,
        validatedData.nearby_attractions, validatedData.distance_to_landmarks,
        validatedData.environmental_features, validatedData.outdoor_activities,
        validatedData.property_condition, validatedData.special_features,
        validatedData.listing_duration_days, false, 0, 0, 0, now, now, expiresAt
      ]
    );
    
    client.release();
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Create property error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid property data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Get property details endpoint
Returns comprehensive property information with owner and photos
Tracks view for analytics
*/
app.get('/properties/:property_id', optionalAuth, async (req, res) => {
  try {
    const { property_id } = req.params;
    
    const client = await pool.connect();
    
    // Get property with owner info
    const propertyResult = await client.query(
      `SELECT p.*, u.name as owner_name, u.user_type as owner_type, u.profile_photo_url as owner_photo, u.is_verified as owner_verified, u.created_at as owner_since
       FROM properties p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.property_id = $1`,
      [property_id]
    );
    
    if (propertyResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    const property = propertyResult.rows[0];
    
    // Get property photos
    const photosResult = await client.query(
      'SELECT * FROM property_photos WHERE property_id = $1 ORDER BY photo_order ASC, created_at ASC',
      [property_id]
    );
    
    // Increment view count
    await client.query(
      'UPDATE properties SET view_count = view_count + 1 WHERE property_id = $1',
      [property_id]
    );
    
    // Record property view
    if (req.user || req.headers['x-session-id']) {
      await client.query(
        `INSERT INTO property_views (view_id, property_id, user_id, session_id, ip_address, user_agent, referrer_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          property_id,
          req.user?.user_id || null,
          req.headers['x-session-id'] || null,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'],
          req.headers['referer'],
          new Date().toISOString()
        ]
      );
    }
    
    client.release();
    
    // Format response
    const { owner_name, owner_type, owner_photo, owner_verified, owner_since, ...propertyData } = property;
    
    const response = {
      ...propertyData,
      owner: {
        user_id: property.user_id,
        name: owner_name,
        user_type: owner_type,
        profile_photo_url: owner_photo,
        is_verified: owner_verified,
        created_at: owner_since
      },
      photos: photosResult.rows
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Update property endpoint
Updates existing property listing for authenticated owners
*/
app.put('/properties/:property_id', authenticateToken, async (req, res) => {
  try {
    const { property_id } = req.params;
    const validatedData = updatePropertyInputSchema.parse({ property_id, ...req.body });
    
    const client = await pool.connect();
    
    // Verify ownership
    const ownerCheck = await client.query(
      'SELECT user_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = [
      'title', 'description', 'property_type', 'status', 'price', 'currency',
      'country', 'region', 'city', 'address', 'latitude', 'longitude',
      'square_footage', 'land_size', 'land_size_unit', 'bedrooms', 'bathrooms',
      'year_built', 'property_condition', 'is_featured', 'featured_until'
    ];
    
    allowedFields.forEach(field => {
      if (validatedData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(validatedData[field]);
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;
    
    values.push(property_id);
    
    const query = `UPDATE properties SET ${updateFields.join(', ')} WHERE property_id = $${paramCount} RETURNING *`;
    
    const result = await client.query(query, values);
    client.release();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Update property error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid property data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Patch property endpoint (same as PUT for flexibility)
*/
app.patch('/properties/:property_id', authenticateToken, async (req, res) => {
  // Reuse PUT logic
  req.method = 'PUT';
  return app._router.handle(req, res);
});

/*
Delete property endpoint
Removes property listing for authenticated owners
*/
app.delete('/properties/:property_id', authenticateToken, async (req, res) => {
  try {
    const { property_id } = req.params;
    
    const client = await pool.connect();
    
    // Verify ownership
    const ownerCheck = await client.query(
      'SELECT user_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }
    
    // Delete property (cascades to related records)
    await client.query('DELETE FROM properties WHERE property_id = $1', [property_id]);
    
    client.release();
    
    res.json({ success: true, message: 'Property deleted successfully' });
    
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Track property view endpoint
Records property view for analytics
*/
app.post('/properties/:property_id/view', optionalAuth, async (req, res) => {
  try {
    const { property_id } = req.params;
    const validatedData = createPropertyViewInputSchema.parse(req.body);
    
    const client = await pool.connect();
    
    // Verify property exists
    const propertyCheck = await client.query(
      'SELECT property_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (propertyCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    // Record view
    await client.query(
      `INSERT INTO property_views (view_id, property_id, user_id, session_id, ip_address, user_agent, referrer_url, view_duration_seconds, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(),
        property_id,
        req.user?.user_id || validatedData.user_id,
        validatedData.session_id,
        validatedData.ip_address || req.ip,
        validatedData.user_agent || req.headers['user-agent'],
        validatedData.referrer_url,
        validatedData.view_duration_seconds,
        new Date().toISOString()
      ]
    );
    
    client.release();
    
    res.status(201).json({ success: true, message: 'Property view tracked' });
    
  } catch (error) {
    console.error('Track property view error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid view data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== PROPERTY PHOTO ROUTES ====================

/*
Get property photos endpoint
Returns ordered list of property photos
*/
app.get('/properties/:property_id/photos', async (req, res) => {
  try {
    const { property_id } = req.params;
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM property_photos WHERE property_id = $1 ORDER BY photo_order ASC, created_at ASC',
      [property_id]
    );
    client.release();
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Get property photos error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Add property photo endpoint
Adds new photo to property gallery
*/
app.post('/properties/:property_id/photos', authenticateToken, async (req, res) => {
  try {
    const { property_id } = req.params;
    const validatedData = createPropertyPhotoInputSchema.parse({ property_id, ...req.body });
    
    const client = await pool.connect();
    
    // Verify property ownership
    const ownerCheck = await client.query(
      'SELECT user_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to add photos to this property' });
    }
    
    // If setting as primary, update existing primary photos
    if (validatedData.is_primary) {
      await client.query(
        'UPDATE property_photos SET is_primary = false WHERE property_id = $1',
        [property_id]
      );
    }
    
    const photoId = uuidv4();
    const result = await client.query(
      `INSERT INTO property_photos (photo_id, property_id, photo_url, caption, photo_order, is_primary, photo_type, file_size, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        photoId, property_id, validatedData.photo_url, validatedData.caption,
        validatedData.photo_order, validatedData.is_primary, validatedData.photo_type,
        validatedData.file_size, new Date().toISOString()
      ]
    );
    
    client.release();
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Add property photo error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid photo data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Update property photo endpoint
Updates photo metadata and ordering
*/
app.put('/properties/:property_id/photos/:photo_id', authenticateToken, async (req, res) => {
  try {
    const { property_id, photo_id } = req.params;
    const validatedData = updatePropertyPhotoInputSchema.parse({ photo_id, ...req.body });
    
    const client = await pool.connect();
    
    // Verify property ownership
    const ownerCheck = await client.query(
      'SELECT user_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to update photos for this property' });
    }
    
    // If setting as primary, update existing primary photos
    if (validatedData.is_primary) {
      await client.query(
        'UPDATE property_photos SET is_primary = false WHERE property_id = $1 AND photo_id != $2',
        [property_id, photo_id]
      );
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    ['caption', 'photo_order', 'is_primary', 'photo_type'].forEach(field => {
      if (validatedData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(validatedData[field]);
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    values.push(photo_id);
    
    const query = `UPDATE property_photos SET ${updateFields.join(', ')} WHERE photo_id = $${paramCount} RETURNING *`;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    client.release();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Update property photo error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid photo data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Delete property photo endpoint
Removes photo from property gallery
*/
app.delete('/properties/:property_id/photos/:photo_id', authenticateToken, async (req, res) => {
  try {
    const { property_id, photo_id } = req.params;
    
    const client = await pool.connect();
    
    // Verify property ownership
    const ownerCheck = await client.query(
      'SELECT user_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to delete photos from this property' });
    }
    
    // Delete photo
    const result = await client.query(
      'DELETE FROM property_photos WHERE photo_id = $1 AND property_id = $2',
      [photo_id, property_id]
    );
    
    if (result.rowCount === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    client.release();
    
    res.json({ success: true, message: 'Photo deleted successfully' });
    
  } catch (error) {
    console.error('Delete property photo error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== INQUIRY ROUTES ====================

/*
Get property inquiries endpoint
Returns inquiries for specific property (property owners only)
*/
app.get('/properties/:property_id/inquiries', authenticateToken, async (req, res) => {
  try {
    const { property_id } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit)) || 10));
    const offsetNum = Math.max(0, parseInt(String(offset)) || 0);
    
    const client = await pool.connect();
    
    // Verify property ownership
    const ownerCheck = await client.query(
      'SELECT user_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to view inquiries for this property' });
    }
    
    // Build query with optional status filter
    let query = `
      SELECT i.*, p.title as property_title, p.price as property_price
      FROM property_inquiries i
      JOIN properties p ON i.property_id = p.property_id
      WHERE i.property_id = $1
    `;
    const values = [property_id];
    let paramCount = 2;
    
    if (status) {
      query += ` AND i.status = $${paramCount}`;
      values.push(String(status));
      paramCount++;
    }
    
    query += ` ORDER BY i.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(String(limitNum), String(offsetNum));
    
    const result = await client.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM property_inquiries WHERE property_id = $1';
    const countValues = [property_id];
    if (status) {
      countQuery += ' AND status = $2';
      countValues.push(String(status));
    }
    const countResult = await client.query(countQuery, countValues);
    
    client.release();
    
    res.json({
      inquiries: result.rows,
      total_count: parseInt(countResult.rows[0].count),
      page: Math.floor(offsetNum / limitNum) + 1,
      per_page: limitNum
    });
    
  } catch (error) {
    console.error('Get property inquiries error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Create property inquiry endpoint
Creates new inquiry for property (supports anonymous users)
*/
app.post('/properties/:property_id/inquiries', optionalAuth, async (req, res) => {
  try {
    const { property_id } = req.params;
    const validatedData = createPropertyInquiryInputSchema.parse(req.body);
    
    const client = await pool.connect();
    
    // Get property owner
    const propertyResult = await client.query(
      'SELECT user_id, title FROM properties WHERE property_id = $1 AND status = $2',
      [property_id, 'active']
    );
    
    if (propertyResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found or not available' });
    }
    
    const property = propertyResult.rows[0];
    
    const inquiryId = uuidv4();
    const now = new Date().toISOString();
    
    const result = await client.query(
      `INSERT INTO property_inquiries (
        inquiry_id, property_id, sender_user_id, recipient_user_id, sender_name, sender_email,
        sender_phone, message, status, is_interested_in_viewing, wants_similar_properties,
        priority, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        inquiryId, property_id, req.user?.user_id || null, property.user_id,
        validatedData.sender_name, validatedData.sender_email, validatedData.sender_phone,
        validatedData.message, 'unread', validatedData.is_interested_in_viewing,
        validatedData.wants_similar_properties, validatedData.priority, now, now
      ]
    );
    
    // Update property inquiry count
    await client.query(
      'UPDATE properties SET inquiry_count = inquiry_count + 1 WHERE property_id = $1',
      [property_id]
    );
    
    client.release();
    
    // Create notification for property owner
    await createNotification(
      property.user_id,
      'inquiry',
      'New Property Inquiry',
      `You have received a new inquiry for "${property.title}" from ${validatedData.sender_name}.`,
      {
        relatedPropertyId: property_id,
        relatedInquiryId: inquiryId,
        actionUrl: `/inquiries/${inquiryId}`,
        priority: validatedData.priority,
        sendEmail: true
      }
    );
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Create property inquiry error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid inquiry data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Get user inquiries endpoint
Returns inquiries for authenticated user (sent or received)
*/
app.get('/inquiries', authenticateToken, async (req, res) => {
  try {
    const validatedData = searchPropertyInquiriesInputSchema.parse({
      recipient_user_id: req.user.user_id,
      ...req.query
    });
    
    const client = await pool.connect();
    
    // Build query
    let query = `
      SELECT i.*, p.title as property_title, p.price as property_price, p.country as property_country
      FROM property_inquiries i
      JOIN properties p ON i.property_id = p.property_id
      WHERE (i.recipient_user_id = $1 OR i.sender_user_id = $1)
    `;
    const values = [req.user.user_id];
    let paramCount = 2;
    
    // Add filters
    if (validatedData.status) {
      query += ` AND i.status = $${paramCount}`;
      values.push(validatedData.status);
      paramCount++;
    }
    
    if (validatedData.priority) {
      query += ` AND i.priority = $${paramCount}`;
      values.push(validatedData.priority);
      paramCount++;
    }
    
    if (validatedData.is_interested_in_viewing !== undefined) {
      query += ` AND i.is_interested_in_viewing = $${paramCount}`;
      values.push(validatedData.is_interested_in_viewing);
      paramCount++;
    }
    
    if (validatedData.date_from) {
      query += ` AND i.created_at >= $${paramCount}`;
      values.push(validatedData.date_from);
      paramCount++;
    }
    
    if (validatedData.date_to) {
      query += ` AND i.created_at <= $${paramCount}`;
      values.push(validatedData.date_to);
      paramCount++;
    }
    
    // Add sorting
    const sortColumn = validatedData.sort_by === 'priority' ? 'i.priority' :
                      validatedData.sort_by === 'status' ? 'i.status' : 'i.created_at';
    
    query += ` ORDER BY ${sortColumn} ${validatedData.sort_order.toUpperCase()}`;
    
    // Count total
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*/, '');
    const countResult = await client.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(validatedData.limit, validatedData.offset);
    
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      inquiries: result.rows,
      total_count: totalCount,
      page: Math.floor(validatedData.offset / validatedData.limit) + 1,
      per_page: validatedData.limit
    });
    
  } catch (error) {
    console.error('Get user inquiries error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid search parameters', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Get inquiry details endpoint
Returns specific inquiry details
*/
app.get('/inquiries/:inquiry_id', authenticateToken, async (req, res) => {
  try {
    const { inquiry_id } = req.params;
    
    const client = await pool.connect();
    
    const result = await client.query(
      `SELECT i.*, p.title as property_title, p.price as property_price
       FROM property_inquiries i
       JOIN properties p ON i.property_id = p.property_id
       WHERE i.inquiry_id = $1 AND (i.recipient_user_id = $2 OR i.sender_user_id = $2)`,
      [inquiry_id, req.user.user_id]
    );
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    
    // Mark as read if user is recipient
    if (result.rows[0].recipient_user_id === req.user.user_id && result.rows[0].status === 'unread') {
      await client.query(
        'UPDATE property_inquiries SET status = $1, updated_at = $2 WHERE inquiry_id = $3',
        ['read', new Date().toISOString(), inquiry_id]
      );
      result.rows[0].status = 'read';
    }
    
    client.release();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Update inquiry endpoint
Updates inquiry status and response
*/
app.put('/inquiries/:inquiry_id', authenticateToken, async (req, res) => {
  try {
    const { inquiry_id } = req.params;
    const validatedData = updatePropertyInquiryInputSchema.parse({ inquiry_id, ...req.body });
    
    const client = await pool.connect();
    
    // Verify access (recipient can update)
    const accessCheck = await client.query(
      'SELECT recipient_user_id, sender_user_id FROM property_inquiries WHERE inquiry_id = $1',
      [inquiry_id]
    );
    
    if (accessCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    
    if (accessCheck.rows[0].recipient_user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to update this inquiry' });
    }
    
    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    ['status', 'response_message', 'priority'].forEach(field => {
      if (validatedData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(validatedData[field]);
        paramCount++;
      }
    });
    
    if (validatedData.response_message) {
      updateFields.push(`responded_at = $${paramCount}`);
      values.push(new Date().toISOString());
      paramCount++;
    }
    
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;
    
    values.push(inquiry_id);
    
    const query = `UPDATE property_inquiries SET ${updateFields.join(', ')} WHERE inquiry_id = $${paramCount} RETURNING *`;
    
    const result = await client.query(query, values);
    client.release();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Update inquiry error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid inquiry data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Get inquiry responses endpoint
Returns threaded responses for inquiry
*/
app.get('/inquiries/:inquiry_id/responses', authenticateToken, async (req, res) => {
  try {
    const { inquiry_id } = req.params;
    
    const client = await pool.connect();
    
    // Verify access
    const accessCheck = await client.query(
      'SELECT recipient_user_id, sender_user_id FROM property_inquiries WHERE inquiry_id = $1',
      [inquiry_id]
    );
    
    if (accessCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    
    const inquiry = accessCheck.rows[0];
    if (inquiry.recipient_user_id !== req.user.user_id && inquiry.sender_user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to view responses for this inquiry' });
    }
    
    // Get responses
    const result = await client.query(
      `SELECT r.*, u.name as sender_name, u.user_type as sender_type
       FROM inquiry_responses r
       JOIN users u ON r.sender_user_id = u.user_id
       WHERE r.inquiry_id = $1
       ORDER BY r.created_at ASC`,
      [inquiry_id]
    );
    
    client.release();
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Get inquiry responses error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Create inquiry response endpoint
Adds response to inquiry thread
*/
app.post('/inquiries/:inquiry_id/responses', authenticateToken, async (req, res) => {
  try {
    const { inquiry_id } = req.params;
    const validatedData = createInquiryResponseInputSchema.parse({ inquiry_id, sender_user_id: req.user.user_id, ...req.body });
    
    const client = await pool.connect();
    
    // Verify access
    const accessCheck = await client.query(
      'SELECT recipient_user_id, sender_user_id FROM property_inquiries WHERE inquiry_id = $1',
      [inquiry_id]
    );
    
    if (accessCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }
    
    const inquiry = accessCheck.rows[0];
    if (inquiry.recipient_user_id !== req.user.user_id && inquiry.sender_user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this inquiry' });
    }
    
    const responseId = uuidv4();
    const result = await client.query(
      `INSERT INTO inquiry_responses (response_id, inquiry_id, sender_user_id, message, attachments, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        responseId, inquiry_id, req.user.user_id, validatedData.message,
        validatedData.attachments, false, new Date().toISOString()
      ]
    );
    
    // Update inquiry status
    await client.query(
      'UPDATE property_inquiries SET status = $1, updated_at = $2 WHERE inquiry_id = $3',
      ['responded', new Date().toISOString(), inquiry_id]
    );
    
    client.release();
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Create inquiry response error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid response data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== SAVED PROPERTIES ROUTES ====================

/*
Get saved properties endpoint
Returns user's favorited properties
*/
app.get('/saved-properties', authenticateToken, async (req, res) => {
  try {
    const { sort_by = 'date_saved', filter_country, view_type = 'grid', limit = 20, offset = 0 } = req.query;
    const limitNum = parseInt(String(limit));
    const offsetNum = parseInt(String(offset));
    
    const client = await pool.connect();
    
    let query = `
      SELECT sp.*, p.*, pp.photo_url as primary_photo_url
      FROM saved_properties sp
      JOIN properties p ON sp.property_id = p.property_id
      LEFT JOIN property_photos pp ON p.property_id = pp.property_id AND pp.is_primary = true
      WHERE sp.user_id = $1
    `;
    const values = [req.user.user_id];
    let paramCount = 2;
    
    if (filter_country) {
      query += ` AND p.country ILIKE $${paramCount}`;
      values.push(`%${filter_country}%`);
      paramCount++;
    }
    
    // Add sorting
    if (sort_by === 'price_low_high') {
      query += ' ORDER BY p.price ASC';
    } else if (sort_by === 'location') {
      query += ' ORDER BY p.country ASC, p.region ASC, p.city ASC';
    } else {
      query += ' ORDER BY sp.created_at DESC';
    }
    
    // Count total
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*/, '');
    const countResult = await client.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(String(limitNum), String(offsetNum));
    
    const result = await client.query(query, values);
    client.release();
    
    // Format response
    const savedProperties = result.rows.map(row => {
      const { saved_property_id, user_id, notes, created_at: saved_at, primary_photo_url, ...property } = row;
      
      return {
        saved_property_id,
        user_id,
        property_id: property.property_id,
        notes,
        created_at: saved_at,
        property: {
          ...property,
          primary_photo: primary_photo_url ? { photo_url: primary_photo_url } : null
        }
      };
    });
    
    res.json({
      saved_properties: savedProperties,
      total_count: totalCount
    });
    
  } catch (error) {
    console.error('Get saved properties error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Save property endpoint
Adds property to user's favorites
*/
app.post('/saved-properties', authenticateToken, async (req, res) => {
  try {
    const validatedData = createSavedPropertyInputSchema.parse({ user_id: req.user.user_id, ...req.body });
    
    const client = await pool.connect();
    
    // Check if already saved
    const existingCheck = await client.query(
      'SELECT saved_property_id FROM saved_properties WHERE user_id = $1 AND property_id = $2',
      [req.user.user_id, validatedData.property_id]
    );
    
    if (existingCheck.rows.length > 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'Property already saved' });
    }
    
    // Verify property exists
    const propertyCheck = await client.query(
      'SELECT property_id FROM properties WHERE property_id = $1',
      [validatedData.property_id]
    );
    
    if (propertyCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    const savedPropertyId = uuidv4();
    const result = await client.query(
      'INSERT INTO saved_properties (saved_property_id, user_id, property_id, notes, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [savedPropertyId, req.user.user_id, validatedData.property_id, validatedData.notes, new Date().toISOString()]
    );
    
    // Update property favorite count
    await client.query(
      'UPDATE properties SET favorite_count = favorite_count + 1 WHERE property_id = $1',
      [validatedData.property_id]
    );
    
    client.release();
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Save property error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid saved property data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Update saved property endpoint
Updates notes for saved property
*/
app.put('/saved-properties/:saved_property_id', authenticateToken, async (req, res) => {
  try {
    const { saved_property_id } = req.params;
    const validatedData = updateSavedPropertyInputSchema.parse({ saved_property_id, ...req.body });
    
    const client = await pool.connect();
    
    const result = await client.query(
      'UPDATE saved_properties SET notes = $1 WHERE saved_property_id = $2 AND user_id = $3 RETURNING *',
      [validatedData.notes, saved_property_id, req.user.user_id]
    );
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Saved property not found' });
    }
    
    client.release();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Update saved property error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid saved property data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Remove saved property endpoint
Removes property from user's favorites
*/
app.delete('/saved-properties/:saved_property_id', authenticateToken, async (req, res) => {
  try {
    const { saved_property_id } = req.params;
    
    const client = await pool.connect();
    
    // Get property_id before deletion for favorite count update
    const savedPropertyResult = await client.query(
      'SELECT property_id FROM saved_properties WHERE saved_property_id = $1 AND user_id = $2',
      [saved_property_id, req.user.user_id]
    );
    
    if (savedPropertyResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Saved property not found' });
    }
    
    const propertyId = savedPropertyResult.rows[0].property_id;
    
    // Delete saved property
    await client.query(
      'DELETE FROM saved_properties WHERE saved_property_id = $1 AND user_id = $2',
      [saved_property_id, req.user.user_id]
    );
    
    // Update property favorite count
    await client.query(
      'UPDATE properties SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE property_id = $1',
      [propertyId]
    );
    
    client.release();
    
    res.json({ success: true, message: 'Property removed from favorites' });
    
  } catch (error) {
    console.error('Remove saved property error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== SAVED SEARCHES ROUTES ====================

/*
Get saved searches endpoint
Returns user's saved search criteria
*/
app.get('/saved-searches', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.user_id]
    );
    client.release();
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Create saved search endpoint
Creates new saved search with alert configuration
*/
app.post('/saved-searches', authenticateToken, async (req, res) => {
  try {
    const validatedData = createSavedSearchInputSchema.parse({ user_id: req.user.user_id, ...req.body });
    
    const client = await pool.connect();
    
    const savedSearchId = uuidv4();
    const now = new Date().toISOString();
    
    const result = await client.query(
      `INSERT INTO saved_searches (
        saved_search_id, user_id, search_name, country, property_type, price_min, price_max,
        bedrooms_min, bathrooms_min, square_footage_min, square_footage_max, land_size_min,
        land_size_max, natural_features, outdoor_amenities, location_text, alert_frequency,
        is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *`,
      [
        savedSearchId, validatedData.user_id, validatedData.search_name, validatedData.country,
        validatedData.property_type, validatedData.price_min, validatedData.price_max,
        validatedData.bedrooms_min, validatedData.bathrooms_min, validatedData.square_footage_min,
        validatedData.square_footage_max, validatedData.land_size_min, validatedData.land_size_max,
        validatedData.natural_features, validatedData.outdoor_amenities, validatedData.location_text,
        validatedData.alert_frequency, validatedData.is_active, now, now
      ]
    );
    
    client.release();
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Create saved search error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid saved search data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Update saved search endpoint
Updates saved search criteria and alert settings
*/
app.put('/saved-searches/:saved_search_id', authenticateToken, async (req, res) => {
  try {
    const { saved_search_id } = req.params;
    const validatedData = updateSavedSearchInputSchema.parse({ saved_search_id, ...req.body });
    
    const client = await pool.connect();
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    const allowedFields = [
      'search_name', 'country', 'property_type', 'price_min', 'price_max',
      'bedrooms_min', 'bathrooms_min', 'square_footage_min', 'square_footage_max',
      'land_size_min', 'land_size_max', 'natural_features', 'outdoor_amenities',
      'location_text', 'alert_frequency', 'is_active'
    ];
    
    allowedFields.forEach(field => {
      if (validatedData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(validatedData[field]);
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;
    
    values.push(saved_search_id, req.user.user_id);
    
    const query = `UPDATE saved_searches SET ${updateFields.join(', ')} WHERE saved_search_id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Saved search not found' });
    }
    
    client.release();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Update saved search error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid saved search data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Delete saved search endpoint
Removes saved search and stops alerts
*/
app.delete('/saved-searches/:saved_search_id', authenticateToken, async (req, res) => {
  try {
    const { saved_search_id } = req.params;
    
    const client = await pool.connect();
    
    const result = await client.query(
      'DELETE FROM saved_searches WHERE saved_search_id = $1 AND user_id = $2',
      [saved_search_id, req.user.user_id]
    );
    
    if (result.rowCount === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Saved search not found' });
    }
    
    client.release();
    
    res.json({ success: true, message: 'Saved search deleted successfully' });
    
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

/*
Get notifications endpoint
Returns user notifications with filtering and pagination
*/
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const validatedData = searchNotificationsInputSchema.parse({ user_id: req.user.user_id, ...req.query });
    
    const client = await pool.connect();
    
    // Build query
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const values = [req.user.user_id];
    let paramCount = 2;
    
    if (validatedData.type) {
      query += ` AND type = $${paramCount}`;
      values.push(validatedData.type);
      paramCount++;
    }
    
    if (validatedData.is_read !== undefined) {
      query += ` AND is_read = $${paramCount}`;
      values.push(validatedData.is_read);
      paramCount++;
    }
    
    if (validatedData.priority) {
      query += ` AND priority = $${paramCount}`;
      values.push(validatedData.priority);
      paramCount++;
    }
    
    if (validatedData.date_from) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(validatedData.date_from);
      paramCount++;
    }
    
    if (validatedData.date_to) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(validatedData.date_to);
      paramCount++;
    }
    
    // Add sorting
    const sortColumn = validatedData.sort_by === 'priority' ? 'priority' :
                      validatedData.sort_by === 'type' ? 'type' : 'created_at';
    
    query += ` ORDER BY ${sortColumn} ${validatedData.sort_order.toUpperCase()}`;
    
    // Count total and unread
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*/, '');
    const unreadQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM').replace(/ORDER BY.*/, '') + ' AND is_read = false';
    
    const [countResult, unreadResult] = await Promise.all([
      client.query(countQuery, values),
      client.query(unreadQuery, values)
    ]);
    
    const totalCount = parseInt(countResult.rows[0].count);
    const unreadCount = parseInt(unreadResult.rows[0].count);
    
    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(validatedData.limit, validatedData.offset);
    
    const result = await client.query(query, values);
    client.release();
    
    res.json({
      notifications: result.rows,
      total_count: totalCount,
      unread_count: unreadCount
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid notification search parameters', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Mark notification as read endpoint
Updates notification read status
*/
app.put('/notifications/:notification_id/read', authenticateToken, async (req, res) => {
  try {
    const { notification_id } = req.params;
    
    const client = await pool.connect();
    
    const result = await client.query(
      'UPDATE notifications SET is_read = $1 WHERE notification_id = $2 AND user_id = $3',
      [true, notification_id, req.user.user_id]
    );
    
    if (result.rowCount === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    client.release();
    
    res.json({ success: true, message: 'Notification marked as read' });
    
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Mark all notifications as read endpoint
Updates all notifications for user to read status
*/
app.put('/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    await client.query(
      'UPDATE notifications SET is_read = $1 WHERE user_id = $2 AND is_read = $3',
      [true, req.user.user_id, false]
    );
    
    client.release();
    
    res.json({ success: true, message: 'All notifications marked as read' });
    
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== DASHBOARD & ANALYTICS ROUTES ====================

/*
Dashboard statistics endpoint
Returns comprehensive dashboard stats for user type
*/
app.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const stats = {
      user_type: req.user.user_type,
      total_properties: 0,
      total_inquiries: 0,
      total_views: 0,
      total_favorites: 0,
      active_listings: 0,
      pending_inquiries: 0,
      saved_searches: 0,
      recent_activity: []
    };
    
    if (req.user.user_type === 'seller' || req.user.user_type === 'agent') {
      // Property owner/agent stats
      const propertyStats = await client.query(
        `SELECT COUNT(*) as total_properties, 
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_listings,
                SUM(view_count) as total_views,
                SUM(inquiry_count) as total_inquiries,
                SUM(favorite_count) as total_favorites
         FROM properties 
         WHERE user_id = $1`,
        [req.user.user_id]
      );
      
      if (propertyStats.rows.length > 0) {
        const row = propertyStats.rows[0];
        stats.total_properties = parseInt(row.total_properties) || 0;
        stats.active_listings = parseInt(row.active_listings) || 0;
        stats.total_views = parseInt(row.total_views) || 0;
        stats.total_inquiries = parseInt(row.total_inquiries) || 0;
        stats.total_favorites = parseInt(row.total_favorites) || 0;
      }
      
      // Pending inquiries
      const pendingInquiries = await client.query(
        'SELECT COUNT(*) as pending FROM property_inquiries WHERE recipient_user_id = $1 AND status = $2',
        [req.user.user_id, 'unread']
      );
      stats.pending_inquiries = parseInt(pendingInquiries.rows[0].pending) || 0;
      
      // Recent activity for sellers/agents
      const recentActivity = await client.query(
        `(SELECT 'inquiry' as activity_type, 
                CONCAT('New inquiry from ', sender_name) as description,
                created_at as timestamp,
                inquiry_id as related_id
         FROM property_inquiries 
         WHERE recipient_user_id = $1
         ORDER BY created_at DESC 
         LIMIT 5)
         UNION ALL
         (SELECT 'property_view' as activity_type,
                'Property viewed' as description,
                created_at as timestamp,
                property_id as related_id
         FROM property_views pv
         JOIN properties p ON pv.property_id = p.property_id
         WHERE p.user_id = $1
         ORDER BY created_at DESC
         LIMIT 5)
         ORDER BY timestamp DESC
         LIMIT 10`,
        [req.user.user_id]
      );
      stats.recent_activity = recentActivity.rows;
      
    } else {
      // Buyer stats
      const buyerStats = await client.query(
        `SELECT 
          (SELECT COUNT(*) FROM saved_properties WHERE user_id = $1) as total_favorites,
          (SELECT COUNT(*) FROM property_inquiries WHERE sender_user_id = $1) as total_inquiries,
          (SELECT COUNT(*) FROM saved_searches WHERE user_id = $1) as saved_searches`,
        [req.user.user_id]
      );
      
      if (buyerStats.rows.length > 0) {
        const row = buyerStats.rows[0];
        stats.total_favorites = parseInt(row.total_favorites) || 0;
        stats.total_inquiries = parseInt(row.total_inquiries) || 0;
        stats.saved_searches = parseInt(row.saved_searches) || 0;
      }
      
      // Recent activity for buyers
      const recentActivity = await client.query(
        `(SELECT 'inquiry_sent' as activity_type,
                CONCAT('Inquiry sent for property') as description,
                created_at as timestamp,
                property_id as related_id
         FROM property_inquiries
         WHERE sender_user_id = $1
         ORDER BY created_at DESC
         LIMIT 5)
         UNION ALL
         (SELECT 'property_saved' as activity_type,
                'Property saved to favorites' as description,
                created_at as timestamp,
                property_id as related_id
         FROM saved_properties
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5)
         ORDER BY timestamp DESC
         LIMIT 10`,
        [req.user.user_id]
      );
      stats.recent_activity = recentActivity.rows;
    }
    
    client.release();
    
    res.json(stats);
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Property analytics endpoint
Returns detailed analytics for specific property
*/
app.get('/properties/:property_id/analytics', authenticateToken, async (req, res) => {
  try {
    const { property_id } = req.params;
    const { date_from, date_to, limit = 30, offset = 0 } = req.query;
    const limitNum = parseInt(String(limit));
    const offsetNum = parseInt(String(offset));
    
    const client = await pool.connect();
    
    // Verify property ownership
    const ownerCheck = await client.query(
      'SELECT user_id FROM properties WHERE property_id = $1',
      [property_id]
    );
    
    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (ownerCheck.rows[0].user_id !== req.user.user_id) {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to view analytics for this property' });
    }
    
    // Build analytics query
    let query = 'SELECT * FROM property_analytics WHERE property_id = $1';
    const values = [property_id];
    let paramCount = 2;
    
    if (date_from) {
      query += ` AND date >= $${paramCount}`;
      values.push(String(date_from));
      paramCount++;
    }
    
    if (date_to) {
      query += ` AND date <= $${paramCount}`;
      values.push(String(date_to));
      paramCount++;
    }
    
    query += ` ORDER BY date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(String(limitNum), String(offsetNum));
    
    const result = await client.query(query, values);
    client.release();
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Property analytics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Search history endpoint
Returns user's search history
*/
app.get('/search-history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const limitNum = parseInt(String(limit));
    const offsetNum = parseInt(String(offset));
    
    const client = await pool.connect();
    
    const result = await client.query(
      'SELECT * FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.user_id, limitNum, offsetNum]
    );
    
    client.release();
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/*
Record search history endpoint
Creates new search history record
*/
app.post('/search-history', optionalAuth, async (req, res) => {
  try {
    const validatedData = createSearchHistoryInputSchema.parse({
      user_id: req.user?.user_id || null,
      ...req.body
    });
    
    const client = await pool.connect();
    
    const searchHistoryId = uuidv4();
    const result = await client.query(
      `INSERT INTO search_history (
        search_history_id, user_id, session_id, country, property_type, price_min, price_max,
        bedrooms_min, bathrooms_min, square_footage_min, square_footage_max, land_size_min,
        land_size_max, natural_features, outdoor_amenities, location_text, sort_by, results_count, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *`,
      [
        searchHistoryId, validatedData.user_id, validatedData.session_id, validatedData.country,
        validatedData.property_type, validatedData.price_min, validatedData.price_max,
        validatedData.bedrooms_min, validatedData.bathrooms_min, validatedData.square_footage_min,
        validatedData.square_footage_max, validatedData.land_size_min, validatedData.land_size_max,
        validatedData.natural_features, validatedData.outdoor_amenities, validatedData.location_text,
        validatedData.sort_by, validatedData.results_count, new Date().toISOString()
      ]
    );
    
    client.release();
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Record search history error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Invalid search history data', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== ERROR HANDLING ====================

/*
Global error handler
Handles all unhandled errors and returns consistent error responses
*/
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large' });
    }
    return res.status(400).json({ success: false, message: 'File upload error' });
  }
  
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ==================== DEFAULT ROUTES ====================

/*
Health check endpoint
Returns server health status
*/
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Catch-all route for SPA routing (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../vitereact/dist', 'index.html'));
});

// Export for testing
export { app, pool };

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`NatureEstate API Server running on port ${port} and listening on 0.0.0.0`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database connected: ${PGDATABASE || 'Unknown'}`);
});
