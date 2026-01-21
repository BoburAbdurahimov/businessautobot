import { VercelRequest, VercelResponse } from '@vercel/node';
import { getBot, initializeBot } from '../src/telegram/bot';
import { registerHandlers } from '../src/telegram/handlers';
import { initializeDatabase } from '../src/services/init.service';

// Initialize bot on cold start
let isInitialized = false;

async function ensureInitialized() {
    if (!isInitialized) {
        console.log('Initializing bot for webhook...');

        // Initialize database
        await initializeDatabase();

        // Initialize bot
        await initializeBot(true); // webhook mode

        // Register handlers
        registerHandlers();

        isInitialized = true;
        console.log('Bot initialized successfully');
    }
}

/**
 * Vercel serverless function for Telegram webhook
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Ensure bot is initialized
        await ensureInitialized();

        // Verify webhook secret (optional but recommended)
        const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
        if (webhookSecret) {
            const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
            if (providedSecret !== webhookSecret) {
                console.error('Invalid webhook secret');
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        // Get the update from Telegram
        const update = req.body;

        if (!update) {
            return res.status(400).json({ error: 'No update provided' });
        }

        // Process the update
        const bot = getBot();
        await bot.processUpdate(update);

        // Respond with 200 OK
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);

        // Always return 200 to Telegram to avoid retries
        // Log the error for debugging
        return res.status(200).json({ ok: false, error: 'Internal error' });
    }
}
