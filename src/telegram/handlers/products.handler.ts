import { getBot } from '../bot';
import { User } from '../../domain/types';
import { t } from '../../i18n';
import { productsListKeyboard, backButton, createInlineKeyboard } from '../keyboards';
import * as productsRepo from '../../sheets/products.repository';
import { formatCurrency } from '../../utils/helpers';
import { setConversationState } from '../conversationState';

export async function handleProductsMenu(
    chatId: number,
    data: string,
    messageId: number | undefined,
    _user: User
): Promise<void> {
    const bot = getBot();

    if (data === 'menu:products') {
        // Show products list
        const products = await productsRepo.getAllProducts(true);

        const text = `📦 *${t('products.title')}*\n\n${t('common.total')}: ${products.length} ${t('pagination.items')}`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: productsListKeyboard(products),
            });
        } else {
            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: productsListKeyboard(products),
            });
        }
    } else if (data.startsWith('product:view:')) {
        // View specific product
        const productId = data.split(':')[2];
        const product = await productsRepo.getProductById(productId);

        if (!product) {
            await bot.sendMessage(chatId, t('products.notFound'));
            return;
        }

        const lowStockThreshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '10', 10);
        const lowStockWarning = product.stockQty < lowStockThreshold ? `\n⚠️ ${t('products.lowStock')}` : '';

        const text = `📦 *${product.name}*\n\n` +
            `${t('products.price')}: ${formatCurrency(product.defaultPrice)}\n` +
            `${t('products.stock')}: ${product.stockQty} ${t('pagination.items')}${lowStockWarning}\n` +
            `${t('orders.status')}: ${product.active ? t('products.active') : t('products.inactive')}`;

        const buttons = [
            [
                { text: '📝 ' + t('common.edit'), callback_data: `product:edit:${productId}` },
                { text: '📊 ' + t('products.stock'), callback_data: `product:adjust_stock:${productId}` },
            ],
            [
                { text: '🗑 ' + t('common.delete'), callback_data: `product:delete:${productId}` },
            ],
            ...backButton('menu:products'),
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
    } else if (data.startsWith('product:adjust_stock:')) {
        const productId = data.split(':')[2];
        setConversationState(Number(_user.userId), {
            action: 'EDIT_PRODUCT_STOCK',
            data: { productId }
        });
        await bot.sendMessage(chatId, '📊 ' + t('products.enterStock'), { reply_markup: { force_reply: true } });
    } else if (data.startsWith('products:page:')) {
        // Pagination
        const page = parseInt(data.split(':')[2], 10);
        const products = await productsRepo.getAllProducts(true);

        const text = `📦 *${t('products.title')}*\n\n${t('common.total')}: ${products.length} ${t('pagination.items')}`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: productsListKeyboard(products, page),
            });
        }
    } else if (data === 'product:add') {
        // Start step-by-step product creation
        setConversationState(Number(_user.userId), {
            action: 'ADD_PRODUCT',
            step: 'name',
            data: {}
        });

        await bot.sendMessage(
            chatId,
            '📦 *' + t('products.addProduct') + '*\n\n' +
            '1️⃣ ' + t('products.enterName') + ':',
            { parse_mode: 'Markdown' }
        );
    } else if (data.startsWith('product:edit:')) {
        const productId = data.split(':')[2];
        const { getProductById } = await import('../../sheets/products.repository');
        const product = await getProductById(productId);

        if (!product) {
            await bot.sendMessage(chatId, t('products.notFound'));
            return;
        }

        if (data.includes(':name')) {
            setConversationState(Number(_user.userId), {
                action: 'EDIT_PRODUCT_NAME',
                data: { productId }
            });
            await bot.sendMessage(chatId, `📝 ${t('products.enterName')}:`, { reply_markup: { force_reply: true } });
        } else if (data.includes(':price')) {
            setConversationState(Number(_user.userId), {
                action: 'EDIT_PRODUCT_PRICE',
                data: { productId }
            });
            await bot.sendMessage(chatId, `💰 ${t('products.enterPrice')}:`, { reply_markup: { force_reply: true } });
        } else {
            // Main Edit Menu
            const buttons = [
                [{ text: `📝 ${t('products.productName')}`, callback_data: `product:edit:${productId}:name` }],
                [{ text: `💰 ${t('products.price')}`, callback_data: `product:edit:${productId}:price` }],
                [{ text: `📊 ${t('products.stock')}`, callback_data: `product:adjust_stock:${productId}` }],
                ...backButton(`product:view:${productId}`)
            ];

            await bot.editMessageText(`📝 *${product.name}* - ${t('common.edit')}:`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard(buttons)
            });
        }
    }
}
