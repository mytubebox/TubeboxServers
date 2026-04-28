"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadVideo = exports.likeVideo = exports.viewVideo = exports.getVideoById = exports.getVideos = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getVideos = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    try {
        const videos = await client_1.default.video.findMany({
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
        const total = await client_1.default.video.count({ where: { status: 'READY' } });
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
        const video = await client_1.default.video.findUnique({
            where: { id, status: 'READY' }
        });
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
        const video = await client_1.default.video.update({
            where: { id },
            data: { views: { increment: 1 } }
        });
        res.json({ success: true, views: video.views });
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
        const video = await client_1.default.video.update({
            where: { id },
            data: { likes: { increment: 1 } }
        });
        res.json({ success: true, likes: video.likes });
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
        const video = await client_1.default.video.update({
            where: { id },
            data: { downloads: { increment: 1 } }
        });
        res.json({ success: true, downloads: video.downloads });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.downloadVideo = downloadVideo;
