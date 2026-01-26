
import { getBot, checkAuthorization, isAdmin } from './bot';
import { mainMenuKeyboard } from './keyboards';
import { t } from '../i18n';
import { handleProductsMenu } from './handlers/products.handler';
import { handleOrdersMenu } from './handlers/orders.handler';
import { handleClientsMenu } from './handlers/clients.handler';
import { handlePaymentsMenu } from './handlers/payments.handler';
import { handleSettingsMenu } from './handlers/settings.handler';
import { handleReportsMenu } from './handlers/reports.handler';
import { handleConversationInput } from './conversationInput';
import TelegramBot from 'node-telegram-bot-api';

/**
 * Handle incoming message
 */
export async function handleMessage(msg: TelegramBot.Message): Promise<void> {
    const telegramUser = msg.from;
    if (!telegramUser) return;

    // Check for /start command
    if (msg.text === '/start') {
        const user = await checkAuthorization(telegramUser);
        const { runWithLanguage } = await import('../i18n/context');
        await runWithLanguage(user.language || 'uz', async () => {
            const welcomeMessage = `Assalomu alaykum, ${user.firstName}! 👋\n\n${t('common.mainMenu')}`;
            const bot = getBot();
            await bot.sendMessage(msg.chat.id, welcomeMessage, {
                reply_markup: mainMenuKeyboard(isAdmin(user)),
            });
        });
        return;
    }

    if (msg.text?.startsWith('/')) return; // Skip other commands if any

    const user = await checkAuthorization(telegramUser);
    const { runWithLanguage } = await import('../i18n/context');

    await runWithLanguage(user.language || 'uz', async () => {
        // Handle user input based on conversation state
        const handled = await handleConversationInput(msg.chat.id, msg.text || '', user);

        if (!handled) {
            // No active conversation
        }
    });
}

/**
 * Handle callback query
 */
export async function handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
    const telegramUser = query.from;
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (!chatId || !data) return;

    const user = await checkAuthorization(telegramUser);
    const { runWithLanguage } = await import('../i18n/context');

    const bot = getBot();

    await runWithLanguage(user.language || 'uz', async () => {
        try {
            // Answer callback query immediately
            await bot.answerCallbackQuery(query.id);

            // Route to appropriate handler
            if (data === 'menu:main') {
                const keyboard = mainMenuKeyboard(isAdmin(user));
                await bot.editMessageText(t('common.mainMenu'), {
                    chat_id: chatId,
                    message_id: query.message?.message_id,
                    reply_markup: keyboard,
                });
            } else if (data.startsWith('menu:products') || data.startsWith('product:') || data.startsWith('products:')) {
                await handleProductsMenu(chatId, data, query.message?.message_id, user);
            } else if (data.startsWith('menu:orders') || data.startsWith('order:') || data.startsWith('orders:') || data.startsWith('o:') || data.startsWith('comment:')) {
                await handleOrdersMenu(chatId, data, query.message?.message_id, user);
            } else if (data.startsWith('menu:clients') || data.startsWith('client:') || data.startsWith('clients:')) {
                await handleClientsMenu(chatId, data, query.message?.message_id, user);
            } else if (data.startsWith('menu:payments') || data.startsWith('payment:') || data.startsWith('payments:')) {
                await handlePaymentsMenu(chatId, data, query.message?.message_id, user);
            } else if (data === 'menu:users') {
                if (!isAdmin(user)) {
                    await bot.sendMessage(chatId, t('roles.noPermission'));
                    return;
                }
                // TODO: Implement users handler
                await bot.sendMessage(chatId, 'Foydalanuvchilar bo\'limi ishlab chiqilmoqda...');
            } else if (data.startsWith('menu:settings') || data.startsWith('settings:')) {
                await handleSettingsMenu(chatId, data, query.message?.message_id, user);
            } else if (data.startsWith('menu:reports') || data.startsWith('reports:')) {
                await handleReportsMenu(chatId, data, query.message?.message_id, user);
            } else if (data === 'cancel') {
                await bot.editMessageText(t('common.cancelled'), {
                    chat_id: chatId,
                    message_id: query.message?.message_id,
                });
            }
        } catch (error) {
            console.error('Error handling callback query:', error);
            await bot.sendMessage(chatId, t('common.error'));
        }
    });
}

/**
 * Register all bot handlers (for polling mode)
 */
export function registerHandlers(): void {
    const bot = getBot();

    // Start command & Text messages
    bot.on('message', async (msg) => {
        await handleMessage(msg);
    });

    // Callback query handler
    bot.on('callback_query', async (query) => {
        await handleCallbackQuery(query);
    });
}
