import dotenv from 'dotenv';
import { initBot, setWebhook } from './telegram/bot';
import { registerHandlers } from './telegram/dispatcher';
import { initializeDatabase } from './services/init.service';

// Load environment variables
dotenv.config();

async function main() {
    console.log('Starting Telegram Business Bot...');

    // Initialize database (Google Sheets)
    await initializeDatabase();

    // Get environment variables
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    // Initialize bot
    if (webhookUrl) {
        // Webhook mode (for Vercel)
        console.log('Running in webhook mode');
        initBot(token, { url: webhookUrl });
        await setWebhook(webhookUrl);
        console.log(`Webhook set to: ${webhookUrl}`);
    } else {
        // Polling mode (for development)
        console.log('Running in polling mode');
        initBot(token);
    }

    // Register handlers
    registerHandlers();

    console.log('Bot is ready!');
}

// Run if this is the main module
if (require.main === module) {
    main().catch((error) => {
        console.error('Failed to start bot:', error);
        process.exit(1);
    });
}

export { main };
