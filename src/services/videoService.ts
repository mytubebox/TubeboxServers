// src/services/videoService.ts
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

export const processVideoAsync = async (videoId: string, file: Express.Multer.File) => {
  const outputDir = `tmp/${videoId}`;
  fs.mkdirSync(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
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
};