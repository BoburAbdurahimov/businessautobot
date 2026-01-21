import { Order, OrderStatus, OrderDiscount, DiscountType } from '../domain/types';
import { appendRows, findRows, updateRow, ensureHeaders } from './operations';
import { generateId, formatDate, parseDate, parseNumber } from '../utils/helpers';

const SHEET_NAME = 'Buyurtmalar';
const HEADERS = [
    'ID',
    'MijozID',
    'Mijoz',
    'Sana',
    'Holat',
    'ChegirmaTuri',
    'ChegirmaQiymati',
    'MahsulotlarJami',
    'ChegirmaSummasi',
    'BuyurtmaJami',
    'Tolangan',
    'Qoldiq',
    'Izoh',
    'Yaratuvchi',
    'Yaratilgan',
    'Yangilangan'
];

export async function initOrdersSheet(): Promise<void> {
    await ensureHeaders(SHEET_NAME, HEADERS);
}

function rowToOrder(row: any[]): Order {
    const discount: OrderDiscount = {
        type: (row[5] as DiscountType) || DiscountType.NONE,
        value: parseNumber(row[6], 0),
    };

    return {
        orderId: row[0] || '',
        clientId: row[1] || '',
        clientName: row[2] || '',
        orderDate: parseDate(row[3]),
        status: (row[4] as OrderStatus) || OrderStatus.OPEN,
        discount,
        itemsTotal: parseNumber(row[7], 0),
        discountAmount: parseNumber(row[8], 0),
        orderTotal: parseNumber(row[9], 0),
        totalPaid: parseNumber(row[10], 0),
        balanceDue: parseNumber(row[11], 0),
        comment: row[12] || '',
        createdBy: row[13] || '',
        createdAt: parseDate(row[14]),
        updatedAt: parseDate(row[15]),
    };
}

function orderToRow(order: Order): any[] {
    return [
        order.orderId,
        order.clientId,
        order.clientName,
        formatDate(order.orderDate),
        order.status,
        order.discount.type,
        order.discount.value,
        order.itemsTotal,
        order.discountAmount,
        order.orderTotal,
        order.totalPaid,
        order.balanceDue,
        order.comment || '',
        order.createdBy,
        formatDate(order.createdAt),
        formatDate(order.updatedAt),
    ];
}

export async function createOrder(
    clientId: string,
    clientName: string,
    orderDate: Date,
    discount: OrderDiscount,
    itemsTotal: number,
    discountAmount: number,
    orderTotal: number,
    createdBy: string
): Promise<Order> {
    const now = new Date();
    const order: Order = {
        orderId: generateId('ORD'),
        clientId,
        clientName,
        orderDate,
        status: OrderStatus.OPEN,
        discount,
        itemsTotal,
        discountAmount,
        orderTotal,
        totalPaid: 0,
        balanceDue: orderTotal,
        comment: '',
        createdBy,
        createdAt: now,
        updatedAt: now,
    };

    await appendRows(SHEET_NAME, [orderToRow(order)]);
    return order;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === orderId);
    return results.length > 0 ? rowToOrder(results[0].row) : null;
}

export async function getAllOrders(): Promise<Order[]> {
    const results = await findRows(SHEET_NAME, (row) => !!row[0]);
    return results.map(r => rowToOrder(r.row));
}

export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    const results = await findRows(SHEET_NAME, (row) => row[0] && row[4] === status);
    return results.map(r => rowToOrder(r.row));
}

export async function getOrdersByClient(clientId: string): Promise<Order[]> {
    const results = await findRows(SHEET_NAME, (row) => row[0] && row[1] === clientId);
    return results.map(r => rowToOrder(r.row));
}

export async function getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    const results = await findRows(SHEET_NAME, (row) => {
        if (!row[0]) return false;
        const orderDate = parseDate(row[3]);
        return orderDate >= startDate && orderDate <= endDate;
    });
    return results.map(r => rowToOrder(r.row));
}

export async function updateOrder(
    orderId: string,
    updates: Partial<Omit<Order, 'orderId' | 'createdBy' | 'createdAt'>>
): Promise<Order | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === orderId);

    if (results.length === 0) {
        return null;
    }

    const order = rowToOrder(results[0].row);

    Object.assign(order, updates);
    order.updatedAt = new Date();

    await updateRow(SHEET_NAME, results[0].index, orderToRow(order));
    return order;
}

export async function updateOrderTotals(
    orderId: string,
    itemsTotal: number,
    discountAmount: number,
    orderTotal: number,
    totalPaid: number,
    balanceDue: number,
    newStatus?: OrderStatus
): Promise<Order | null> {
    const updates: any = {
        itemsTotal,
        discountAmount,
        orderTotal,
        totalPaid,
        balanceDue,
    };

    if (newStatus) {
        updates.status = newStatus;
    }

    return updateOrder(orderId, updates);
}
