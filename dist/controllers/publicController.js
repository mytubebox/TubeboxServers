"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadVideo = exports.likeVideo = exports.viewVideo = exports.getVideoById = exports.getVideos = void 0;
const db_1 = __importDefault(require("../db"));
const getVideos = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    try {
        const result = await db_1.default.query('SELECT id, title, thumbnail_url, views, likes, created_at FROM "Video" WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', ['READY', limit, skip]);
        const videos = result.rows;
        const countResult = await db_1.default.query('SELECT COUNT(*) FROM "Video" WHERE status = $1', ['READY']);
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
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getVideos = getVideos;
const getVideoById = async (req, res) => {
    const idParam = req.params.id;
    if (typeof idParam !== 'string') {
        res.status(400).json({ error: 'Invalid ID' });
        return;
    }
    const id = idParam;
    try {
        const result = await db_1.default.query('SELECT * FROM "Video" WHERE id = $1 AND status = $2', [id, 'READY']);
        const video = result.rows[0];
        if (!video) {
            res.status(404).json({ error: 'Video not found or not ready yet' });
            return;
        }
        res.json(video);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getVideoById = getVideoById;
const viewVideo = async (req, res) => {
    const idParam = req.params.id;
    if (typeof idParam !== 'string') {
        res.status(400).json({ error: 'Invalid ID' });
        return;
    }
    const id = idParam;
    try {
        const result = await db_1.default.query('UPDATE "Video" SET views = views + 1 WHERE id = $1 RETURNING views', [id]);
        res.json({ success: true, views: result.rows[0]?.views });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.viewVideo = viewVideo;
const likeVideo = async (req, res) => {
    const idParam = req.params.id;
    if (typeof idParam !== 'string') {
        res.status(400).json({ error: 'Invalid ID' });
        return;
    }
    const id = idParam;
    try {
        const result = await db_1.default.query('UPDATE "Video" SET likes = likes + 1 WHERE id = $1 RETURNING likes', [id]);
        res.json({ success: true, likes: result.rows[0]?.likes });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.likeVideo = likeVideo;
const downloadVideo = async (req, res) => {
    const idParam = req.params.id;
    if (typeof idParam !== 'string') {
        res.status(400).json({ error: 'Invalid ID' });
        return;
    }
    const id = idParam;
    try {
        const result = await db_1.default.query('UPDATE "Video" SET downloads = downloads + 1 WHERE id = $1 RETURNING downloads', [id]);
        res.json({ success: true, downloads: result.rows[0]?.downloads });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.downloadVideo = downloadVideo;
