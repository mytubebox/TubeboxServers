"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processVideoAsync = void 0;
const client_1 = __importDefault(require("../prisma/client"));
/**
 * MOCK Video Service
 * In a production environment, this service would:
 * 1. Take the uploaded MP4 file.
 * 2. Upload it to Backblaze B2 (Raw storage).
 * 3. Send a message to a queue (e.g., BullMQ or AWS SQS) to process the video.
 * 4. The worker would run FFmpeg to generate HLS segments (.m3u8, .ts).
 * 5. The worker would upload HLS segments to B2 and update the database status to READY.
 *
 * To ensure it's "FAST in INDIA", a CDN like Cloudflare is placed in front of B2.
 */
const processVideoAsync = async (videoId, file) => {
    console.log(`[VideoService] Started asynchronous processing for video ${videoId}`);
    // Simulate long running FFmpeg processing (e.g., 10 seconds)
    setTimeout(async () => {
        try {
            console.log(`[VideoService] Finishing processing for video ${videoId}`);
            // Update the DB to mark as ready and set mock URLs
            await client_1.default.video.update({
                where: { id: videoId },
                data: {
                    status: 'READY',
                    // In reality, this would be the CDN URL pointing to the B2 bucket HLS playlist
                    hls_url: `https://cdn.tubebox.example.com/videos/${videoId}/playlist.m3u8`,
                    video_url: `https://cdn.tubebox.example.com/raw/${videoId}/video.mp4`
                }
            });
            console.log(`[VideoService] Video ${videoId} is now READY`);
        }
        catch (error) {
            console.error(`[VideoService] Error processing video ${videoId}`, error);
            await client_1.default.video.update({
                where: { id: videoId },
                data: { status: 'FAILED' }
            });
        }
    }, 10000); // 10 seconds simulation
};
exports.processVideoAsync = processVideoAsync;
