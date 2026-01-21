import { getBot } from '../bot';
import { User, OrderStatus } from '../../domain/types';
import { paymentsListKeyboard, backButton, createInlineKeyboard, yesNoKeyboard } from '../keyboards';
import * as paymentsRepo from '../../sheets/payments.repository';
import * as paymentService from '../../services/payment.service';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { setConversationState } from '../conversationState';

export async function handlePaymentsMenu(
    chatId: number,
    data: string,
    messageId: number | undefined,
    _user: User
): Promise<void> {
    const bot = getBot();

    if (data === 'menu:payments') {
        const payments = await paymentsRepo.getAllPayments();
        // Sort by date desc
        payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        const text = `💰 *To'lovlar*\n\nJami: ${payments.length} ta to'lov`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: paymentsListKeyboard(payments),
            });
        } else {
            await bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: paymentsListKeyboard(payments),
            });
        }
    } else if (data.startsWith('payments:page:')) {
        const page = parseInt(data.split(':')[2], 10);
        const payments = await paymentsRepo.getAllPayments();
        payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

        const text = `💰 *To'lovlar*\n\nJami: ${payments.length} ta to'lov`;

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: paymentsListKeyboard(payments, page),
            });
        }
    } else if (data.startsWith('payments:order_list:')) {
        const orderId = data.split(':')[2];
        const payments = await paymentsRepo.getPaymentsByOrder(orderId);

        const text = `💰 *Buyurtma to'lovlari*\n\nJami: ${payments.length} ta`;

        await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: paymentsListKeyboard(payments)
        });

    } else if (data.startsWith('payment:view:')) {
        const paymentId = data.split(':')[2];
        const payment = await paymentsRepo.getPaymentById(paymentId);

        if (!payment) {
            await bot.sendMessage(chatId, '❌ To\'lov topilmadi.');
            return;
        }

        const text = `💰 *To'lov ma'lumotlari*\n\n` +
            `🆔 ID: ${payment.paymentId}\n` +
            `💸 Summa: ${formatCurrency(payment.amount)}\n` +
            `📅 Sana: ${formatDate(payment.paymentDate)}\n` +
            `💳 Usul: ${payment.method}\n` +
            `${payment.orderId ? `📦 Buyurtma ID: ${payment.orderId}\n` : ''}` +
            `👤 Kiritdi: ${payment.createdBy}`;

        // Add Edit/Delete buttons
        const buttons = [
            [
                { text: '✏️ Summani tahrirlash', callback_data: `payment:edit:amount:${paymentId}` },
                { text: '🗑 O\'chirish', callback_data: `payment:delete_confirm:${paymentId}` }
            ],
            ...backButton('menu:payments'),
        ];

        if (messageId) {
            await bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard(buttons),
            });
        }
    } else if (data.startsWith('payment:edit:amount:')) {
        const paymentId = data.split(':')[3];
        setConversationState(Number(_user.userId), {
            action: 'EDIT_PAYMENT_AMOUNT',
            data: { paymentId }
        });
        await bot.sendMessage(chatId, '💰 Yangi summani kiriting (so\'mda):', { reply_markup: { force_reply: true } });

    } else if (data.startsWith('payment:delete_confirm:')) {
        const paymentId = data.split(':')[2];

        await bot.editMessageText('❓ Haqiqatan ham bu to\'lovni o\'chirmoqchimisiz?', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: yesNoKeyboard(
                `payment:delete:${paymentId}`,
                `payment:view:${paymentId}`
            )
        });

    } else if (data.startsWith('payment:delete:')) {
        const paymentId = data.split(':')[2];
        const payment = await paymentService.getPaymentById(paymentId);

        const success = await paymentService.deletePayment(paymentId, _user.username || _user.userId);

        if (success) {
            await bot.sendMessage(chatId, '✅ To\'lov o\'chirildi.');
            if (payment && payment.orderId) {
                const { handleOrdersMenu } = await import('./orders.handler');
                await handleOrdersMenu(chatId, `order:view:${payment.orderId}`, undefined, _user);
            } else {
                await handlePaymentsMenu(chatId, 'menu:payments', undefined, _user);
            }
        } else {
            await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.');
        }

    } else if (data === 'payment:add') {
        const ordersRepo = await import('../../sheets/orders.repository');
        const openOrders = await ordersRepo.getOrdersByStatus(OrderStatus.OPEN);

        if (openOrders.length === 0) {
            await bot.sendMessage(chatId, '⚠️ To\'lov qilish uchun *ochiq buyurtmalar* mavjud emas.', { parse_mode: 'Markdown' });
            return;
        }

        openOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const buttons = openOrders.map(order => [
            {
                text: `📦 ${order.clientName} - ${formatCurrency(order.balanceDue)} qarzi qoldi (Jami: ${formatCurrency(order.orderTotal)})`,
                callback_data: `payment:select_order:${order.orderId}`
            }
        ]);

        buttons.push(backButton('menu:payments')[0]);

        await bot.editMessageText('💰 *To\'lov qilinadigan buyurtmani tanlang:*', {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: createInlineKeyboard(buttons)
        });
    } else if (data.startsWith('payment:select_order:') || data.startsWith('payment:add:')) {
        const orderId = data.includes('select_order') ? data.split(':')[2] : data.split(':')[2];
        const ordersRepo = await import('../../sheets/orders.repository');
        const order = await ordersRepo.getOrderById(orderId);

        if (!order) {
            await bot.sendMessage(chatId, '❌ Buyurtma topilmadi.');
            return;
        }

        setConversationState(Number(_user.userId), {
            action: 'ADD_PAYMENT',
            step: 'amount',
            data: { orderId: orderId, balanceDue: order.balanceDue }
        });

        await bot.sendMessage(
            chatId,
            `💰 *To'lov summasini kiriting:*\n\n` +
            `📦 Buyurtma: ${order.clientName}\n` +
            `💵 Jami summa: ${formatCurrency(order.orderTotal)}\n` +
            `💳 To'langan: ${formatCurrency(order.totalPaid)}\n` +
            `❗️ *Qarzdorlik: ${formatCurrency(order.balanceDue)}*\n\n` +
            `Iltimos, to'lov summasini kiriting (so'mda):`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{ text: `${order.balanceDue}` }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            }
        );
    }
}
