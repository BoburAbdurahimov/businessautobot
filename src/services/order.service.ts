import { Order, OrderItem, OrderDiscount, DiscountType, OrderStatus } from '../domain/types';
import { calculateOrderTotals, calculateItemSubtotal, determineOrderStatus } from '../domain/calculations';
import * as ordersRepo from '../sheets/orders.repository';
import * as orderItemsRepo from '../sheets/order-items.repository';
import * as productsRepo from '../sheets/products.repository';
import * as clientsRepo from '../sheets/clients.repository';
import * as paymentsRepo from '../sheets/payments.repository';
import * as auditLogRepo from '../sheets/audit-log.repository';
import { createOrderSchema } from '../utils/validation';

interface OrderItemInput {
    productId: string;
    qty: number;
    unitPrice?: number;
}

export async function createOrder(
    clientId: string,
    orderDate: Date,
    items: OrderItemInput[],
    discount: OrderDiscount = { type: DiscountType.NONE, value: 0 },
    createdBy: string
): Promise<{ order: Order; items: OrderItem[] }> {
    // Validate input
    createOrderSchema.parse({ clientId, orderDate, items, discount });

    // Get client
    const client = await clientsRepo.getClientById(clientId);
    if (!client) {
        throw new Error('Mijoz topilmadi');
    }

    // Validate products and prepare items
    const orderItems: OrderItem[] = [];
    let itemsTotal = 0;

    for (const itemInput of items) {
        const product = await productsRepo.getProductById(itemInput.productId);
        if (!product) {
            throw new Error(`Mahsulot topilmadi: ${itemInput.productId}`);
        }

        if (!product.active) {
            throw new Error(`Mahsulot nofaol: ${product.name}`);
        }



        const unitPrice = itemInput.unitPrice !== undefined ? itemInput.unitPrice : product.defaultPrice;
        const subtotal = calculateItemSubtotal(itemInput.qty, unitPrice);
        itemsTotal += subtotal;

        orderItems.push({
            orderItemId: '', // Will be set when saving
            orderId: '', // Will be set after order is created
            productId: product.productId,
            productName: product.name,
            qty: itemInput.qty,
            unitPrice,
            subtotal,
        });
    }

    // Calculate totals
    const { discountAmount, orderTotal } = calculateOrderTotals(orderItems, discount, 0);

    // Create order
    const order = await ordersRepo.createOrder(
        clientId,
        client.name,
        orderDate,
        discount,
        itemsTotal,
        discountAmount,
        orderTotal,
        createdBy
    );

    // Create order items
    const savedItems: OrderItem[] = [];
    for (const item of orderItems) {
        const savedItem = await orderItemsRepo.createOrderItem(
            order.orderId,
            item.productId,
            item.productName,
            item.qty,
            item.unitPrice,
            item.subtotal
        );
        savedItems.push(savedItem);



    }

    // Audit log
    await auditLogRepo.createAuditLog('ORDER', order.orderId, 'CREATE', createdBy, undefined, order);

    return { order, items: savedItems };
}

export async function getOrderWithItems(orderId: string): Promise<{ order: Order; items: OrderItem[] } | null> {
    const order = await ordersRepo.getOrderById(orderId);
    if (!order) {
        return null;
    }

    const items = await orderItemsRepo.getOrderItems(orderId);
    return { order, items };
}

export async function updateOrderDiscount(
    orderId: string,
    discount: OrderDiscount,
    updatedBy: string
): Promise<Order | null> {
    const orderData = await getOrderWithItems(orderId);
    if (!orderData) {
        return null;
    }

    const { order: oldOrder, items } = orderData;

    if (oldOrder.status === OrderStatus.CANCELLED) {
        throw new Error('Bekor qilingan buyurtmani tahrirlash mumkin emas');
    }

    const totalPaid = await paymentsRepo.getTotalPaidForOrder(orderId);
    const { discountAmount, orderTotal, balanceDue } = calculateOrderTotals(items, discount, totalPaid);
    const newStatus = determineOrderStatus(orderTotal, totalPaid, oldOrder.status);

    const updatedOrder = await ordersRepo.updateOrder(orderId, {
        discount,
        discountAmount,
        orderTotal,
        balanceDue,
        status: newStatus as OrderStatus,
    });

    if (updatedOrder) {
        await auditLogRepo.createAuditLog('ORDER', orderId, 'UPDATE', updatedBy, oldOrder, updatedOrder);
    }

    return updatedOrder;
}

export async function cancelOrder(orderId: string, cancelledBy: string): Promise<Order | null> {
    const orderData = await getOrderWithItems(orderId);
    if (!orderData) {
        return null;
    }

    const { order } = orderData;

    if (order.status === OrderStatus.CANCELLED) {
        throw new Error('Buyurtma allaqachon bekor qilingan');
    }



    // Update order status
    const updatedOrder = await ordersRepo.updateOrder(orderId, {
        status: OrderStatus.CANCELLED,
    });

    if (updatedOrder) {
        await auditLogRepo.createAuditLog('ORDER', orderId, 'CANCEL', cancelledBy, order, updatedOrder);
    }

    return updatedOrder;
}

export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return ordersRepo.getOrdersByStatus(status);
}

export async function getOrdersByClient(clientId: string): Promise<Order[]> {
    return ordersRepo.getOrdersByClient(clientId);
}

export async function getAllOrders(): Promise<Order[]> {
    return ordersRepo.getAllOrders();
}

/**
 * Restore a completed order to OPEN status for editing
 */
export async function restoreOrder(orderId: string, restoredBy: string): Promise<Order | null> {
    const order = await ordersRepo.getOrderById(orderId);

    if (!order) {
        return null;
    }

    if (order.status !== OrderStatus.COMPLETED) {
        throw new Error('Faqat yakunlangan buyurtmalarni tiklash mumkin');
    }

    // Save old state for audit
    const oldOrder = { ...order };

    // Change status to OPEN
    const updatedOrder = await ordersRepo.updateOrder(orderId, {
        status: OrderStatus.OPEN,
    });

    if (updatedOrder) {
        // Log restore action
        await auditLogRepo.createAuditLog(
            'ORDER',
            orderId,
            'RESTORE',
            restoredBy,
            oldOrder,
            updatedOrder
        );
    }

    return updatedOrder;
}

// Helper to recalculate order totals and update fields
async function updateOrderTotals(orderId: string): Promise<Order | null> {
    const orderData = await getOrderWithItems(orderId);
    if (!orderData) return null;

    const { order, items } = orderData;
    const totalPaid = await paymentsRepo.getTotalPaidForOrder(orderId);
    const { itemsTotal, discountAmount, orderTotal, balanceDue } = calculateOrderTotals(items, order.discount, totalPaid);
    const newStatus = determineOrderStatus(orderTotal, totalPaid, order.status);

    const updatedOrder = await ordersRepo.updateOrder(orderId, {
        itemsTotal,
        discountAmount,
        orderTotal,
        balanceDue,
        status: newStatus as OrderStatus,
        totalPaid // Ensure totalPaid is synced
    });

    // We can audit log here if needed, but atomic actions usually log themselves
    return updatedOrder;
}

export async function recalculateOrderPaymentStatus(orderId: string): Promise<Order | null> {
    // This function is called when payments change. Logic is same as general total update.
    // We just reuse the internal helper
    return updateOrderTotals(orderId);
}

export async function updateOrderItemQty(
    orderId: string,
    orderItemId: string,
    newQty: number
): Promise<Order | null> {
    // 1. Get current state
    const orderData = await getOrderWithItems(orderId);
    if (!orderData) throw new Error('Order not found');
    const { order, items } = orderData;

    if (order.status === OrderStatus.CANCELLED) throw new Error('Cannot edit cancelled order');

    const item = items.find(i => i.orderItemId === orderItemId);
    if (!item) throw new Error('Order item not found');

    if (newQty <= 0) throw new Error('Qty must be > 0');

    // 2. Calculate diff
    const oldQty = item.qty;
    const diff = newQty - oldQty;

    if (diff === 0) return order;



    // 4. Update Item
    const newSubtotal = calculateItemSubtotal(newQty, item.unitPrice);
    await orderItemsRepo.updateOrderItem(orderItemId, {
        qty: newQty,
        subtotal: newSubtotal
    });

    // 5. Update Order Totals
    return updateOrderTotals(orderId);
}

export async function deleteOrderItem(
    orderId: string,
    orderItemId: string
): Promise<Order | null> {
    const orderData = await getOrderWithItems(orderId);
    if (!orderData) throw new Error('Order not found');
    const { order, items } = orderData;

    if (order.status === OrderStatus.CANCELLED) throw new Error('Cannot edit cancelled order');

    const item = items.find(i => i.orderItemId === orderItemId);
    if (!item) throw new Error('Order item not found');



    // 2. Delete item
    await orderItemsRepo.deleteOrderItem(orderItemId);

    // 3. Update Order Totals
    return updateOrderTotals(orderId);
}

/**
 * Get last N completed orders for restore menu
 */
export async function getRecentCompletedOrders(limit: number = 10): Promise<Order[]> {
    const completedOrders = await ordersRepo.getOrdersByStatus(OrderStatus.COMPLETED);

    // Sort by updatedAt descending (most recent first)
    const sorted = completedOrders.sort((a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    // Return top N
    return sorted.slice(0, limit);
}

