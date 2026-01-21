import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { initBot, processUpdate } from '../src/telegram/bot';
import { registerHandlers } from '../src/telegram/handlers';
import { initializeDatabase } from '../src/services/init.service';

dotenv.config();

// Initialize once (cold start)
let initialized = false;

async function initialize() {
    if (initialized) return;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    await initializeDatabase();
    initBot(token);
    registerHandlers();

    initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Only accept POST requests
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        // Initialize on first request
        await initialize();

        // Process the update
        const update = req.body;
        await processUpdate(update);

        // Always return 200 OK to Telegram
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        // Still return 200 to prevent Telegram from retrying
        res.status(200).json({ ok: true });
    }
}
