import { getBot } from '../bot';
import { User } from '../../domain/types';
import { t } from '../../i18n';
import { clientsListKeyboard, backButton, createInlineKeyboard } from '../keyboards';
import * as clientsRepo from '../../sheets/clients.repository';
import * as ordersRepo from '../../sheets/orders.repository';
import * as queryService from '../../services/query.service';
import { setConversationState } from '../conversationState';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { OrderStatus } from '../../domain/types';

export async function handleClientsMenu(
    chatId: number,
    data: string,
    messageId: number | undefined,
    _user: User
): Promise<void> {
    const bot = getBot();
    console.log('[ClientsHandler] Received data:', data);

    if (data === 'menu:clients') {
        const clientsWithDebt = await queryService.getAllClientsWithDebt();
        const totalDebt = clientsWithDebt.reduce((sum, item) => sum + item.totalDebt, 0);

        const text = `👥 *Mijozlar*\n\n` +
            `Jami: ${clientsWithDebt.length} ta mijoz\n` +
            `💰 Umumiy qarz: ${formatCurrency(totalDebt)}`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: clientsListKeyboard(clientsWithDebt),
            });
        } else {
            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: clientsListKeyboard(clientsWithDebt),
            });
        }
    } else if (data.startsWith('clients:page:')) {
        const page = parseInt(data.split(':')[2], 10);
        const clientsWithDebt = await queryService.getAllClientsWithDebt();
        const totalDebt = clientsWithDebt.reduce((sum, item) => sum + item.totalDebt, 0);

        const text = `👥 *Mijozlar*\n\n` +
            `Jami: ${clientsWithDebt.length} ta mijoz\n` +
            `💰 Umumiy qarz: ${formatCurrency(totalDebt)}`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: clientsListKeyboard(clientsWithDebt, page),
            });
        }
    } else if (data.startsWith('client:view:')) {
        const clientId = data.split(':')[2];
        const client = await clientsRepo.getClientById(clientId);

        if (!client) {
            await bot.sendMessage(chatId, t('clients.notFound'));
            return;
        }

        const orders = await ordersRepo.getOrdersByClient(clientId);
        const openOrders = orders.filter(o => o.status === OrderStatus.OPEN);
        const totalDebt = openOrders.reduce((sum, o) => sum + o.balanceDue, 0);

        let text = `👤 *${client.name}*\n` +
            (client.phone ? `📱 ${client.phone}\n` : '') +
            (client.address ? `📍 ${client.address}\n` : '') +
            `\n💰 ${t('orders.totalDebt')}: ${formatCurrency(totalDebt)}\n\n`;

        if (openOrders.length > 0) {
            text += `📋 *${t('orders.openOrders')} (${openOrders.length}):*\n`;
            // Sort by oldest first? Or newest? Usually oldest debts are more important. Use date.
            // openOrders.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

            openOrders.forEach((o, i) => {
                text += `${i + 1}. 🆔 /${o.orderId.substring(0, 8)}\n` + // Short ID
                    `📅 ${formatDate(o.orderDate).split('T')[0]}\n` +
                    `💵 Jami: ${formatCurrency(o.orderTotal)}\n` +
                    `✅ To'landi: ${formatCurrency(o.totalPaid)}\n` +
                    `🔴 Qoldi: ${formatCurrency(o.balanceDue)}\n\n`;
            });
        } else {
            text += `✅ ${t('orders.openOrders')} yo'q.`;
        }

        const buttons = [
            [
                { text: `➕ ${t('orders.newOrder')}`, callback_data: `order:new:selected:${clientId}` },
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
