import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import { processVideoAsync } from '../services/videoService';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-tubebox-key';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  try {
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalVideos = await prisma.video.count();
    const result = await prisma.video.aggregate({
      _sum: {
        views: true,
        likes: true,
        downloads: true
      }
    });

    res.json({
      totalVideos,
      totalViews: result._sum.views || 0,
      totalLikes: result._sum.likes || 0,
      totalDownloads: result._sum.downloads || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(videos);
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
    const video = await prisma.video.create({
      data: {
        title,
        description,
        status: 'PROCESSING'
      }
    });

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
    const video = await prisma.video.findUnique({
      where: { id }
    });

    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};