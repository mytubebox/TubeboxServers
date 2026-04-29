import { Request, Response } from 'express';
import pool from '../db';
import crypto from 'crypto';

// Ensure the table exists dynamically when this controller is loaded
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AdEvent" (
        id UUID PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        time_spent INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error initializing AdEvent table:', error);
  }
};

initDb();

export const recordImpression = async (req: Request, res: Response): Promise<void> => {
  const { deviceId, timeSpent } = req.body;

  if (!deviceId) {
    res.status(400).json({ error: 'deviceId is required' });
    return;
  }

  try {
    const id = crypto.randomUUID();
    const spent = timeSpent ? parseInt(timeSpent, 10) : 0;

    await pool.query(
      'INSERT INTO "AdEvent" (id, device_id, time_spent) VALUES ($1, $2, $3)',
      [id, deviceId, spent]
    );

    res.status(201).json({ message: 'Impression recorded successfully' });
  } catch (error) {
    console.error('Error recording impression:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdsAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Queries for Current Period
    const currentQuery = await pool.query(`
      SELECT 
        COUNT(id) AS impressions,
        COUNT(DISTINCT device_id) AS accounts_reached,
        AVG(time_spent) AS atps
      FROM "AdEvent"
    `);

    const currentStats = currentQuery.rows[0];
    const imp = parseInt(currentStats.impressions, 10) || 0;
    const acc = parseInt(currentStats.accounts_reached, 10) || 0;
    const atps = parseFloat(currentStats.atps) || 0;
    
    // Revenue formula: (Impressions * 0.005) + (Accounts Reached * 0.02) + (ATPS * 0.001)
    const revenue = (imp * 0.005) + (acc * 0.02) + (atps * 0.001);

    // Queries for Last Month (Previous calendar month)
    const lastMonthQuery = await pool.query(`
      SELECT 
        COUNT(id) AS impressions,
        COUNT(DISTINCT device_id) AS accounts_reached,
        AVG(time_spent) AS atps
      FROM "AdEvent"
      WHERE created_at >= date_trunc('month', current_date - interval '1 month')
        AND created_at < date_trunc('month', current_date)
    `);

    const lmStats = lastMonthQuery.rows[0];
    const lmImp = parseInt(lmStats.impressions, 10) || 0;
    const lmAcc = parseInt(lmStats.accounts_reached, 10) || 0;
    const lmAtps = parseFloat(lmStats.atps) || 0;
    const lmRevenue = (lmImp * 0.005) + (lmAcc * 0.02) + (lmAtps * 0.001);

    // Last 7 days impressions as a list
    const last7DaysQuery = await pool.query(`
      SELECT 
        DATE(created_at) AS date,
        COUNT(id) AS impressions
      FROM "AdEvent"
      WHERE created_at >= current_date - interval '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const last7Days = last7DaysQuery.rows.map(row => ({
      date: row.date,
      impressions: parseInt(row.impressions, 10)
    }));

    res.json({
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
    });
  } catch (error) {
    console.error('Error fetching ads analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
