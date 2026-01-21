import { getBot } from '../bot';
import { User } from '../../domain/types';
import { t } from '../../i18n';
import { clientsListKeyboard, backButton, createInlineKeyboard } from '../keyboards';
import * as clientsRepo from '../../sheets/clients.repository';
import { setConversationState } from '../conversationState';

export async function handleClientsMenu(
    chatId: number,
    data: string,
    messageId: number | undefined,
    _user: User
): Promise<void> {
    const bot = getBot();
    console.log('[ClientsHandler] Received data:', data);

    if (data === 'menu:clients') {
        const clients = await clientsRepo.getAllClients(true);
        const text = `👥 *Mijozlar*\\n\\nJami: ${clients.length} ta mijoz`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: clientsListKeyboard(clients),
            });
        } else {
            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: clientsListKeyboard(clients),
            });
        }
    } else if (data.startsWith('clients:page:')) {
        const page = parseInt(data.split(':')[2], 10);
        const clients = await clientsRepo.getAllClients(true);
        const text = `👥 *Mijozlar*\\n\\nJami: ${clients.length} ta mijoz`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: clientsListKeyboard(clients, page),
            });
        }
    } else if (data.startsWith('client:view:')) {
        const clientId = data.split(':')[2];
        const client = await clientsRepo.getClientById(clientId);

        if (!client) {
            await bot.sendMessage(chatId, t('clients.notFound'));
            return;
        }

        let text = `👤 *${client.name}*\\n\\n`;
        if (client.phone) {
            text += `📱 Telefon: ${client.phone}\\n`;
        }
        if (client.address) {
            text += `📍 Manzil: ${client.address}\\n`;
        }

        const buttons = [
            [
                { text: '📋 Buyurtmalar', callback_data: `orders:by_client:${clientId}` },
            ],
            [
                { text: '📝 ' + t('common.edit'), callback_data: `client:edit:${clientId}` },
            ],
            ...backButton('menu:clients'),
        ];

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard(buttons),
            });
        } else {
            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard(buttons),
            });
        }
    } else if (data === 'client:add') {
        console.log('[ClientsHandler] Handling client:add');
        // Start step-by-step client creation
        setConversationState(Number(_user.userId), {
            action: 'ADD_CLIENT',
            step: 'name',
            data: {}
        });

        await bot.sendMessage(
            chatId,
            '👤 *Yangi mijoz qo\'shish*\n\n' +
            '1️⃣ Mijoz ismini kiriting:\n\n' +
            '💡 Masalan: Anvar Aliyev',
            { parse_mode: 'Markdown' }
        );
        console.log('[ClientsHandler] Message sent for client:add, conversation state set');
    } else if (data === 'client:search') {
        await bot.sendMessage(
            chatId,
            '🔍 Mijozni qidirish:\n\n' +
            'Mijoz ismi yoki telefon raqamini kiriting:'
        );
        // Set conversation state to wait for search input
        setConversationState(Number(_user.userId), { action: 'SEARCH_CLIENT' });
    } else if (data.startsWith('client:edit:')) {
        // handle sub-actions like name, phone, address if deeper
        if (data.includes(':name:')) {
            const clientId = data.split(':')[3];
            setConversationState(Number(_user.userId), { action: 'EDIT_CLIENT_NAME', data: { clientId } });
            await bot.sendMessage(chatId, '👤 Yangi ismni kiriting:', { reply_markup: { force_reply: true } });
        } else if (data.includes(':phone:')) {
            const clientId = data.split(':')[3];
            setConversationState(Number(_user.userId), { action: 'EDIT_CLIENT_PHONE', data: { clientId } });
            await bot.sendMessage(chatId, '📱 Yangi telefon raqamini kiriting:', { reply_markup: { force_reply: true } });
        } else if (data.includes(':address:')) {
            const clientId = data.split(':')[3];
            setConversationState(Number(_user.userId), { action: 'EDIT_CLIENT_ADDRESS', data: { clientId } });
            await bot.sendMessage(chatId, '📍 Yangi manzilni kiriting:', { reply_markup: { force_reply: true } });
        } else {
            // Main Edit Menu
            const clientId = data.split(':')[2];

            const buttons = [
                [{ text: '👤 Ismni o\'zgartirish', callback_data: `client:edit:name:${clientId}` }],
                [{ text: '📱 Telefonni o\'zgartirish', callback_data: `client:edit:phone:${clientId}` }],
                [{ text: '📍 Manzilni o\'zgartirish', callback_data: `client:edit:address:${clientId}` }],
                [{ text: '🗑 O\'chirish', callback_data: `client:delete_confirm:${clientId}` }],
                ...backButton(`client:view:${clientId}`)
            ];

            await bot.editMessageText('📝 Mijoz ma\'lumotlarini tahrirlash:', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: createInlineKeyboard(buttons)
            });
        }
    } else if (data.startsWith('client:delete_confirm:')) {
        const clientId = data.split(':')[2];
        const { yesNoKeyboard } = await import('../keyboards');

        await bot.editMessageText('❓ Haqiqatan ham bu mijozni o\'chirmoqchimisiz?', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: yesNoKeyboard(
                `client:delete:${clientId}`,
                `client:view:${clientId}`
            )
        });
    } else if (data.startsWith('client:delete:')) {
        const clientId = data.split(':')[2];
        await clientsRepo.updateClient(clientId, { active: false });

        await bot.sendMessage(chatId, '✅ Mijoz o\'chirildi (arxivlandi).');
        await handleClientsMenu(chatId, 'menu:clients', undefined, _user);
    }
}
