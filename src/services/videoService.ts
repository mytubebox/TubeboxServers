// src/services/videoService.ts
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { Upload } from "@aws-sdk/lib-storage";
import { s3 } from "../config/b2";
import pool from "../db";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const processVideoAsync = async (videoId: string, file: Express.Multer.File) => {
  console.log(`[VideoService] Started asynchronous processing for video ${videoId}`);
  const outputDir = `tmp/${videoId}`;
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(file.path)
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
    const files = fs.readdirSync(outputDir);
    const bucketName = process.env.B2_BUCKET_NAME!;
    
    for (const fileName of files) {
      const filePath = path.join(outputDir, fileName);
      const fileStream = fs.createReadStream(filePath);
      const s3Key = `videos/${videoId}/${fileName}`;
      
      const upload = new Upload({
        client: s3,
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

    await pool.query(
      'UPDATE "Video" SET status = $1, hls_url = $2, video_url = $3, updated_at = NOW() WHERE id = $4',
      ['READY', hlsUrl, videoUrl, videoId]
    );

    // Cleanup
    fs.rmSync(outputDir, { recursive: true, force: true });
    // optionally delete the original multer upload file if it was saved locally
    // fs.unlinkSync(file.path); 
    
    console.log(`[VideoService] Video ${videoId} is now READY`);
  } catch (error) {
    console.error(`[VideoService] Error processing video ${videoId}`, error);
    await pool.query('UPDATE "Video" SET status = $1, updated_at = NOW() WHERE id = $2', ['FAILED', videoId]);
    // Cleanup on failure
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
};