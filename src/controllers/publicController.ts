import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getVideos = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const videos = await prisma.video.findMany({
      where: { status: 'READY' },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        thumbnail_url: true,
        views: true,
        likes: true,
        created_at: true
      }
    });

    const total = await prisma.video.count({ where: { status: 'READY' } });

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
  const { id } = req.params;
  try {
    const video = await prisma.video.findUnique({
      where: { id, status: 'READY' }
    });

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
  const { id } = req.params;
  try {
    const video = await prisma.video.update({
      where: { id },
      data: { views: { increment: 1 } }
    });
    res.json({ success: true, views: video.views });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likeVideo = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const video = await prisma.video.update({
      where: { id },
      data: { likes: { increment: 1 } }
    });
    res.json({ success: true, likes: video.likes });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadVideo = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const video = await prisma.video.update({
      where: { id },
      data: { downloads: { increment: 1 } }
    });
    res.json({ success: true, downloads: video.downloads });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
