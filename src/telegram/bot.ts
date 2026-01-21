import TelegramBot from 'node-telegram-bot-api';
import { User, UserRole } from '../domain/types';
import * as usersRepo from '../sheets/users.repository';

let bot: TelegramBot | null = null;

export function initBot(token: string, webhook?: { url: string }): TelegramBot {
    if (bot) {
        return bot;
    }

    if (webhook) {
        // Webhook mode for Vercel
        bot = new TelegramBot(token);
    } else {
        // Polling mode for development
        bot = new TelegramBot(token, { polling: true });
    }

    return bot;
}

export function getBot(): TelegramBot {
    if (!bot) {
        throw new Error('Bot not initialized');
    }
    return bot;
}

/**
 * Set webhook for Vercel deployment
 */
export async function setWebhook(url: string): Promise<boolean> {
    const telegramBot = getBot();
    return telegramBot.setWebHook(url);
}

/**
 * Process webhook update
 */
export async function processUpdate(update: TelegramBot.Update): Promise<void> {
    const telegramBot = getBot();
    // @ts-ignore - processUpdate is a valid method
    telegramBot.processUpdate(update);
}

/**
 * Check if user is authorized
 */
export async function checkAuthorization(telegramUser: TelegramBot.User): Promise<User> {
    const userId = telegramUser.id.toString();
    const user = await usersRepo.getUserById(userId);

    // If user exists, return them (checking active status is skipped as per "anyone can use it")
    // We force the role to ADMIN to satisfy any role checks in the future
    if (user) {
        return {
            ...user,
            role: UserRole.ADMIN,
            active: true
        };
    }

    // If user doesn't exist, return a temporary Admin user
    return {
        userId: userId,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        role: UserRole.ADMIN,
        active: true,
        createdAt: new Date()
    };
}

/**
 * Check if user has admin role
 */
export function isAdmin(_user: User): boolean {
    return true; // Everyone is an admin now
}

/**
 * Send unauthorized message
 */
export async function sendUnauthorized(chatId: number): Promise<void> {
    const telegramBot = getBot();
    await telegramBot.sendMessage(
        chatId,
        'Sizda ushbu botdan foydalanish huquqi yo\'q. Administrator bilan bog\'laning.'
    );
}
