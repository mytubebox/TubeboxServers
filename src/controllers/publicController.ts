import { Request, Response } from 'express';
import pool from '../db';

export const getVideos = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const result = await pool.query(
      'SELECT id, title, thumbnail_url, views, likes, created_at FROM "Video" WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      ['READY', limit, skip]
    );
    const videos = result.rows;

    const countResult = await pool.query('SELECT COUNT(*) FROM "Video" WHERE status = $1', ['READY']);
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      data: videos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getVideoById = async (req: Request, res: Response): Promise<void> => {
  const idParam = req.params.id;

if (typeof idParam !== 'string') {
  res.status(400).json({ error: 'Invalid ID' });
  return;
}

const id = idParam;
  try {
    const result = await pool.query('SELECT * FROM "Video" WHERE id = $1 AND status = $2', [id, 'READY']);
    const video = result.rows[0];

    if (!video) {
      res.status(404).json({ error: 'Video not found or not ready yet' });
      return;
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const viewVideo = async (req: Request, res: Response): Promise<void> => {
  const idParam = req.params.id;

if (typeof idParam !== 'string') {
  res.status(400).json({ error: 'Invalid ID' });
  return;
}

const id = idParam;
  try {
    const result = await pool.query('UPDATE "Video" SET views = views + 1 WHERE id = $1 RETURNING views', [id]);
    res.json({ success: true, views: result.rows[0]?.views });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likeVideo = async (req: Request, res: Response): Promise<void> => {
  const idParam = req.params.id;

if (typeof idParam !== 'string') {
  res.status(400).json({ error: 'Invalid ID' });
  return;
}

const id = idParam;
  try {
    const result = await pool.query('UPDATE "Video" SET likes = likes + 1 WHERE id = $1 RETURNING likes', [id]);
    res.json({ success: true, likes: result.rows[0]?.likes });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadVideo = async (req: Request, res: Response): Promise<void> => {
  const idParam = req.params.id;

if (typeof idParam !== 'string') {
  res.status(400).json({ error: 'Invalid ID' });
  return;
}

const id = idParam;
  try {
    const result = await pool.query('UPDATE "Video" SET downloads = downloads + 1 WHERE id = $1 RETURNING downloads', [id]);
    res.json({ success: true, downloads: result.rows[0]?.downloads });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
