"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVideoById = exports.uploadVideo = exports.getAllVideos = exports.getAnalytics = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const videoService_1 = require("../services/videoService");
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-tubebox-key';
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db_1.default.query('SELECT * FROM "Admin" WHERE username = $1', [username]);
        const admin = result.rows[0];
        if (!admin) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const isValid = await bcryptjs_1.default.compare(password, admin.password_hash);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, admin: { id: admin.id, username: admin.username } });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const getAnalytics = async (req, res) => {
    try {
        const countResult = await db_1.default.query('SELECT COUNT(*) FROM "Video"');
        const totalVideos = parseInt(countResult.rows[0].count, 10);
        const sumResult = await db_1.default.query('SELECT SUM(views) as views, SUM(likes) as likes, SUM(downloads) as downloads FROM "Video"');
        const sums = sumResult.rows[0];
        res.json({
            totalVideos,
            totalViews: parseInt(sums.views) || 0,
            totalLikes: parseInt(sums.likes) || 0,
            totalDownloads: parseInt(sums.downloads) || 0
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAnalytics = getAnalytics;
const getAllVideos = async (req, res) => {
    try {
        const result = await db_1.default.query('SELECT * FROM "Video" ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllVideos = getAllVideos;
const uploadVideo = async (req, res) => {
    const { title, description } = req.body;
    const file = req.file;
    if (!file || !title) {
        res.status(400).json({ error: 'Title and video file are required' });
        return;
    }
    try {
        // 1. Create a video record with status UPLOADING/PROCESSING
        const id = crypto_1.default.randomUUID();
        const result = await db_1.default.query('INSERT INTO "Video" (id, title, description, status, updated_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *', [id, title, description, 'PROCESSING']);
        const video = result.rows[0];
        // 2. Start async processing
        (0, videoService_1.processVideoAsync)(video.id, file);
        // 3. Return response immediately (Fast response for admin)
        res.status(201).json({
            message: 'Video uploaded successfully and is now processing.',
            video
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.uploadVideo = uploadVideo;
const getVideoById = async (req, res) => {
    const idParam = req.params.id;
    // ✅ HARD type narrowing (this fixes it 100%)
    if (typeof idParam !== 'string') {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
    }
    const id = idParam;
    try {
        const result = await db_1.default.query('SELECT * FROM "Video" WHERE id = $1', [id]);
        const video = result.rows[0];
        if (!video) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }
        res.json(video);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getVideoById = getVideoById;
