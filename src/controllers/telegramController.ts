import { Request, Response } from 'express';
import pool from '../db';
import crypto from 'crypto';

// Ensure the table exists dynamically when this controller is loaded
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ApiKey" (
        id UUID PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error initializing ApiKey table:', error);
  }
};

// Call immediately to ensure table is ready
initDb();

export const getTelegramApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT key, updated_at FROM "ApiKey" WHERE name = $1', ['Telegram']);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Telegram API key not found' });
      return;
    }

    res.json({ 
      name: 'Telegram',
      key: result.rows[0].key,
      updated_at: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error fetching Telegram API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTelegramApiKey = async (req: Request, res: Response): Promise<void> => {
  const { key } = req.body;

  if (!key) {
    res.status(400).json({ error: 'Key is required' });
    return;
  }

  try {
    // Check if the key already exists
    const existing = await pool.query('SELECT id FROM "ApiKey" WHERE name = $1', ['Telegram']);

    if (existing.rows.length > 0) {
      // Update existing key
      await pool.query(
        'UPDATE "ApiKey" SET key = $1, updated_at = CURRENT_TIMESTAMP WHERE name = $2',
        [key, 'Telegram']
      );
    } else {
      // Insert new key
      const id = crypto.randomUUID();
      await pool.query(
        'INSERT INTO "ApiKey" (id, name, key) VALUES ($1, $2, $3)',
        [id, 'Telegram', key]
      );
    }

    res.json({ message: 'Telegram API key updated successfully' });
  } catch (error) {
    console.error('Error updating Telegram API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
