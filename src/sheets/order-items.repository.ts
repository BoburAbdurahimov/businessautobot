import { OrderItem } from '../domain/types';
import { appendRows, findRows, updateRow, ensureHeaders } from './operations';
import { generateId, parseNumber } from '../utils/helpers';

const SHEET_NAME = 'BuyurtmaMahsulotlari';
const HEADERS = [
    'ID',
    'BuyurtmaID',
    'MahsulotID',
    'MahsulotNomi',
    'Miqdor',
    'Narx',
    'Summa'
];

export async function initOrderItemsSheet(): Promise<void> {
    await ensureHeaders(SHEET_NAME, HEADERS);
}

function rowToOrderItem(row: any[]): OrderItem {
    return {
        orderItemId: row[0] || '',
        orderId: row[1] || '',
        productId: row[2] || '',
        productName: row[3] || '',
        qty: parseNumber(row[4], 0),
        unitPrice: parseNumber(row[5], 0),
        subtotal: parseNumber(row[6], 0),
    };
}

function orderItemToRow(item: OrderItem): any[] {
    return [
        item.orderItemId,
        item.orderId,
        item.productId,
        item.productName,
        item.qty,
        item.unitPrice,
        item.subtotal,
    ];
}

export async function createOrderItem(
    orderId: string,
    productId: string,
    productName: string,
    qty: number,
    unitPrice: number,
    subtotal: number
): Promise<OrderItem> {
    const item: OrderItem = {
        orderItemId: generateId('OITM'),
        orderId,
        productId,
        productName,
        qty,
        unitPrice,
        subtotal,
    };

    await appendRows(SHEET_NAME, [orderItemToRow(item)]);
    return item;
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
    const results = await findRows(SHEET_NAME, (row) => row[0] && row[1] === orderId);
    return results.map(r => rowToOrderItem(r.row));
}

export async function updateOrderItem(
    orderItemId: string,
    updates: Partial<Pick<OrderItem, 'qty' | 'unitPrice' | 'subtotal'>>
): Promise<OrderItem | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === orderItemId);

    if (results.length === 0) {
        return null;
    }

    const item = rowToOrderItem(results[0].row);

    if (updates.qty !== undefined) item.qty = updates.qty;
    if (updates.unitPrice !== undefined) item.unitPrice = updates.unitPrice;
    if (updates.subtotal !== undefined) item.subtotal = updates.subtotal;

    await updateRow(SHEET_NAME, results[0].index, orderItemToRow(item));
    return item;
}

export async function deleteOrderItem(orderItemId: string): Promise<boolean> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === orderItemId);

    if (results.length === 0) {
        return false;
    }

    // Mark as deleted by clearing the ID (soft delete)
    const emptyRow = new Array(8).fill('');
    await updateRow(SHEET_NAME, results[0].index, emptyRow);
    return true;
}

export async function deleteOrderItems(orderId: string): Promise<void> {
    const items = await getOrderItems(orderId);

    for (const item of items) {
        await deleteOrderItem(item.orderItemId);
    }
}
