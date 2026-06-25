"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const initDb = async () => {
    console.log('🔄 Connecting to database and setting up tables...');
    try {
        // 1. Create Admin Table
        console.log('Creating "Admin" table...');
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // 2. Create Video Table
        console.log('Creating "Video" table...');
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS "Video" (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'PROCESSING',
        hls_url TEXT,
        video_url TEXT,
        thumbnail_url TEXT,
        views INT DEFAULT 0,
        likes INT DEFAULT 0,
        downloads INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // 3. Create ApiKey Table
        console.log('Creating "ApiKey" table...');
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS "ApiKey" (
        id UUID PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // 4. Create AdEvent Table
        console.log('Creating "AdEvent" table...');
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS "AdEvent" (
        id UUID PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        time_spent INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ All tables verified/created successfully.');
        // 5. Create or Update Admin Account
        const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
        console.log(`👤 Checking admin account: "${defaultUsername}"...`);
        const saltRounds = 10;
        const passwordHash = await bcryptjs_1.default.hash(defaultPassword, saltRounds);
        const existingAdmin = await db_1.default.query('SELECT id FROM "Admin" WHERE username = $1', [defaultUsername]);
        if (existingAdmin.rows.length > 0) {
            console.log('🔄 Admin user already exists. Updating password...');
            await db_1.default.query('UPDATE "Admin" SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2', [passwordHash, defaultUsername]);
            console.log(`✅ Admin password updated successfully.`);
        }
        else {
            console.log('✨ Creating new admin user...');
            const adminId = crypto_1.default.randomUUID();
            await db_1.default.query('INSERT INTO "Admin" (id, username, password_hash) VALUES ($1, $2, $3)', [adminId, defaultUsername, passwordHash]);
            console.log(`✅ Admin user "${defaultUsername}" created successfully.`);
        }
    }
    catch (error) {
        console.error('❌ Error setting up database:', error);
    }
    finally {
        await db_1.default.end();
        console.log('🔌 Database connection closed.');
    }
};
initDb();
