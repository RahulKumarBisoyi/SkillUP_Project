import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'skillup_default_dev_secret';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Helper to generate JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/register
 * Register a new user account.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ status: 'error', message: 'Name is required.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ status: 'error', message: 'A valid email is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.',
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate email
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists.',
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user into database
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [trimmedName, normalizedEmail, passwordHash]
    );

    const userId = result.insertId;
    const safeUser = {
      id: userId,
      name: trimmedName,
      email: normalizedEmail,
    };

    // Generate JWT and set httpOnly cookie
    const token = generateToken(safeUser);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      status: 'ok',
      message: 'Registration successful',
      user: safeUser,
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate existing user and issue JWT.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user by email
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];

    // Compare provided password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    };

    // Generate token and set cookie
    const token = generateToken(safeUser);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(200).json({
      status: 'ok',
      message: 'Login successful',
      user: safeUser,
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Return current authenticated user information.
 */
export async function getMe(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.',
      });
    }

    const user = users[0];
    return res.status(200).json({
      status: 'ok',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Clear authentication session/cookie.
 */
export async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.status(200).json({
    status: 'ok',
    message: 'Logged out successfully',
  });
}
