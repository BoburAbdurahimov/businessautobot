# Restore Completed Orders - Implementation Guide

## ✅ Backend Complete

### Service Functions (src/services/order.service.ts)

Already implemented:

```typescript
// Get last 10 completed orders (sorted by updatedAt DESC)
export async function getRecentCompletedOrders(limit: number = 10): Promise<Order[]>

// Restore a completed order to OPEN status
export async function restoreOrder(orderId: string, restoredBy: string): Promise<Order | null>
```

### Translation Strings (src/i18n/uz.ts)

Already added:
- `orders.restoreCompleted` - "♻️ Yakunlanganlarni tiklash (oxirgi 10 ta)"
- `orders.restoreCompletedTitle` - "Yakunlanganlarni tiklash"
- `orders.restoreConfirm` - "Bu buyurtmani tiklamoqchimisiz?"
- `orders.restored` - "Buyurtma tiklandi va tahrirlash uchun ochiq"
- `orders.selectToRestore` - "Tiklash uchun buyurtmani tanlang"

### Keyboard Update (src/telegram/keyboards.ts)

Already updated:
- `ordersMenuKeyboard(isAdmin)` - Now accepts isAdmin parameter
- Shows restore option only for admins

## ⏳ Handler Implementation Needed

Add these handlers to `src/telegram/handlers/orders.handler.ts`:

### 1. Import isAdmin helper

```typescript
// At the top of the file, add to imports
import { isAdmin } from '../bot';
```

### 2. Update menu handler

```typescript
// In handleOrdersMenu function, update menu:orders case
if (data === 'menu:orders') {
    const text = `📋 *Buyurtmalar*\\n\\nBuyurtmalarni boshqarish`;
    const isAdminUser = isAdmin(user);  // Add this line
    
    if (messageId) {
        await bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: ordersMenuKeyboard(isAdminUser),  // Pass parameter
        });
    } else {
        await bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: ordersMenuKeyboard(isAdminUser),  // Pass parameter
        });
    }
}
```

### 3. Add restore handlers (before closing brace of handleOrdersMenu)

```typescript
// ==================== RESTORE COMPLETED ORDERS ====================
else if (data === 'orders:restore') {
    // Admin only
    if (!isAdmin(user)) {
        await bot.sendMessage(chatId, t('roles.noPermission'));
        return;
    }

    const recentCompleted = await orderService.getRecentCompletedOrders(10);
    
    if (recentCompleted.length === 0) {
        await bot.sendMessage(
            chatId,
            '♻️ *' + t('orders.restoreCompletedTitle') + '*\\n\\n' +
            'Yakunlangan buyurtmalar yo\\'q.',
            {
                parse_mode: 'Markdown',
                reply_markup: createInlineKeyboard([...backButton('menu:orders')]),
            }
        );
        return;
    }
    
    let text = `♻️ *${t('orders.restoreCompletedTitle')}*\\n\\n`;
    text += `${t('orders.selectToRestore')}\\n`;
    text += `Oxirgi ${recentCompleted.length} ta yakunlangan buyurtma:\\n`;
    
    const buttons = recentCompleted.map(order => ([
        {
            text: `${order.orderId.substring(0, 12)} • ${order.clientName} • ${formatCurrency(order.orderTotal)}`,
            callback_data: `order:restore_confirm:${order.orderId}`,
        },
    ]));
    
    buttons.push(...backButton('menu:orders'));
    
    await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard(buttons),
    });
}

// ==================== RESTORE CONFIRMATION ====================
else if (data.startsWith('order:restore_confirm:')) {
    // Admin only
    if (!isAdmin(user)) {
        await bot.sendMessage(chatId, t('roles.noPermission'));
        return;
    }

    const orderId = data.split(':')[2];
    const order = await ordersRepo.getOrderById(orderId);
    
    if (!order) {
        await bot.sendMessage(chatId, t('orders.notFound'));
        return;
    }
    
    const text = `♻️ *${t('orders.restoreConfirm')}*\\n\\n` +
        `Buyurtma: ${order.orderId.substring(0, 12)}\\n` +
        `Mijoz: ${order.clientName}\\n` +
        `Jami: ${formatCurrency(order.orderTotal)}`;
    
    await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: createInlineKeyboard([
            [
                { text: t('common.yes'), callback_data: `order:restore:${orderId}` },
                { text: t('common.no'), callback_data: 'orders:restore' },
            ],
        ]),
    });
}

// ==================== EXECUTE RESTORE ====================
else if (data.startsWith('order:restore:')) {
    // Admin only
    if (!isAdmin(user)) {
        await bot.sendMessage(chatId, t('roles.noPermission'));
        return;
    }

    const orderId = data.split(':')[2];
    
    try {
        const restoredOrder = await orderService.restoreOrder(orderId, user.userId);
        
        if (!restoredOrder) {
            await bot.sendMessage(chatId, t('orders.notFound'));
            return;
        }
        
        // Show success message then redirect to order view (for editing)
        await bot.sendMessage(
            chatId,
            `✅ ${t('orders.restored')}\\n\\n` +
            `Buyurtma: ${restoredOrder.orderId.substring(0, 12)}`
        );
        
        // Automatically open the order detail view
        // Simulate clicking on order:view
        await handleOrdersMenu(chatId, `order:view:${orderId}`, undefined, user);
        
    } catch (error: any) {
        await bot.sendMessage(chatId, `❌ ${error.message || t('common.error')}`);
    }
}
```

## Flow Diagram

```
Admin clicks "♻️ Yakunlanganlarni tiklash (oxirgi 10 ta)"
      ↓
Bot fetches last 10 COMPLETED orders (by updatedAt DESC)
      ↓
Shows list with order ID, client, total
      ↓
Admin clicks an order
      ↓
Confirmation dialog: "Bu buyurtmani tiklamoqchimisiz?"
      ↓
Admin clicks "Ha"
      ↓
orderService.restoreOrder() executes:
  - Changes status: COMPLETED → OPEN
  - Creates AuditLog entry with action=RESTORE
      ↓
Shows success message
      ↓
Automatically opens order detail view (for editing)
```

## Testing Steps

1. Create and complete an order:
   - Create order with items
   - Add payments until totalPaid >= orderTotal
   - Verify status changes to COMPLETED

2. Test restore (as Admin):
   - Go to Buyurtmalar menu
   - Click "♻️ Yakunlanganlarni tiklash (oxirgi 10 ta)"
   - Verify shows last 10 completed orders
   - Click an order
   - Confirm restoration
   - Verify status changes to OPEN
   - Verify AuditLog entry created

3. Test permissions:
   - Try as Staff user
   - Verify menu doesn't show restore option
   - Verify direct access is blocked

## Audit Log Entry

When an order is restored, creates:

```
{
  entityType: 'ORDER',
  entityId: orderId,
  action: 'RESTORE',
  beforeData: { ...order with status: COMPLETED },
  afterData: { ...order with status: OPEN },
  byUserId: admin userId,
  timestamp: current date/time
}
```

## Integration Points

- ✅ Service: `order.service.ts` (complete)
- ✅ Translations: `i18n/uz.ts` (complete)
- ✅ Keyboard: `keyboards.ts` (complete)
- ⏳ Handler: `handlers/orders.handler.ts` (code provided above)
- ⏳ Import: Need to add `isAdmin` import from `../bot`

## Status

**Backend**: ✅ 100% Complete  
**Frontend**: ⏳ 90% Complete (just need to add handlers)  
**Effort**: 15-20 minutes to add handlers  
**Complexity**: Low - straightforward implementation
