import { getBot } from '../bot';
import { User } from '../../domain/types';
import { t } from '../../i18n';
import {
    ordersMenuKeyboard,
    ordersListKeyboard,
    backButton,
    createInlineKeyboard,
    clientsWithOpenOrdersKeyboard,
    ordersListSortingToolbar
} from '../keyboards';
import * as orderService from '../../services/order.service';
import * as queryService from '../../services/query.service';
import * as ordersRepo from '../../sheets/orders.repository';
import * as paymentsRepo from '../../sheets/payments.repository';

import { formatCurrency, formatDate } from '../../utils/helpers';
import { OrderStatus, DiscountType } from '../../domain/types';
import { getOverpaymentAmount, isOverpaid } from '../../domain/calculations';

// Simple in-memory state for sorting (in production, use Redis or callback_data)
const sortState = new Map<number, string>(); // userId -> sortType

export async function handleOrdersMenu(
    chatId: number,
    data: string,
    messageId: number | undefined,
    user: User
): Promise<void> {
    const bot = getBot();

    if (data === 'menu:orders') {
        const text = `📋 *${t('orders.title')}*\n\n${t('orders.title')}`; // Description? "Manage orders"

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: ordersMenuKeyboard(),
            });
        } else {
            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: ordersMenuKeyboard(),
            });
        }
    }

    // ==================== OPEN ORDERS BY CLIENT (GROUPED) ====================
    else if (data.startsWith('orders:open_by_client')) {
        const parts = data.split(':');
        const page = parts.includes('page') ? parseInt(parts[parts.length - 1], 10) : 0;

        const clientsWithOrders = await queryService.getClientsWithOpenOrders();
        const sorted = queryService.sortClientsWithOpenOrders(clientsWithOrders, 'balance');

        let text = `🟡 *${t('orders.openOrdersByClient')}*\n\n`;
        text += `${t('orders.client')}: ${sorted.length}, ${t('orders.openOrders')}: ${sorted.reduce((sum, c) => sum + c.orderCount, 0)}\n`;
        text += `${t('orders.totalDebt')}: ${formatCurrency(sorted.reduce((sum, c) => sum + c.totalOpenBalance, 0))}\n`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: clientsWithOpenOrdersKeyboard(sorted, page),
            });
        }
    }

    // ==================== OPEN ORDERS FOR SPECIFIC CLIENT ====================
    else if (data.startsWith('orders:client_open:')) {
        const clientId = data.split(':')[2];
        const orders = await ordersRepo.getOrdersByClient(clientId);
        const openOrders = orders.filter(o => o.status === OrderStatus.OPEN);

        if (openOrders.length === 0) {
            return;
        }

        const totalDebt = openOrders.reduce((sum, o) => sum + o.balanceDue, 0);
        const clientName = openOrders[0].clientName;

        let text = `🟡 *${clientName} - ${t('orders.openOrders')}*\n\n`;
        text += `${t('orders.total')}: ${openOrders.length}\n`;
        text += `${t('orders.balance')}: ${formatCurrency(totalDebt)}\n`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: ordersListKeyboard(openOrders),
            });
        }
    }

    // ==================== OPEN ORDERS FLAT LIST WITH SORTING ====================
    else if (data.startsWith('orders:open_list')) {
        const parts = data.split(':');

        // Parse page
        let page = 0;
        const pageIdx = parts.indexOf('page');
        if (pageIdx !== -1 && parts[pageIdx + 1]) {
            page = parseInt(parts[pageIdx + 1], 10);
        }

        // Check for sort option
        let sortType: any = sortState.get(user.userId as any) || 'newest_updated';
        const sortIdx = parts.indexOf('sort');
        if (sortIdx !== -1 && parts[sortIdx + 1]) {
            sortType = parts[sortIdx + 1];
            sortState.set(user.userId as any, sortType);
            page = 0; // Reset to page 0 on sort change
        }

        // Get open orders
        const openOrders = await ordersRepo.getOrdersByStatus(OrderStatus.OPEN);
        const sorted = queryService.sortOrders(openOrders, sortType);

        // Pagination
        const pageSize = 10;
        const total = sorted.length;
        const start = page * pageSize;
        const end = start + pageSize;
        const pageOrders = sorted.slice(start, end);

        let text = `🟡 *${t('orders.openOrdersList')}*\n\n`;
        text += `${t('orders.total')}: ${total}\n`;
        text += `${t('orders.totalDebt')}: ${formatCurrency(sorted.reduce((sum, o) => sum + o.balanceDue, 0))}\n\n`;
        text += `${t('search.sortBy')}: ${getSortLabel(sortType)}`;

        // Build keyboard with sorting toolbar + list
        const sortToolbar = ordersListSortingToolbar(sortType);
        const listButtons = pageOrders.map(order => ([
            {
                text: `${order.orderId.substring(0, 10)} • ${order.clientName} • ${formatCurrency(order.balanceDue)}`,
                callback_data: `order:view:${order.orderId}`,
            },
        ]));

        // Pagination row
        const paginationRow: any[] = [];
        if (page > 0) {
            paginationRow.push({ text: t('pagination.prev'), callback_data: `orders:open_list:page:${page - 1}` });
        }
        if (end < total) {
            paginationRow.push({ text: t('pagination.next'), callback_data: `orders:open_list:page:${page + 1}` });
        }

        const allButtons = [
            ...sortToolbar,
            [{ text: '─────────', callback_data: 'noop' }],
            ...listButtons,
            ...(paginationRow.length > 0 ? [paginationRow] : []),
            ...backButton('menu:orders'),
        ];

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard(allButtons),
            });
        } else {
            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard(allButtons),
            });
        }
    }

    // ==================== ALL ORDERS ====================
    else if (data === 'orders:all') {
        const orders = await orderService.getAllOrders();
        const text = `📋 *${t('orders.allOrders')}*\n\n${t('orders.total')}: ${orders.length} ${t('pagination.items')}`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: ordersListKeyboard(orders),
            });
        }
    }

    // ==================== COMPLETED ORDERS ====================
    else if (data === 'orders:completed') {
        const orders = await orderService.getOrdersByStatus(OrderStatus.COMPLETED);
        const text = `✅ *${t('orders.completedOrders')}*\n\n${t('orders.total')}: ${orders.length} ${t('pagination.items')}`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: ordersListKeyboard(orders),
            });
        }
    }

    // ==================== ORDER DETAIL VIEW ====================
    else if (data.startsWith('order:view:')) {
        const orderId = data.split(':')[2];
        const orderData = await orderService.getOrderWithItems(orderId);

        if (!orderData) {
            await bot.sendMessage(chatId, t('orders.notFound'));
            return;
        }

        const { order, items } = orderData;
        const payments = await paymentsRepo.getPaymentsByOrder(orderId);
        // Use order.comment instead of getting from comments repo

        // Build order details text
        let text = `📋 *ID: ${order.orderId.substring(0, 12)}*\n\n`;
        text += `${t('orders.client')}: ${order.clientName}\n`;
        text += `${t('orders.orderDate')}: ${formatDate(order.orderDate).split('T')[0]}\n`;
        text += `${t('orders.status')}: ${getStatusText(order.status)}\n\n`;

        // Items
        text += `*${t('orders.items')}:*\n`;
        items.forEach((item, index) => {
            text += `${index + 1}. ${item.productName} x${item.qty} = ${formatCurrency(item.subtotal)}\n`;
        });

        // Totals
        text += `\n*${t('orders.total')}:*\n`;
        text += `${t('orders.itemsTotal')}: ${formatCurrency(order.itemsTotal)}\n`;
        if (order.discount.type !== 'NONE') {
            text += `${t('orders.discount')}: -${formatCurrency(order.discountAmount)}\n`;
        }
        text += `${t('orders.orderTotal')}: ${formatCurrency(order.orderTotal)}\n`;
        text += `${t('orders.paid')}: ${formatCurrency(order.totalPaid)}\n`;
        text += `${t('orders.balance')}: ${formatCurrency(order.balanceDue)}\n`;

        if (isOverpaid(order.orderTotal, order.totalPaid)) {
            const overpayment = getOverpaymentAmount(order.orderTotal, order.totalPaid);
            text += `\n⚠️ ${t('orders.overpaid')}: ${formatCurrency(overpayment)}\n`;
        }

        // Payments
        if (payments.length > 0) {
            text += `\n*${t('payments.title')} (${payments.length}):*\n`;
            payments.forEach((payment, index) => {
                text += `${index + 1}. ${formatCurrency(payment.amount)} - ${payment.method} (${formatDate(payment.paymentDate).split('T')[0]})\n`;
            });
        }

        // Comments
        if (order.comment) {
            text += `\n*${t('comments.title')}*\n${order.comment}\n`;
        }

        const buttons = [
            [
                { text: `💰 ${t('orders.addPayment')}`, callback_data: `payment:add:${orderId}` },
                { text: `💬 ${t('comments.addComment')}`, callback_data: `comment:add:${orderId}` },
            ],
            [
                { text: `📝 ${t('common.edit')}`, callback_data: `order:edit:${orderId}` },
            ],
        ];

        if (order.status !== OrderStatus.CANCELLED) {
            buttons.push([
                { text: `❌ ${t('orders.cancelOrder')}`, callback_data: `order:cancel_confirm:${orderId}` },
            ]);
        }

        buttons.push(...backButton('menu:orders'));

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
    }

    // ==================== NEW ORDER ====================
    else if (data === 'order:new') {
        await bot.sendMessage(
            chatId,
            `➕ ${t('orders.newOrder')}:\n\n` +
            `${t('orders.selectClient')}...`, // Simplified
            {
                reply_markup: createInlineKeyboard([
                    [{ text: `👤 ${t('clients.searchClient')}`, callback_data: 'order:new:select_client' }],
                    [{ text: `➕ ${t('clients.addClient')}`, callback_data: 'order:new:add_client' }],
                    ...backButton('menu:orders'),
                ]),
            }
        );
    } else if (data === 'order:new:add_client') {
        const { setConversationState } = await import('../conversationState');
        setConversationState(Number(user.userId), {
            action: 'ADD_CLIENT',
            step: 'name',
            data: {}
        });

        await bot.sendMessage(
            chatId,
            `👤 *${t('clients.addClient')}*\n\n` +
            `1️⃣ ${t('clients.enterName')}:`,
            { parse_mode: 'Markdown' }
        );
    } else if (data === 'order:new:select_client') {
        const { setConversationState } = await import('../conversationState');
        const { clientsListKeyboard } = await import('../keyboards');
        const queryService = await import('../../services/query.service');

        const clients = await queryService.getAllClientsWithDebt();

        if (clients.length === 0) {
            await bot.sendMessage(
                chatId,
                `⚠️ ${t('clients.notFound')}`,
                {
                    reply_markup: createInlineKeyboard([
                        [{ text: `➕ ${t('clients.addClient')}`, callback_data: 'order:new:add_client' }],
                        ...backButton('order:new')
                    ])
                }
            );
            return;
        }

        setConversationState(Number(user.userId), {
            action: 'SEARCH_CLIENT',
            data: { context: 'new_order' }
        });

        await bot.sendMessage(
            chatId,
            `🔍 *${t('orders.selectClient')}*\n\n` +
            `${t('search.enterQuery')}:`,
            {
                parse_mode: 'Markdown',
                reply_markup: clientsListKeyboard(clients, 0, 10, 'order:new:selected', 'order:new:client_list:page')
            }
        );
    } else if (data.startsWith('order:new:client_list:page:')) {
        const page = parseInt(data.split(':')[4], 10);
        const queryService = await import('../../services/query.service');
        const { clientsListKeyboard } = await import('../keyboards');

        const clients = await queryService.getAllClientsWithDebt();

        await bot.editMessageReplyMarkup(
            clientsListKeyboard(clients, page, 10, 'order:new:selected', 'order:new:client_list:page'),
            {
                chat_id: chatId,
                message_id: messageId
            }
        );
    } else if (data.startsWith('order:new:selected:')) {
        const clientId = data.split(':')[3];
        // Start order creation with this client
        const clientsRepo = await import('../../sheets/clients.repository');
        const client = await clientsRepo.getClientById(clientId);

        if (!client) {
            await bot.sendMessage(chatId, t('clients.notFound'));
            return;
        }

        const { setConversationState } = await import('../conversationState');
        setConversationState(Number(user.userId), {
            action: 'ADD_ORDER',
            step: 'select_product', // Now implies manual entry
            data: { clientId, clientName: client.name, items: [] }
        });

        await bot.sendMessage(
            chatId,
            `✅ ${t('orders.client')}: *${client.name}*\n\n` +
            `📦 1. ${t('products.productName')}:`,
            {
                parse_mode: 'Markdown',
            }
        );

    } else if (data === 'order:finish') {
        // Ask for discount
        const buttons = [
            [
                { text: '0', callback_data: 'order:create:discount:0' },
                { text: '5%', callback_data: 'order:create:discount:5' },
                { text: '10%', callback_data: 'order:create:discount:10' },
            ],
            [
                { text: '15%', callback_data: 'order:create:discount:15' },
                { text: '20%', callback_data: 'order:create:discount:20' },
                { text: '30%', callback_data: 'order:create:discount:30' },
            ],
            [
                { text: '✍️ Manual', callback_data: 'order:create:discount:manual' }
            ]
        ];

        await bot.sendMessage(
            chatId,
            `🏷️ Chegirma / Скидка:`,
            {
                reply_markup: createInlineKeyboard(buttons),
            }
        );
    } else if (data.startsWith('order:create:discount:')) {
        const discountType = data.split(':')[3];

        if (discountType === 'manual') {
            const { getConversationState, setConversationState } = await import('../conversationState');
            const state = getConversationState(Number(user.userId));

            if (state && state.action === 'ADD_ORDER') {
                state.step = 'discount_manual';
                setConversationState(Number(user.userId), state);

                await bot.sendMessage(chatId, `🏷️ Chegirma miqdorini kiriting:\n\nFormat:\n• % foiz uchun: 10%\n• Summa uchun: 10000`, { reply_markup: { force_reply: true } });
            } else {
                await bot.sendMessage(chatId, `❌ Session expired. Please start over.`);
            }
            return;
        }

        const discountValue = parseInt(discountType, 10);
        const { getConversationState, clearConversationState } = await import('../conversationState');
        const state = getConversationState(Number(user.userId));

        if (!state || state.action !== 'ADD_ORDER' || !state.data.items || state.data.items.length === 0) {
            await bot.sendMessage(chatId, `❌ ${t('errors.invalidInput')}`);
            return;
        }

        // Create Order
        try {
            const { createOrder } = await import('../../services/order.service');
            const result = await createOrder(
                state.data.clientId,
                new Date(),
                state.data.items.map((i: any) => ({
                    productId: i.productId,
                    qty: i.qty,
                    unitPrice: i.unitPrice
                })),
                {
                    type: discountValue > 0 ? DiscountType.PERCENT : DiscountType.NONE,
                    value: discountValue
                },
                user.username || user.userId
            );

            await bot.sendMessage(
                chatId,
                `✅ *${t('orders.saved')}*\n\n` +
                `🆔 ID: *${result.order.orderId}*\n` +
                `👤 ${t('orders.client')}: *${state.data.clientName || 'Mijoz'}*\n` +
                `📦 ${t('orders.items')}: ${result.items.length} ${t('pagination.items')}\n` +
                `💰 *${t('orders.orderTotal')}: ${formatCurrency(result.order.orderTotal)}*\n` +
                (discountValue > 0 ? `🏷️ ${t('orders.discount')}: ${discountValue}%\n\n` : '\n') +
                `${t('orders.status')}: 🔴 ${t('orders.statusOpen')}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: createInlineKeyboard([
                        [{ text: `💸 ${t('orders.addPayment')}`, callback_data: `order:pay_now:${result.order.orderId}` }],
                        [{ text: `🏠 ${t('common.mainMenu')}`, callback_data: 'menu:main' }, { text: `📋 ${t('orders.title')}`, callback_data: 'menu:orders' }]
                    ])
                }
            );
            clearConversationState(Number(user.userId));
        } catch (err: any) {
            console.error(err);
            await bot.sendMessage(chatId, `❌ ${t('common.error')}: ${err.message}`);
        }
    } else if (data.startsWith('order:pay_now:')) {
        const orderId = data.split(':')[2];
        const { handlePaymentsMenu } = await import('./payments.handler');
        // Redirect to payment handler with 'payment:add:<orderId>'
        await handlePaymentsMenu(chatId, `payment:add:${orderId}`, messageId, user);
    }

    // ==================== ADD COMMENT ====================
    else if (data.startsWith('comment:add:')) {
        const orderId = data.split(':')[2];
        const { setConversationState } = await import('../conversationState');

        setConversationState(Number(user.userId), {
            action: 'ADD_COMMENT',
            data: { orderId }
        });

        await bot.sendMessage(chatId, `💬 ${t('comments.enterComment')}:`, { reply_markup: { force_reply: true } });
    }

    // ==================== EDIT ORDER MENU ====================
    else if (data.startsWith('order:edit:') && !data.includes('products') && !data.includes('payments') && !data.includes('item')) {
        const orderId = data.split(':')[2];

        const buttons = [
            [{ text: `📦 ${t('orders.editOrder')}`, callback_data: `o:e:p:${orderId}` }], // Reusing edit order listing text? No, customized. "Edit items"
            [{ text: `💰 ${t('payments.editPayment')}`, callback_data: `o:e:pay:${orderId}` }], // "Edit payments"
            ...backButton(`order:view:${orderId}`)
        ];

        await bot.editMessageText(`📝 ${t('common.edit')}:`, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: createInlineKeyboard(buttons)
        });
    }

    // ==================== EDIT ORDER PRODUCTS LIST ====================
    else if (data.startsWith('o:e:p:')) {
        const orderId = data.split(':')[3];
        const { getOrderWithItems } = await import('../../services/order.service');
        const orderData = await getOrderWithItems(orderId);

        if (!orderData) {
            await bot.sendMessage(chatId, t('orders.notFound'));
            return;
        }

        const buttons: any[][] = orderData.items.map(item => [{
            text: `${item.productName} (x${item.qty})`,
            callback_data: `o:e:is:${orderId}:${item.orderItemId}`
        }]);

        buttons.push(...backButton(`order:edit:${orderId}`));

        await bot.editMessageText(`📦 ${t('common.select')}:`, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: createInlineKeyboard(buttons)
        });
    }

    // ==================== EDIT ORDER ITEM OPTIONS ====================
    else if (data.startsWith('o:e:is:')) {
        const parts = data.split(':');
        const orderId = parts[3];
        const itemId = parts[4];

        const buttons = [
            [{ text: `✏️ ${t('common.edit')}`, callback_data: `o:e:iq:${orderId}:${itemId}` }],
            [{ text: `🗑 ${t('common.delete')}`, callback_data: `o:e:idc:${orderId}:${itemId}` }],
            ...backButton(`o:e:p:${orderId}`)
        ];

        await bot.editMessageText(`⚡️ ${t('common.select')}:`, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: createInlineKeyboard(buttons)
        });
    }

    // ==================== EDIT ITEM QTY START ====================
    else if (data.startsWith('o:e:iq:')) {
        const parts = data.split(':');
        const orderId = parts[3];
        const itemId = parts[4];
        const { setConversationState } = await import('../conversationState');

        setConversationState(Number(user.userId), {
            action: 'EDIT_ORDER_ITEM_QTY',
            data: { orderId, itemId }
        });

        await bot.sendMessage(chatId, `🔢 ${t('orders.enterQty')}:`, { reply_markup: { force_reply: true } });
    }

    // ==================== EDIT ITEM DELETE CONFIRM ====================
    else if (data.startsWith('o:e:idc:')) {
        const parts = data.split(':');
        const orderId = parts[3];
        const itemId = parts[4];
        const { yesNoKeyboard } = await import('../keyboards');

        await bot.editMessageText(`❓ ${t('products.confirmDelete')}`, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: yesNoKeyboard(
                `o:e:id:${orderId}:${itemId}`,
                `o:e:is:${orderId}:${itemId}`
            )
        });
    }

    // ==================== EDIT ITEM DELETE ====================
    else if (data.startsWith('o:e:id:')) {
        const parts = data.split(':');
        const orderId = parts[3];
        const itemId = parts[4];
        const { deleteOrderItem } = await import('../../services/order.service');

        try {
            await deleteOrderItem(orderId, itemId);
            await bot.sendMessage(chatId, `✅ ${t('common.deleted')}`);
            // Go back to product list
            await handleOrdersMenu(chatId, `o:e:p:${orderId}`, undefined, user);
        } catch (error: any) {
            await bot.sendMessage(chatId, `❌ ${t('common.error')}: ${error.message}`);
        }
    }

    // ==================== EDIT ORDER PAYMENTS LIST ====================
    else if (data.startsWith('o:e:pay:')) {
        const orderId = data.split(':')[3];
        const { handlePaymentsMenu } = await import('./payments.handler');
        await handlePaymentsMenu(chatId, `payments:order_list:${orderId}`, messageId, user);
    }

    // ==================== CANCEL ORDER CONFIRM ====================
    else if (data.startsWith('order:cancel_confirm:')) {
        const orderId = data.split(':')[2];
        const { yesNoKeyboard } = await import('../keyboards');

        await bot.sendMessage(
            chatId,
            `❓ ${t('orders.confirmCancel')}`,
            {
                reply_markup: yesNoKeyboard(`order:cancel:${orderId}`, `order:view:${orderId}`)
            }
        );
    }

    // ==================== CANCEL ORDER ACTION ====================
    else if (data.startsWith('order:cancel:')) {
        const orderId = data.split(':')[2];

        try {
            await orderService.cancelOrder(orderId, user.username || user.userId);
            await bot.sendMessage(chatId, `✅ ${t('orders.cancelled')}`);
            // Redirect to order view (which will show status cancelled)
            await handleOrdersMenu(chatId, `order:view:${orderId}`, undefined, user);
        } catch (error: any) {
            await bot.sendMessage(chatId, `❌ ${t('common.error')}: ${error.message}`);
        }
    }
}

function getStatusText(status: OrderStatus): string {
    switch (status) {
        case OrderStatus.OPEN:
            return '📋 ' + t('orders.statusOpen');
        case OrderStatus.COMPLETED:
            return '✅ ' + t('orders.statusCompleted');
        case OrderStatus.CANCELLED:
            return '❌ ' + t('orders.statusCancelled');
        default:
            return status;
    }
}

function getSortLabel(sortType: string): string {
    switch (sortType) {
        case 'newest_updated':
            return t('orders.sortNewest');
        case 'largest_balance':
            return t('orders.sortLargestBalance');
        case 'by_date':
            return t('orders.sortByDate');
        default:
            return sortType;
    }
}
