"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.getVideoById = exports.uploadVideo = exports.getAllVideos = exports.getAnalytics = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const videoService_1 = require("../services/videoService");
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-tubebox-key';
const signup = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: 'Username and password required' });
        return;
    }
    try {
        // Check if user exists
        const existing = await db_1.default.query('SELECT id FROM "Admin" WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            res.status(409).json({ error: 'Admin already exists' });
            return;
        }
        // 🔐 Hash password
        const saltRounds = 10;
        const password_hash = await bcryptjs_1.default.hash(password, saltRounds);
        const id = crypto_1.default.randomUUID();
        const result = await db_1.default.query('INSERT INTO "Admin" (id, username, password_hash) VALUES ($1, $2, $3) RETURNING id, username', [id, username, password_hash]);
        res.status(201).json({
            message: 'Admin created successfully',
            admin: result.rows[0]
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    console.log("🔥 LOGIN ROUTE HIT");
    console.log("🔥 Body:", req.body);
    console.log("🔥 Headers:", req.headers.authorization);
    const { username, password } = req.body;
    try {
        const result = await db_1.default.query('SELECT * FROM "Admin" WHERE username = $1', [username]);
        const admin = result.rows[0];
        if (!admin) {
            res.status(401).json({ error: 'Invalid credentials 400' });
            return;
        }
        const isValid = await bcryptjs_1.default.compare(password, admin.password_hash);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials 401' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, admin: { id: admin.id, username: admin.username } });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error ' });
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
    console.log("========== UPLOAD VIDEO START ==========");
    console.log("Time:", new Date().toISOString());
    try {
        console.log("Headers:", req.headers);
        console.log("Body:", req.body);
        console.log("File Exists:", !!req.file);
        const { title, description } = req.body;
        const file = req.file;
        if (file) {
            console.log("File Details:", {
                fieldname: file.fieldname,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                filename: file.filename,
                path: file.path
            });
        }
        if (!file || !title) {
            console.log("Validation Failed => Missing title or file");
            res.status(400).json({
                error: "Title and video file are required"
            });
            return;
        }
        console.log("Generating UUID...");
        const id = crypto_1.default.randomUUID();
        console.log("Generated ID:", id);
        console.log("Running DB Insert...");
        const result = await db_1.default.query(`INSERT INTO "Video"
       (id, title, description, status, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`, [id, title, description, "PROCESSING"]);
        console.log("DB Insert Success");
        console.log("Rows Returned:", result.rows.length);
        const video = result.rows[0];
        console.log("Inserted Video:", video);
        console.log("Starting Async Processing...");
        try {
            (0, videoService_1.processVideoAsync)(video.id, file)
                .then(() => {
                console.log("Processing completed:", video.id);
            })
                .catch(async (err) => {
                console.error("Processing failed:", err);
                await db_1.default.query(`UPDATE "Video" SET status = $1 WHERE id = $2`, ["FAILED", video.id]);
            });
            console.log("processVideoAsync triggered successfully");
        }
        catch (asyncErr) {
            console.error("processVideoAsync immediate error:", asyncErr);
        }
        console.log("Sending Success Response...");
        res.status(201).json({
            message: "Video uploaded successfully and is now processing.",
            video
        });
        console.log("========== UPLOAD VIDEO END SUCCESS ==========");
    }
    catch (error) {
        console.error("========== UPLOAD VIDEO ERROR ==========");
        console.error("Message:", error?.message);
        console.error("Stack:", error?.stack);
        console.error("Full Error:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error?.message || "Unknown error"
        });
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
const deleteVideo = async (req, res) => {
    const idParam = req.params.id;
    if (typeof idParam !== 'string') {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
    }
    const id = idParam;
    try {
        const result = await db_1.default.query('DELETE FROM "Video" WHERE id = $1 RETURNING *', [id]);
        const video = result.rows[0];
        if (!video) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }
        // Trigger async deletion from B2 storage
        (0, videoService_1.deleteVideoFilesAsync)(id).catch(err => {
            console.error(`Failed to delete B2 files asynchronously for video ${id}:`, err);
        });
        res.json({ message: 'Video deleted successfully', video });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteVideo = deleteVideo;
