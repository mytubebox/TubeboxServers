"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelegramBot = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const db_1 = __importDefault(require("../db"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const videoService_1 = require("./videoService");
const userStates = new Map();
let bot = null;
const initTelegramBot = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set in .env. Telegram bot will not start.');
        return;
    }
    bot = new node_telegram_bot_api_1.default(token, { polling: true });
    console.log('🤖 Telegram bot started');
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        userStates.set(chatId, { step: 'AUTH' });
        bot?.sendMessage(chatId, 'Welcome to Telegram Upload for Tubebox.\nPlease provide your Authentication Code:');
    });
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text?.trim();
        // Ignore commands like /start
        if (text?.startsWith('/'))
            return;
        const state = userStates.get(chatId);
        if (!state) {
            // If no state, they haven't sent /start, or state was reset.
            bot?.sendMessage(chatId, 'Please send /start to begin the upload process.');
            return;
        }
        try {
            if (state.step === 'AUTH') {
                if (!text) {
                    bot?.sendMessage(chatId, 'Please provide a valid Authentication Code.');
                    return;
                }
                // Verify API key from DB
                const result = await db_1.default.query('SELECT * FROM "ApiKey" WHERE name = $1 AND key = $2', ['Telegram', text]);
                if (result.rows.length === 0) {
                    bot?.sendMessage(chatId, 'Invalid Authentication Code. Please try again or send /start to restart.');
                    return;
                }
                userStates.set(chatId, { step: 'TITLE', authKey: text });
                bot?.sendMessage(chatId, 'Authentication successful! 🎉\nPlease enter the Video Title:');
                return;
            }
            if (state.step === 'TITLE') {
                if (!text) {
                    bot?.sendMessage(chatId, 'Please provide a valid Video Title.');
                    return;
                }
                state.title = text;
                state.step = 'VIDEO';
                userStates.set(chatId, state);
                bot?.sendMessage(chatId, 'Great! Now please Upload the Video file:');
                return;
            }
            if (state.step === 'VIDEO') {
                if (!msg.video && !msg.document) {
                    bot?.sendMessage(chatId, 'Please upload a valid video file.');
                    return;
                }
                const fileId = msg.video?.file_id || msg.document?.file_id;
                if (!fileId) {
                    bot?.sendMessage(chatId, 'Could not detect the file. Please upload a valid video.');
                    return;
                }
                bot?.sendMessage(chatId, 'Downloading video, please wait...');
                const tmpDir = path_1.default.join(process.cwd(), 'tmp');
                if (!fs_1.default.existsSync(tmpDir)) {
                    fs_1.default.mkdirSync(tmpDir, { recursive: true });
                }
                // Download the file from Telegram
                const filePath = await bot.downloadFile(fileId, tmpDir);
                const videoId = crypto_1.default.randomUUID();
                const description = 'Uploaded using Telegram';
                const title = state.title || 'Untitled Video';
                // Insert into Database
                const dbResult = await db_1.default.query(`INSERT INTO "Video"
           (id, title, description, status, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING *`, [videoId, title, description, "PROCESSING"]);
                const video = dbResult.rows[0];
                // Create a mock Multer file object for processVideoAsync
                const stats = fs_1.default.statSync(filePath);
                const mockFile = {
                    path: filePath,
                    size: stats.size,
                    mimetype: msg.video?.mime_type || msg.document?.mime_type || 'video/mp4',
                    originalname: msg.video?.file_name || msg.document?.file_name || 'telegram_upload.mp4',
                    fieldname: 'file',
                    filename: path_1.default.basename(filePath),
                    encoding: '7bit',
                    destination: tmpDir,
                    buffer: Buffer.from([]),
                    stream: fs_1.default.createReadStream(filePath),
                };
                // Reset user state
                userStates.delete(chatId);
                bot?.sendMessage(chatId, `Upload started successfully! 🚀\nYour Video ID is: \`${videoId}\`\n\nThe video is now processing.`, { parse_mode: 'Markdown' });
                // Trigger processing
                try {
                    (0, videoService_1.processVideoAsync)(videoId, mockFile)
                        .then(() => {
                        console.log(`[TelegramBot] Processing completed for video: ${videoId}`);
                        bot?.sendMessage(chatId, `✅ Video \`${videoId}\` has finished processing and is READY!`, { parse_mode: 'Markdown' });
                    })
                        .catch(async (err) => {
                        console.error(`[TelegramBot] Processing failed for video: ${videoId}`, err);
                        await db_1.default.query(`UPDATE "Video" SET status = $1 WHERE id = $2`, ["FAILED", videoId]);
                        bot?.sendMessage(chatId, `❌ Video \`${videoId}\` failed to process.`, { parse_mode: 'Markdown' });
                    });
                }
                catch (asyncErr) {
                    console.error("[TelegramBot] processVideoAsync immediate error:", asyncErr);
                }
                return;
            }
        }
        catch (error) {
            console.error('[TelegramBot] Error handling message:', error);
            bot?.sendMessage(chatId, 'An internal error occurred. Please try again later.');
        }
    });
};
exports.initTelegramBot = initTelegramBot;
