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

export const processVideoAsync = async (
  videoId: string,
  file: Express.Multer.File
) => {
  console.log(`[VideoService] Processing video ${videoId}`);

  const outputDir = `tmp/${videoId}`;
  fs.mkdirSync(outputDir, { recursive: true });

  const bucketName = process.env.B2_BUCKET_NAME!;

  try {
    // 🎬 STEP 1: Generate HLS
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
          "-hls_segment_filename",
          `${outputDir}/seg_%03d.ts`,
        ])
        .output(`${outputDir}/index.m3u8`)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log(`[VideoService] HLS created`);

    // ✅ Safety check
    if (!fs.existsSync(outputDir)) {
      throw new Error("HLS output missing");
    }

    const files = fs.readdirSync(outputDir);
    if (!files.length) {
      throw new Error("No HLS files generated");
    }

    // ☁️ STEP 2: Upload HLS files (parallel)
    await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(outputDir, fileName);

        const upload = new Upload({
          client: s3,
          params: {
            Bucket: bucketName,
            Key: `videos/${videoId}/${fileName}`,
            Body: fs.createReadStream(filePath),
            ContentType: fileName.endsWith(".m3u8")
              ? "application/vnd.apple.mpegurl"
              : "video/MP2T",
          },
        });

        await upload.done();
      })
    );

    console.log(`[VideoService] HLS uploaded`);

    // 📦 STEP 3: Upload original MP4 (for download)
    const originalUpload = new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: `raw/${videoId}/video.mp4`,
        Body: fs.createReadStream(file.path),
        ContentType: "video/mp4",
      },
    });

    await originalUpload.done();

    console.log(`[VideoService] Original video uploaded`);

    // 🖼️ STEP 4: Generate thumbnail (optional but recommended)
    const thumbPath = `${outputDir}/thumb.png`;

    await new Promise((resolve, reject) => {
      ffmpeg(file.path)
        .screenshots({
          count: 1,
          filename: "thumb.png",
          folder: outputDir,
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (fs.existsSync(thumbPath)) {
      const thumbUpload = new Upload({
        client: s3,
        params: {
          Bucket: bucketName,
          Key: `videos/${videoId}/thumb.png`,
          Body: fs.createReadStream(thumbPath),
          ContentType: "image/png",
        },
      });

      await thumbUpload.done();
      console.log(`[VideoService] Thumbnail uploaded`);
    }

    // 🌍 STEP 5: Build URLs (CDN fallback safe)
    const base =
      process.env.CLOUDFLARE_DOMAIN ||
      `https://f000.backblazeb2.com/file/${bucketName}`;

    const hlsUrl = `${base}/videos/${videoId}/index.m3u8`;
    const videoUrl = `${base}/raw/${videoId}/video.mp4`;
    const thumbnailUrl = `${base}/videos/${videoId}/thumb.png`;

    // 🗄️ STEP 6: Update DB
    await pool.query(
      `UPDATE "Video"
       SET status = $1,
           hls_url = $2,
           video_url = $3,
           thumbnail_url = $4,
           updated_at = NOW()
       WHERE id = $5`,
      ["READY", hlsUrl, videoUrl, thumbnailUrl, videoId]
    );

    console.log(`[VideoService] Video ${videoId} READY`);

    // 🧹 STEP 7: Cleanup
    fs.rmSync(outputDir, { recursive: true, force: true });
    fs.unlinkSync(file.path);
  } catch (error) {
    console.error(`[VideoService] ERROR for ${videoId}`, error);

    await pool.query(
      `UPDATE "Video"
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      ["FAILED", videoId]
    );

    // Cleanup even on failure
    fs.rmSync(outputDir, { recursive: true, force: true });
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
};