
import { getBot } from '../bot';
import { User } from '../../domain/types';
import { t } from '../../i18n';
import { createInlineKeyboard, backButton } from '../keyboards';

export async function handleReportsMenu(
    chatId: number,
    data: string,
    messageId: number | undefined,
    _user: User
): Promise<void> {
    const bot = getBot();

    if (data === 'menu:reports') {
        const text = `📊 *${t('menu.reports')}*\n\n${t('common.select')}:`;

        const buttons = [
            [{ text: '📈 ' + t('reports.salesReport'), callback_data: 'reports:sales' }],
            [{ text: '📉 ' + t('reports.inventoryReport'), callback_data: 'reports:inventory' }],
            [{ text: '💰 ' + t('orders.totalDebt'), callback_data: 'reports:debt' }],
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
    } else if (data === 'reports:sales') {
        // Simple daily stats for now
        const { getAllOrders } = await import('../../sheets/orders.repository');
        const orders = await getAllOrders();

        const today = new Date();
        const todayOrders = orders.filter(o =>
            new Date(o.orderDate).toDateString() === today.toDateString()
        );

        const totalSales = todayOrders.reduce((sum, o) => sum + o.orderTotal, 0);
        const totalPaid = todayOrders.reduce((sum, o) => sum + o.totalPaid, 0);

        const text = `📈 *${t('reports.salesReport')} (${t('common.today')})*\n\n` +
            `📅 ${t('common.date')}: ${today.toLocaleDateString()}\n` +
            `📝 ${t('orders.title')}: ${todayOrders.length}\n` +
            `💵 ${t('reports.sales')}: ${totalSales.toLocaleString()} so'm\n` +
            `💰 ${t('reports.revenue')}: ${totalPaid.toLocaleString()} so'm`;

        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

    } else if (data === 'reports:inventory') {
        const { getAllProducts } = await import('../../sheets/products.repository');
        const products = await getAllProducts(true);

        const lowStock = products.filter(p => p.stockQty < 10);
        const totalValue = products.reduce((sum, p) => sum + (p.stockQty * p.defaultPrice), 0);

        const text = `📉 *${t('reports.inventoryReport')}*\n\n` +
            `📦 ${t('products.title')}: ${products.length} ${t('pagination.items')}\n` +
            `💰 ${t('reports.totalValue')}: ${totalValue.toLocaleString()} so'm\n` +
            `⚠️ ${t('products.lowStock')} (<10): ${lowStock.length}`;

        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });

    } else if (data === 'reports:debt') {
        const { getAllOrders } = await import('../../sheets/orders.repository');
        // This is inefficient (getting all orders), but fine for MVP.
        const orders = await getAllOrders();
        const openOrders = orders.filter(o => o.balanceDue > 0 && o.status !== 'CANCELLED');

        const totalDebt = openOrders.reduce((sum, o) => sum + o.balanceDue, 0);
        const uniqueDebtors = new Set(openOrders.map(o => o.clientId)).size;

        const text = `💰 *${t('orders.totalDebt')}*\n\n` +
            `💸 ${t('orders.totalDebt')}: ${totalDebt.toLocaleString()} so'm\n` +
            `👥 ${t('reports.debtors')}: ${uniqueDebtors} ta\n` +
            `📝 ${t('reports.unpaidOrders')}: ${openOrders.length} ta`;

        await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    }
}
