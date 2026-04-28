"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVideoById = exports.uploadVideo = exports.getAllVideos = exports.getAnalytics = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = __importDefault(require("../prisma/client"));
const videoService_1 = require("../services/videoService");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-tubebox-key';
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await client_1.default.admin.findUnique({ where: { username } });
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
        const totalVideos = await client_1.default.video.count();
        const result = await client_1.default.video.aggregate({
            _sum: {
                views: true,
                likes: true,
                downloads: true
            }
        });
        res.json({
            totalVideos,
            totalViews: result._sum.views || 0,
            totalLikes: result._sum.likes || 0,
            totalDownloads: result._sum.downloads || 0
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAnalytics = getAnalytics;
const getAllVideos = async (req, res) => {
    try {
        const videos = await client_1.default.video.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.json(videos);
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
        const video = await client_1.default.video.create({
            data: {
                title,
                description,
                status: 'PROCESSING'
            }
        });
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
        const video = await client_1.default.video.findUnique({
            where: { id }
        });
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
