import { Payment, PaymentMethod } from '../domain/types';
import * as paymentsRepo from '../sheets/payments.repository';
import * as orderService from './order.service';

export async function createPayment(
    orderId: string,
    amount: number,
    paymentDate: Date,
    method: PaymentMethod,
    createdBy: string
): Promise<Payment> {
    const payment = await paymentsRepo.createPayment(orderId, amount, paymentDate, method, createdBy);

    if (orderId) {
        await orderService.recalculateOrderPaymentStatus(orderId);
    }

    return payment;
}

export async function updatePayment(
    paymentId: string,
    updates: { amount?: number; method?: PaymentMethod },
    _updatedBy: string
): Promise<Payment | null> {
    const payment = await paymentsRepo.getPaymentById(paymentId);
    if (!payment) return null;

    const updatedPayment = await paymentsRepo.updatePayment(paymentId, updates);

    if (updatedPayment && updatedPayment.orderId) {
        await orderService.recalculateOrderPaymentStatus(updatedPayment.orderId);
    }

    return updatedPayment;
}

export async function deletePayment(paymentId: string, _deletedBy: string): Promise<boolean> {
    const payment = await paymentsRepo.getPaymentById(paymentId);
    if (!payment) return false;

    const success = await paymentsRepo.deletePayment(paymentId);

    if (success && payment.orderId) {
        await orderService.recalculateOrderPaymentStatus(payment.orderId);
    }

    return success;
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
    return paymentsRepo.getPaymentById(paymentId);
}

export async function getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return paymentsRepo.getPaymentsByOrder(orderId);
}

export async function getAllPayments(): Promise<Payment[]> {
    return paymentsRepo.getAllPayments();
}
