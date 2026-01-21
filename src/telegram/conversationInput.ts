import { getBot } from './bot';
import { User } from '../domain/types';
import { getConversationState, clearConversationState } from './conversationState';
import { t } from '../i18n';

/**
 * Handle text input based on conversation state
 */
export async function handleConversationInput(
    chatId: number,
    text: string,
    user: User
): Promise<boolean> {
    const state = getConversationState(Number(user.userId));

    if (!state || !state.action) {
        return false; // No active conversation
    }

    const bot = getBot();

    try {
        if (state.action === 'ADD_CLIENT') {
            // Step-by-step client creation
            const currentStep = state.step || 'name';
            const clientData = state.data || {};
            // Dynamic import
            const clientsRepo = await import('../sheets/clients.repository');

            if (currentStep === 'name') {
                // Step 1: Collect Name
                clientData.name = text.trim();

                if (!clientData.name) {
                    await bot.sendMessage(chatId, `❌ ${t('errors.inputRequired')}`);
                    return true;
                }

                state.step = 'phone';
                state.data = clientData;

                await bot.sendMessage(
                    chatId,
                    `✅ ${t('clients.name')}: ${clientData.name}\n\n` +
                    `2️⃣ ${t('clients.enterPhone')}:\n\n` +
                    `💡 +998901234567\n` +
                    '(0 - skip)'
                );
                return true;
            } else if (currentStep === 'phone') {
                // Step 2: Collect Phone
                const phone = text.trim();
                clientData.phone = (phone === '0' || phone === '') ? undefined : phone;

                state.step = 'address';
                state.data = clientData;

                await bot.sendMessage(
                    chatId,
                    `✅ ${t('clients.phone')}: ${clientData.phone || '-'}\n\n` +
                    `3️⃣ ${t('clients.enterAddress')}:\n\n` +
                    `💡 Toshkent\n` +
                    '(0 - skip)'
                );
                return true;
            } else if (currentStep === 'address') {
                // Step 3: Collect Address and Create Client
                const address = text.trim();
                clientData.address = (address === '0' || address === '') ? undefined : address;

                // Create the client
                await clientsRepo.createClient(
                    clientData.name,
                    clientData.phone,
                    clientData.address
                );

                await bot.sendMessage(
                    chatId,
                    `🎉 *${t('clients.saved')}*\n\n` +
                    `👤 ${t('clients.name')}: ${clientData.name}\n` +
                    `${clientData.phone ? `📱 ${t('clients.phone')}: ${clientData.phone}\n` : ''}` +
                    `${clientData.address ? `📍 ${t('clients.address')}: ${clientData.address}` : ''}`,
                    { parse_mode: 'Markdown' }
                );

                // Show main menu
                const { mainMenuKeyboard } = await import('./keyboards');
                const { isAdmin } = await import('./bot');
                await bot.sendMessage(chatId, `🏠 ${t('common.mainMenu')}:`, {
                    reply_markup: mainMenuKeyboard(isAdmin(user))
                });

                clearConversationState(Number(user.userId));
                return true;
            }
        } else if (state.action === 'ADD_PRODUCT') {
            // Step-by-step product creation
            const currentStep = state.step || 'name';
            const productData = state.data || {};

            if (currentStep === 'name') {
                // Step 1: Collect Name
                productData.name = text.trim();
                state.step = 'price';
                state.data = productData;

                await bot.sendMessage(
                    chatId,
                    `✅ ${t('products.name')}: ${productData.name}\n\n` +
                    `2️⃣ ${t('products.enterPrice')}:\n\n` +
                    '💡 15000'
                );
                return true;
            } else if (currentStep === 'price') {
                // Step 2: Collect Price
                const price = parseFloat(text.trim());
                if (isNaN(price) || price <= 0) {
                    await bot.sendMessage(chatId, `❌ ${t('errors.invalidPrice')}`);
                    return true;
                }

                productData.defaultPrice = price;
                state.step = 'stock';
                state.data = productData;

                await bot.sendMessage(
                    chatId,
                    `✅ ${t('products.price')}: ${price.toLocaleString()} so'm\n\n` +
                    `3️⃣ ${t('products.enterStock')}:\n\n` +
                    '💡 100'
                );
                return true;
            } else if (currentStep === 'stock') {
                // Step 3: Collect Stock and Create Product
                const stock = parseInt(text.trim(), 10);
                if (isNaN(stock) || stock < 0) {
                    await bot.sendMessage(chatId, `❌ ${t('errors.invalidInput')}`);
                    return true;
                }

                productData.stockQty = stock;

                // Create the product
                const productsRepo = await import('../sheets/products.repository');
                await productsRepo.createProduct(
                    productData.name,
                    productData.defaultPrice,
                    productData.stockQty
                );

                await bot.sendMessage(
                    chatId,
                    `🎉 *${t('products.saved')}*\n\n` +
                    `📝 ${t('products.name')}: ${productData.name}\n` +
                    `💰 ${t('products.price')}: ${productData.defaultPrice.toLocaleString()} so'm\n` +
                    `📊 ${t('products.stock')}: ${productData.stockQty} ${t('pagination.items')}`,
                    { parse_mode: 'Markdown' }
                );

                // Show main menu
                const { mainMenuKeyboard } = await import('./keyboards');
                const { isAdmin } = await import('./bot');
                await bot.sendMessage(chatId, `🏠 ${t('common.mainMenu')}:`, {
                    reply_markup: mainMenuKeyboard(isAdmin(user))
                });

                clearConversationState(Number(user.userId));
                return true;
            }
        } else if (state.action === 'ADD_PAYMENT') {
            // Step-by-step payment creation
            const currentStep = state.step || 'amount';
            const paymentData = state.data || {};

            if (currentStep === 'amount') {
                // Step 1: Collect Amount
                const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
                if (isNaN(amount) || amount <= 0) {
                    await bot.sendMessage(chatId, `❌ ${t('errors.invalidPrice')}`);
                    return true;
                }

                paymentData.amount = amount;
                state.step = 'method';
                state.data = paymentData;

                const replyMarkup = {
                    keyboard: [
                        [{ text: t('payments.cash') }, { text: t('payments.card') }],
                        [{ text: t('payments.transfer') }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                };

                await bot.sendMessage(
                    chatId,
                    `✅ ${t('payments.amount')}: ${amount.toLocaleString()} so'm\n\n` +
                    `2️⃣ ${t('common.select')}:`,
                    { reply_markup: replyMarkup }
                );
                return true;
                return true;
            } else if (currentStep === 'method') {
                // Step 2: Collect Method
                const methodInput = text.toLowerCase().trim();
                let method;

                if (methodInput.includes(t('payments.cash').toLowerCase()) || methodInput.includes('naqd')) method = 'CASH';
                else if (methodInput.includes(t('payments.card').toLowerCase()) || methodInput.includes('karta')) method = 'CARD';
                else if (methodInput.includes(t('payments.transfer').toLowerCase()) || methodInput.includes('otkazma')) method = 'TRANSFER';

                if (!method) {
                    await bot.sendMessage(chatId, `❌ ${t('errors.invalidInput')}`);
                    return true;
                }

                // Create payment
                const paymentService = await import('../services/payment.service');
                const ordersRepo = await import('../sheets/orders.repository');
                const { PaymentMethod, OrderStatus } = await import('../domain/types');

                // Map string method to enum
                const methodEnum =
                    paymentData.method === 'CASH' ? PaymentMethod.CASH :
                        paymentData.method === 'CARD' ? PaymentMethod.CARD : PaymentMethod.TRANSFER;

                await paymentService.createPayment(
                    paymentData.orderId || '',
                    paymentData.amount,
                    new Date(),
                    methodEnum,
                    user.username || user.userId
                );

                // Update Order if linked
                let balanceText = '';
                if (paymentData.orderId) {
                    // Fetch updated order to get recalculated balance
                    const order = await ordersRepo.getOrderById(paymentData.orderId);
                    if (order) {
                        balanceText = `\n📉 ${t('orders.balance')}: ${order.balanceDue <= 0 ? '0' : order.balanceDue.toLocaleString()} so'm`;
                        if (order.status === OrderStatus.COMPLETED) {
                            balanceText += `\n✅ ${t('orders.statusCompleted')}!`;
                        }
                    }
                }

                await bot.sendMessage(
                    chatId,
                    `🎉 *${t('payments.saved')}*\n\n` +
                    `💸 ${t('payments.amount')}: ${paymentData.amount.toLocaleString()} so'm\n` +
                    `💳 ${t('payments.method')}: ${methodInput}\n` +
                    balanceText,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: { remove_keyboard: true }
                    }
                );

                // Redirect logic
                if (paymentData.orderId) {
                    const { handleOrdersMenu } = await import('./handlers/orders.handler');
                    await handleOrdersMenu(chatId, `order:view:${paymentData.orderId}`, undefined, user);
                } else {
                    // Show main menu
                    const { mainMenuKeyboard } = await import('./keyboards');
                    const { isAdmin } = await import('./bot');
                    await bot.sendMessage(chatId, `🏠 ${t('common.mainMenu')}:`, {
                        reply_markup: mainMenuKeyboard(isAdmin(user))
                    });
                }

                clearConversationState(Number(user.userId));
                return true;
            }
        } else if (state.action === 'ADD_ORDER') {
            // Order creation flow
            const currentStep = state.step || 'select_product';

            if (currentStep === 'select_product') {
                // Search for product
                const productsRepo = await import('../sheets/products.repository');
                const { productsListKeyboard } = await import('./keyboards');

                const products = await productsRepo.searchProducts(text);

                // Filter out already selected products
                const existingItemIds = state.data.items?.map((i: any) => i.productId) || [];
                const availableProducts = products.filter((p: any) => !existingItemIds.includes(p.productId));

                if (availableProducts.length === 0) {
                    if (products.length > 0) {
                        await bot.sendMessage(chatId, `⚠️ ${t('errors.invalidInput')}`);
                    } else {
                        await bot.sendMessage(chatId, `❌ ${t('products.notFound')}`);
                    }
                    return true;
                }

                await bot.sendMessage(
                    chatId,
                    `🔍 ${t('search.results')} (${availableProducts.length}):`,
                    {
                        reply_markup: productsListKeyboard(availableProducts, 0, 10, 'order:product:selected', 'order:product:list:page')
                    }
                );
                return true;
            } else if (currentStep === 'quantity') {
                // Quantity input
                const qty = parseFloat(text.replace(/[^0-9.]/g, ''));
                const product = state.data.currentProduct;

                if (isNaN(qty) || qty <= 0) {
                    await bot.sendMessage(chatId, `❌ ${t('errors.invalidQty')}`);
                    return true;
                }

                if (qty > product.stockQty) {
                    await bot.sendMessage(chatId, `❌ ${t('products.lowStock')} (Max: ${product.stockQty})`);
                    return true;
                }

                // Add item
                state.data.items.push({
                    productId: product.productId,
                    productName: product.name,
                    qty: qty,
                    unitPrice: product.defaultPrice,
                    subtotal: qty * product.defaultPrice
                });

                // Clear current product
                delete state.data.currentProduct;

                // Go back to select product
                state.step = 'select_product';

                const itemsCount = state.data.items.length;
                const totalSum = state.data.items.reduce((acc: number, item: any) => acc + item.subtotal, 0);

                const productsRepo = await import('../sheets/products.repository');
                const { productsListKeyboard } = await import('./keyboards');
                const products = await productsRepo.getAllProducts();

                const existingItemIds = state.data.items?.map((i: any) => i.productId) || [];
                const availableProducts = products.filter((p: any) => !existingItemIds.includes(p.productId));

                const extraButtons = [[{ text: `✅ ${t('orders.confirmOrder')} (${itemsCount} ta - ${totalSum.toLocaleString()})`, callback_data: 'order:finish' }]];

                await bot.sendMessage(
                    chatId,
                    `✅ *${t('common.saved')}*\n\n` +
                    `📦 *${product.name}*\n` +
                    `🔢 ${t('orders.qty')}: ${qty}\n` +
                    `💰 ${t('products.price')}: ${product.defaultPrice.toLocaleString()} so'm\n` +
                    `💰 ${t('orders.itemsTotal')}: ${(qty * product.defaultPrice).toLocaleString()} so'm\n\n` +
                    `🛒 *${t('orders.items')}:* ${itemsCount}\n` +
                    `💳 *${t('orders.orderTotal')}:* ${totalSum.toLocaleString()} so'm\n\n` +
                    `👇 ${t('common.select')}:`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: productsListKeyboard(availableProducts, 0, 10, 'order:product:selected', 'order:product:list:page', extraButtons)
                    }
                );

                return true;
                return true;
            } else if (currentStep === 'discount_manual') {
                const discountInput = text.trim();
                let discountType, discountValue;

                const { DiscountType } = await import('../domain/types');
                const { createOrder } = await import('../services/order.service');
                const { createInlineKeyboard } = await import('./keyboards');
                const { formatCurrency } = await import('../utils/helpers');

                if (discountInput.includes('%')) {
                    discountType = DiscountType.PERCENT;
                    discountValue = parseFloat(discountInput.replace('%', ''));
                } else {
                    discountType = DiscountType.FIXED;
                    discountValue = parseFloat(discountInput.replace(/[^0-9.]/g, ''));
                }

                if (isNaN(discountValue) || discountValue < 0) {
                    await bot.sendMessage(chatId, `❌ ${t('errors.invalidInput')}`);
                    return true;
                }

                // Create Order
                try {
                    const result = await createOrder(
                        state.data.clientId,
                        new Date(),
                        state.data.items.map((i: any) => ({
                            productId: i.productId,
                            qty: i.qty,
                            unitPrice: i.unitPrice
                        })),
                        {
                            type: discountValue > 0 ? discountType : DiscountType.NONE,
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
                        (discountValue > 0 ? `🏷️ ${t('orders.discount')}: ${discountType === DiscountType.PERCENT ? discountValue + '%' : formatCurrency(discountValue)}\n\n` : '\n') +
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
                return true;
            }
        } else if (state.action === 'SEARCH_CLIENT') {
            // Search for clients by name or phone
            const clientsRepo = await import('../sheets/clients.repository');
            const { createInlineKeyboard } = await import('./keyboards');

            const clients = await clientsRepo.getAllClients(true);
            const searchTerm = text.toLowerCase();

            const results = clients.filter((c: any) =>
                c.name.toLowerCase().includes(searchTerm) ||
                (c.phone && c.phone.includes(searchTerm))
            );

            if (results.length === 0) {
                await bot.sendMessage(chatId, `❌ ${t('clients.notFound')}`);
            } else {
                const context = state.data?.context;
                const buttons = results.slice(0, 10).map((client: any) => [{
                    text: `${client.name}${client.phone ? ` (${client.phone})` : ''}`,
                    callback_data: context === 'new_order'
                        ? `order:new:selected:${client.clientId}`
                        : `client:view:${client.clientId}`
                }]);

                await bot.sendMessage(
                    chatId,
                    `🔍 ${t('search.results')} (${results.length}):`,
                    { reply_markup: createInlineKeyboard(buttons) }
                );
            }

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'ADD_COMMENT') {
            // Add comment to order
            const orderId = state.data.orderId;
            const commentText = text.trim();

            if (!commentText) {
                await bot.sendMessage(chatId, `❌ ${t('errors.inputRequired')}`);
                return true;
            }

            const { updateOrder } = await import('../sheets/orders.repository');
            await updateOrder(orderId, { comment: commentText });

            await bot.sendMessage(chatId, `✅ ${t('comments.saved')}`);

            // Redirect back to order
            const { handleOrdersMenu } = await import('./handlers/orders.handler');
            await handleOrdersMenu(chatId, `order:view:${orderId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_ORDER_ITEM_QTY') {
            const { orderId, itemId } = state.data;
            const qty = parseFloat(text.trim());

            if (isNaN(qty) || qty <= 0) {
                await bot.sendMessage(chatId, `❌ ${t('errors.invalidQty')}`);
                return true;
            }

            const { updateOrderItemQty } = await import('../services/order.service');
            await updateOrderItemQty(orderId, itemId, qty);

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            // Redirect back to edit products
            const { handleOrdersMenu } = await import('./handlers/orders.handler');
            await handleOrdersMenu(chatId, `o:e:p:${orderId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_PAYMENT_AMOUNT') {
            const { paymentId } = state.data;
            const amount = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (isNaN(amount) || amount <= 0) {
                await bot.sendMessage(chatId, `❌ ${t('errors.invalidPrice')}`);
                return true;
            }

            const paymentService = await import('../services/payment.service');
            await paymentService.updatePayment(paymentId, { amount }, user.username || user.userId);

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            // Redirect back to payment view
            const { handlePaymentsMenu } = await import('./handlers/payments.handler');
            await handlePaymentsMenu(chatId, `payment:view:${paymentId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_CLIENT_NAME') {
            const { clientId } = state.data;
            const name = text.trim();

            const clientsRepo = await import('../sheets/clients.repository');
            await clientsRepo.updateClient(clientId, { name });

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            const { handleClientsMenu } = await import('./handlers/clients.handler');
            await handleClientsMenu(chatId, `client:view:${clientId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_CLIENT_PHONE') {
            const { clientId } = state.data;
            const phone = text.trim();

            const clientsRepo = await import('../sheets/clients.repository');
            await clientsRepo.updateClient(clientId, { phone });

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            const { handleClientsMenu } = await import('./handlers/clients.handler');
            await handleClientsMenu(chatId, `client:view:${clientId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_CLIENT_ADDRESS') {
            const { clientId } = state.data;
            const address = text.trim();

            const clientsRepo = await import('../sheets/clients.repository');
            await clientsRepo.updateClient(clientId, { address });

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            const { handleClientsMenu } = await import('./handlers/clients.handler');
            await handleClientsMenu(chatId, `client:view:${clientId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_PRODUCT_STOCK') {
            const { productId } = state.data;
            const stockQty = parseInt(text.trim(), 10);

            if (isNaN(stockQty) || stockQty < 0) {
                await bot.sendMessage(chatId, `❌ ${t('errors.invalidInput')}`);
                return true;
            }

            const productsRepo = await import('../sheets/products.repository');
            await productsRepo.updateProduct(productId, { stockQty });

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            const { handleProductsMenu } = await import('./handlers/products.handler');
            await handleProductsMenu(chatId, `product:view:${productId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_PRODUCT_NAME') {
            const { productId } = state.data;
            const name = text.trim();

            if (!name) {
                await bot.sendMessage(chatId, `❌ ${t('errors.inputRequired')}`);
                return true;
            }

            const productsRepo = await import('../sheets/products.repository');
            await productsRepo.updateProduct(productId, { name });

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            const { handleProductsMenu } = await import('./handlers/products.handler');
            await handleProductsMenu(chatId, `product:view:${productId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        } else if (state.action === 'EDIT_PRODUCT_PRICE') {
            const { productId } = state.data;
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));

            if (isNaN(price) || price < 0) {
                await bot.sendMessage(chatId, `❌ ${t('errors.invalidPrice')}`);
                return true;
            }

            const productsRepo = await import('../sheets/products.repository');
            await productsRepo.updateProduct(productId, { defaultPrice: price });

            await bot.sendMessage(chatId, `✅ ${t('common.saved')}`);

            const { handleProductsMenu } = await import('./handlers/products.handler');
            await handleProductsMenu(chatId, `product:view:${productId}`, undefined, user);

            clearConversationState(Number(user.userId));
            return true;
        }
    } catch (error) {
        console.error('[ConversationInput] Error:', error);
        await bot.sendMessage(chatId, `❌ ${t('common.error')}`);
        clearConversationState(Number(user.userId));
        return true;
    }

    return false;
}
