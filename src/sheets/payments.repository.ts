import { Payment, PaymentMethod } from '../domain/types';
import { appendRows, findRows, updateRow, ensureHeaders } from './operations';
import { generateId, formatDate, parseDate, parseNumber } from '../utils/helpers';

const SHEET_NAME = 'To\'lovlar';
const HEADERS = [
    'To\'lovID',
    'BuyurtmaID',
    'Summa',
    'Sana',
    'Usul',
    'Yaratuvchi',
    'Yaratilgan'
];

export async function initPaymentsSheet(): Promise<void> {
    await ensureHeaders(SHEET_NAME, HEADERS);
}

function rowToPayment(row: any[]): Payment {
    return {
        paymentId: row[0] || '',
        orderId: row[1] || '',
        amount: parseNumber(row[2], 0),
        paymentDate: parseDate(row[3]),
        method: (row[4] as PaymentMethod) || PaymentMethod.CASH,
        createdBy: row[5] || '',
        createdAt: parseDate(row[6]),
    };
}

function paymentToRow(payment: Payment): any[] {
    return [
        payment.paymentId,
        payment.orderId,
        payment.amount,
        formatDate(payment.paymentDate),
        payment.method,
        payment.createdBy,
        formatDate(payment.createdAt),
    ];
}

export async function createPayment(
    orderId: string,
    amount: number,
    paymentDate: Date,
    method: PaymentMethod,
    createdBy: string
): Promise<Payment> {
    const payment: Payment = {
        paymentId: generateId('PAY'),
        orderId,
        amount,
        paymentDate,
        method,
        createdBy,
        createdAt: new Date(),
    };

    await appendRows(SHEET_NAME, [paymentToRow(payment)]);
    return payment;
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === paymentId);
    return results.length > 0 ? rowToPayment(results[0].row) : null;
}

export async function getAllPayments(): Promise<Payment[]> {
    const results = await findRows(SHEET_NAME, (row) => !!row[0]);
    return results.map(r => rowToPayment(r.row));
}

export async function getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    const results = await findRows(SHEET_NAME, (row) => row[0] && row[1] === orderId);
    return results.map(r => rowToPayment(r.row));
}

export async function getTotalPaidForOrder(orderId: string): Promise<number> {
    const payments = await getPaymentsByOrder(orderId);
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
}

export async function updatePayment(
    paymentId: string,
    updates: Partial<Pick<Payment, 'amount' | 'paymentDate' | 'method'>>
): Promise<Payment | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === paymentId);

    if (results.length === 0) {
        return null;
    }

    const payment = rowToPayment(results[0].row);

    if (updates.amount !== undefined) payment.amount = updates.amount;
    if (updates.paymentDate !== undefined) payment.paymentDate = updates.paymentDate;
    if (updates.method !== undefined) payment.method = updates.method;

    await updateRow(SHEET_NAME, results[0].index, paymentToRow(payment));
    return payment;
}

export async function deletePayment(paymentId: string): Promise<boolean> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === paymentId);

    if (results.length === 0) {
        return false;
    }

    const emptyRow = new Array(7).fill('');
    await updateRow(SHEET_NAME, results[0].index, emptyRow);
    return true;
}
