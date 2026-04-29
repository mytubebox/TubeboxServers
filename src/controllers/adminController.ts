import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { processVideoAsync } from '../services/videoService';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-tubebox-key';

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  try {
    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM "Admin" WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Admin already exists' });
      return;
    }

    // 🔐 Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const id = crypto.randomUUID();

    const result = await pool.query(
      'INSERT INTO "Admin" (id, username, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
      [id, username, password_hash]
    );

    res.status(201).json({
      message: 'Admin created successfully',
      admin: result.rows[0]
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  console.log("🔥 LOGIN ROUTE HIT");
  console.log("🔥 Body:", req.body); 
  console.log("🔥 Headers:", req.headers.authorization); 
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM "Admin" WHERE username = $1', [username]);
    const admin = result.rows[0];
    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials 400' });
      return;
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials 401' });
      return;
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error ' });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM "Video"');
    const totalVideos = parseInt(countResult.rows[0].count, 10);

    const sumResult = await pool.query('SELECT SUM(views) as views, SUM(likes) as likes, SUM(downloads) as downloads FROM "Video"');
    const sums = sumResult.rows[0];

    res.json({
      totalVideos,
      totalViews: parseInt(sums.views) || 0,
      totalLikes: parseInt(sums.likes) || 0,
      totalDownloads: parseInt(sums.downloads) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM "Video" ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  const { title, description } = req.body;
  const file = req.file;

  if (!file || !title) {
    res.status(400).json({ error: 'Title and video file are required' });
    return;
  }

  try {
    // 1. Create a video record with status UPLOADING/PROCESSING
    const id = crypto.randomUUID();
    const result = await pool.query(
      'INSERT INTO "Video" (id, title, description, status, updated_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [id, title, description, 'PROCESSING']
    );
    const video = result.rows[0];

    // 2. Start async processing
    processVideoAsync(video.id, file);

    // 3. Return response immediately (Fast response for admin)
    res.status(201).json({
      message: 'Video uploaded successfully and is now processing.',
      video
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getVideoById = async (
  req: Request,
  res: Response
): Promise<void> => {

  const idParam = req.params.id;

  // ✅ HARD type narrowing (this fixes it 100%)
  if (typeof idParam !== 'string') {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }

  const id = idParam;

  try {
    const result = await pool.query('SELECT * FROM "Video" WHERE id = $1', [id]);
    const video = result.rows[0];

    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};