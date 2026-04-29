"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processVideoAsync = void 0;
// src/services/videoService.ts
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lib_storage_1 = require("@aws-sdk/lib-storage");
const b2_1 = require("../config/b2");
const db_1 = __importDefault(require("../db"));
if (ffmpeg_static_1.default) {
    fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
}
const processVideoAsync = async (videoId, file) => {
    console.log(`[VideoService] Started asynchronous processing for video ${videoId}`);
    const outputDir = `tmp/${videoId}`;
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    try {
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(file.path)
                .outputOptions([
                "-preset veryfast",
                "-g 48",
                "-sc_threshold 0",
                "-map 0:v:0",
                "-map 0:a:0",
                "-b:v:0 1500k",
                "-s:v:0 1280x720",
                "-f hls",
                "-hls_time 6",
                "-hls_playlist_type vod",
                "-hls_segment_filename", `${outputDir}/seg_%03d.ts`
            ])
                .output(`${outputDir}/index.m3u8`)
                .on("end", resolve)
                .on("error", reject)
                .run();
        });
        console.log(`[VideoService] FFmpeg finished for video ${videoId}. Uploading to B2...`);
        const files = fs_1.default.readdirSync(outputDir);
        const bucketName = process.env.B2_BUCKET_NAME;
        for (const fileName of files) {
            const filePath = path_1.default.join(outputDir, fileName);
            const fileStream = fs_1.default.createReadStream(filePath);
            const s3Key = `videos/${videoId}/${fileName}`;
            const upload = new lib_storage_1.Upload({
                client: b2_1.s3,
                params: {
                    Bucket: bucketName,
                    Key: s3Key,
                    Body: fileStream,
                    ContentType: fileName.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T'
                }
            });
            await upload.done();
        }
        console.log(`[VideoService] Upload complete for video ${videoId}. Updating database...`);
        const hlsUrl = `${process.env.CLOUDFLARE_DOMAIN}/videos/${videoId}/index.m3u8`;
        const videoUrl = `${process.env.CLOUDFLARE_DOMAIN}/raw/${videoId}/video.mp4`; // Note: Original file upload not shown in this specific method, adjust if needed.
        await db_1.default.query('UPDATE "Video" SET status = $1, hls_url = $2, video_url = $3, updated_at = NOW() WHERE id = $4', ['READY', hlsUrl, videoUrl, videoId]);
        // Cleanup
        fs_1.default.rmSync(outputDir, { recursive: true, force: true });
        // optionally delete the original multer upload file if it was saved locally
        // fs.unlinkSync(file.path); 
        console.log(`[VideoService] Video ${videoId} is now READY`);
    }
    catch (error) {
        console.error(`[VideoService] Error processing video ${videoId}`, error);
        await db_1.default.query('UPDATE "Video" SET status = $1, updated_at = NOW() WHERE id = $2', ['FAILED', videoId]);
        // Cleanup on failure
        fs_1.default.rmSync(outputDir, { recursive: true, force: true });
    }
};
exports.processVideoAsync = processVideoAsync;
