import { Request, Response } from 'express';
import pool from '../db';

export const getFullAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Ads Analytics (Current)
    const currentAdQuery = await pool.query(`
      SELECT 
        COUNT(id) AS impressions,
        COUNT(DISTINCT device_id) AS accounts_reached,
        AVG(time_spent) AS atps
      FROM "AdEvent"
    `);

    const currentAdStats = currentAdQuery.rows[0] || {};
    const imp = parseInt(currentAdStats.impressions, 10) || 0;
    const acc = parseInt(currentAdStats.accounts_reached, 10) || 0;
    const atps = parseFloat(currentAdStats.atps) || 0;
    
    // Revenue formula: (Impressions * 0.005) + (Accounts Reached * 0.02) + (ATPS * 0.001)
    const revenue = (imp * 0.005) + (acc * 0.02) + (atps * 0.001);

    // 2. Ads Analytics (Last Month)
    const lastMonthAdQuery = await pool.query(`
      SELECT 
        COUNT(id) AS impressions,
        COUNT(DISTINCT device_id) AS accounts_reached,
        AVG(time_spent) AS atps
      FROM "AdEvent"
      WHERE created_at >= date_trunc('month', current_date - interval '1 month')
        AND created_at < date_trunc('month', current_date)
    `);

    const lmAdStats = lastMonthAdQuery.rows[0] || {};
    const lmImp = parseInt(lmAdStats.impressions, 10) || 0;
    const lmAcc = parseInt(lmAdStats.accounts_reached, 10) || 0;
    const lmAtps = parseFloat(lmAdStats.atps) || 0;
    const lmRevenue = (lmImp * 0.005) + (lmAcc * 0.02) + (lmAtps * 0.001);

    // 3. Last 7 Days Ads Impressions
    const last7DaysAdQuery = await pool.query(`
      SELECT 
        DATE(created_at) AS date,
        COUNT(id) AS impressions
      FROM "AdEvent"
      WHERE created_at >= current_date - interval '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const last7Days = last7DaysAdQuery.rows.map(row => ({
      date: row.date,
      impressions: parseInt(row.impressions, 10)
    }));

    // 4. Video Analytics
    const videoCountResult = await pool.query('SELECT COUNT(*) FROM "Video"');
    const totalVideos = parseInt(videoCountResult.rows[0].count, 10) || 0;

    const videoSumResult = await pool.query('SELECT SUM(views) as views, SUM(likes) as likes, SUM(downloads) as downloads FROM "Video"');
    const videoSums = videoSumResult.rows[0] || {};
    
    res.json({
      ads: {
        current: {
          impressions: imp,
          accountsReached: acc,
          atps: parseFloat(atps.toFixed(2)),
          revenue: parseFloat(revenue.toFixed(4))
        },
        lastMonth: {
          impressions: lmImp,
          accountsReached: lmAcc,
          atps: parseFloat(lmAtps.toFixed(2)),
          revenue: parseFloat(lmRevenue.toFixed(4))
        },
        last7Days: last7Days
      },
      videos: {
        totalVideos,
        totalViews: parseInt(videoSums.views) || 0,
        totalLikes: parseInt(videoSums.likes) || 0,
        totalDownloads: parseInt(videoSums.downloads) || 0
      }
    });

  } catch (error: any) {
    console.error('Error fetching full analytics:', error);
    // Add a check just in case AdEvent doesn't exist yet
    if (error.code === '42P01') {
      res.status(500).json({ error: 'AdEvent table does not exist yet. Please record an impression first.' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
