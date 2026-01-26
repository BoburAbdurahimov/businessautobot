import TelegramBot from 'node-telegram-bot-api';
import { t } from '../i18n';
import { Client, Order } from '../domain/types';

export interface InlineButton {
    text: string;
    callback_data: string;
}

/**
 * Create inline keyboard from buttons
 */
export function createInlineKeyboard(buttons: InlineButton[][], options?: any): TelegramBot.InlineKeyboardMarkup {
    return {
        inline_keyboard: buttons.map(row =>
            row.map(btn => ({
                text: btn.text,
                callback_data: btn.callback_data,
            }))
        ),
        ...options,
    };
}

/**
 * Main menu keyboard
 */
export function mainMenuKeyboard(isAdmin: boolean): TelegramBot.InlineKeyboardMarkup {
    const buttons: InlineButton[][] = [
        [
            { text: t('menu.orders'), callback_data: 'menu:orders' },
        ],
        [
            { text: t('menu.clients'), callback_data: 'menu:clients' },
            { text: t('menu.payments'), callback_data: 'menu:payments' },
        ],
    ];

    if (isAdmin) {
        buttons.push([
            // { text: t('menu.users'), callback_data: 'menu:users' },
            { text: t('menu.settings'), callback_data: 'menu:settings' },
        ]);
    }

    buttons.push([{ text: t('menu.reports'), callback_data: 'menu:reports' }]);

    return createInlineKeyboard(buttons);
}

/**
 * Back button
 */
export function backButton(callbackData: string = 'menu:main'): InlineButton[][] {
    return [[{ text: t('common.back'), callback_data: callbackData }]];
}

/**
 * Confirm/Cancel buttons
 */
export function confirmCancelButtons(confirmData: string, cancelData: string = 'cancel'): InlineButton[][] {
    return [
        [
            { text: t('common.confirm'), callback_data: confirmData },
            { text: t('common.cancel'), callback_data: cancelData },
        ],
    ];
}



/**
 * Clients list keyboard
 */
export function clientsListKeyboard(
    clientsWithDebt: { client: Client; totalDebt: number }[],
    page: number = 0,
    pageSize: number = 10,
    itemCallbackPrefix: string = 'client:view',
    paginationCallbackPrefix: string = 'clients:page'
): TelegramBot.InlineKeyboardMarkup {
    const start = page * pageSize;
    const end = start + pageSize;
    const pageClients = clientsWithDebt.slice(start, end);

    const buttons: InlineButton[][] = pageClients.map(item => {
        const { client, totalDebt } = item;
        const debtText = totalDebt > 0 ? ` (🔴 ${totalDebt.toLocaleString('uz-UZ')})` : '';
        return [
            {
                text: `${client.name}${debtText}`,
                callback_data: `${itemCallbackPrefix}:${client.clientId}`,
            },
        ];
    });

    // Pagination
    const paginationRow: InlineButton[] = [];
    if (page > 0) {
        paginationRow.push({ text: '◀️ Oldingi', callback_data: `${paginationCallbackPrefix}:${page - 1}` });
    }
    if (end < clientsWithDebt.length) {
        paginationRow.push({ text: 'Keyingi ▶️', callback_data: `${paginationCallbackPrefix}:${page + 1}` });
    }
    if (paginationRow.length > 0) {
        buttons.push(paginationRow);
    }

    if (itemCallbackPrefix === 'client:view') {
        // Only show Add/Search buttons in the standard menu mode, not in selection mode
        buttons.push([{ text: `➕ ${t('clients.addClient')}`, callback_data: 'client:add' }]);
        buttons.push([{ text: '🔍 ' + t('clients.searchClient'), callback_data: 'client:search' }]);
        buttons.push(...backButton());
    } else {
        // In selection mode, just show back
        buttons.push(...backButton('menu:orders'));
    }

    return createInlineKeyboard(buttons);
}

/**
 * Orders menu keyboard (enhanced with grouped views)
 */
export function ordersMenuKeyboard(isAdmin: boolean = false): TelegramBot.InlineKeyboardMarkup {
    const buttons: InlineButton[][] = [
        [{ text: `➕ ${t('orders.newOrder')}`, callback_data: 'order:new' }], [{ text: '🟡 ' + t('orders.openOrdersByClient'), callback_data: 'orders:open_by_client' }],
        [{ text: '🟡 ' + t('orders.openOrdersList'), callback_data: 'orders:open_list' }],
        [{ text: t('orders.allOrders'), callback_data: 'orders:all' }],
        [{ text: '✅ ' + t('orders.completedOrders'), callback_data: 'orders:completed' }],
    ];

    // Admin-only feature
    if (isAdmin) {
        buttons.push([{ text: t('orders.restoreCompleted'), callback_data: 'orders:restore' }]);
    }

    buttons.push(...backButton());

    return createInlineKeyboard(buttons);
}

/**
 * Orders list keyboard
 */
export function ordersListKeyboard(orders: Order[], page: number = 0, pageSize: number = 10): TelegramBot.InlineKeyboardMarkup {
    const start = page * pageSize;
    const end = start + pageSize;
    const pageOrders = orders.slice(start, end);

    const buttons: InlineButton[][] = pageOrders.map(order => {
        const statusEmoji = order.status === 'COMPLETED' ? '✅' : order.status === 'CANCELLED' ? '❌' : '📋';
        return [
            {
                text: `${statusEmoji} ${order.orderId.substring(0, 12)} - ${order.clientName} - ${order.orderTotal} so'm`,
                callback_data: `order:view:${order.orderId}`,
            },
        ];
    });

    // Pagination
    const paginationRow: InlineButton[] = [];
    if (page > 0) {
        paginationRow.push({ text: '◀️ Oldingi', callback_data: `orders:list:page:${page - 1}` });
    }
    if (end < orders.length) {
        paginationRow.push({ text: 'Keyingi ▶️', callback_data: `orders:list:page:${page + 1}` });
    }
    if (paginationRow.length > 0) {
        buttons.push(paginationRow);
    }

    buttons.push(...backButton('menu:orders'));

    return createInlineKeyboard(buttons);
}

/**
 * Yes/No keyboard
 */
export function yesNoKeyboard(yesData: string, noData: string): TelegramBot.InlineKeyboardMarkup {
    return createInlineKeyboard([
        [
            { text: t('common.yes'), callback_data: yesData },
            { text: t('common.no'), callback_data: noData },
        ],
    ]);
}

/**
 * Clients with open orders keyboard (grouped view)
 */
export function clientsWithOpenOrdersKeyboard(
    clients: Array<{
        client: { clientId: string; name: string };
        totalOpenBalance: number;
        orderCount: number;
    }>,
    page: number = 0,
    pageSize: number = 10
): TelegramBot.InlineKeyboardMarkup {
    const start = page * pageSize;
    const end = start + pageSize;
    const pageClients = clients.slice(start, end);

    const buttons: InlineButton[][] = pageClients.map(item => [
        {
            text: `${item.client.name} • ${item.orderCount} ta • ${item.totalOpenBalance.toLocaleString('uz-UZ')} so'm`,
            callback_data: `orders:client_open:${item.client.clientId}`,
        },
    ]);

    // Pagination
    const paginationRow: InlineButton[] = [];
    if (page > 0) {
        paginationRow.push({
            text: t('pagination.prev'),
            callback_data: `orders:open_by_client:page:${page - 1}`
        });
    }
    if (end < clients.length) {
        paginationRow.push({
            text: t('pagination.next'),
            callback_data: `orders:open_by_client:page:${page + 1}`
        });
    }
    if (paginationRow.length > 0) {
        buttons.push(paginationRow);
    }

    buttons.push(...backButton('menu:orders'));

    return createInlineKeyboard(buttons);
}

/**
 * Orders list with sorting toolbar
 */
export function ordersListSortingToolbar(currentSort: string = 'newest_updated'): InlineButton[][] {
    return [
        [{ text: '📊 ' + t('search.sortBy') + ':', callback_data: 'noop' }],
        [
            {
                text: (currentSort === 'newest_updated' ? '✓ ' : '') + t('orders.sortNewest'),
                callback_data: 'orders:open_list:sort:newest_updated'
            },
        ],
        [
            {
                text: (currentSort === 'largest_balance' ? '✓ ' : '') + t('orders.sortLargestBalance'),
                callback_data: 'orders:open_list:sort:largest_balance'
            },
        ],
        [
            {
                text: (currentSort === 'by_date' ? '✓ ' : '') + t('orders.sortByDate'),
                callback_data: 'orders:open_list:sort:by_date'
            },
        ],
    ];
}

/**
 * Payments list keyboard
 */
export function paymentsListKeyboard(payments: any[], page: number = 0, pageSize: number = 10): TelegramBot.InlineKeyboardMarkup {
    const start = page * pageSize;
    const end = start + pageSize;
    const pagePayments = payments.slice(start, end);

    const buttons: InlineButton[][] = pagePayments.map(payment => [
        {
            text: `${payment.amount.toLocaleString('uz-UZ')} so'm - ${payment.method} (${new Date(payment.paymentDate).toLocaleDateString()})`,
            callback_data: `payment:view:${payment.paymentId}`,
        },
    ]);

    // Pagination
    const paginationRow: InlineButton[] = [];
    if (page > 0) {
        paginationRow.push({ text: '◀️ Oldingi', callback_data: `payments:page:${page - 1}` });
    }
    if (end < payments.length) {
        paginationRow.push({ text: 'Keyingi ▶️', callback_data: `payments:page:${page + 1}` });
    }
    if (paginationRow.length > 0) {
        buttons.push(paginationRow);
    }

    buttons.push([{ text: `➕ To'lov qo'shish`, callback_data: 'payment:add' }]);
    buttons.push(...backButton());

    return createInlineKeyboard(buttons);
}

