
import { getBot } from '../bot';
import { User } from '../../domain/types';
import { t } from '../../i18n';
import { createInlineKeyboard, backButton } from '../keyboards';
import { updateUser } from '../../sheets/users.repository';

export async function handleSettingsMenu(
    chatId: number,
    data: string,
    messageId: number | undefined,
    user: User
): Promise<void> {
    const bot = getBot();

    if (data === 'menu:settings') {
        const text = `⚙️ *${t('menu.settings')}*\n\nTilni tanlang / Выберите язык:`;

        const buttons = [
            [{ text: '🇺🇿 O\'zbekcha', callback_data: 'settings:lang:uz' }],
            [{ text: '🇷🇺 Русский', callback_data: 'settings:lang:ru' }],
            ...backButton()
        ];

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard(buttons),
            });
        }
    } else if (data.startsWith('settings:lang:')) {
        const lang = data.split(':')[2];

        // Update user language
        await updateUser(user.userId, { language: lang });

        // Acknowledge and return to main menu with new language
        // We need to re-import context to update it for current execution potentially, 
        // but since we are inside runWithLanguage closure, we might need to manually call t with new lang or just restart flow?
        // Actually, runWithLanguage uses the value passed at start.
        // So we should send a message saying "Language updated" in NEW language.

        // Hack: Manually get string from new language for immediate feedback
        const { uz } = await import('../../i18n/uz');
        const { ru } = await import('../../i18n/ru');
        const dict = lang === 'ru' ? ru : uz;
        const savedText = dict.common.saved;
        const mainMenuText = dict.common.mainMenu;

        await bot.sendMessage(chatId, `✅ ${savedText}\n\n${mainMenuText}`, {
            reply_markup: createInlineKeyboard([
                [{ text: dict.menu.products, callback_data: 'menu:products' }, { text: dict.menu.orders, callback_data: 'menu:orders' }],
                [{ text: dict.menu.clients, callback_data: 'menu:clients' }, { text: dict.menu.payments, callback_data: 'menu:payments' }],
                [{ text: dict.menu.reports, callback_data: 'menu:reports' }],
                // Re-add settings button if admin, but checking user role inside this quick hack is annoying.
                // Let's just redirect to main menu via edit.
            ])
        });

        // Actually better to just edit the message to Main Menu using the new language.
        // But main menu function uses 't' which uses context.
        // Force update context? No, context is async local storage.

        // Simpler: Just send a message "Done. / Tayyor." and show main menu.

        const { mainMenuKeyboard } = await import('../keyboards');
        const { isAdmin } = await import('../bot');

        // We rely on next interaction to have correct language. 
        // But we want to show main menu NOW in correct language.
        // We can run a nested runWithLanguage?
        const { runWithLanguage } = await import('../../i18n/context');

        await runWithLanguage(lang, async () => {
            const keyb = mainMenuKeyboard(isAdmin(user));
            await bot.sendMessage(chatId, t('common.saved'), { reply_markup: keyb });
        });
    }
}
