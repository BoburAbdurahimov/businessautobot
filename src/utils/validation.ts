import { z } from 'zod';
import { UserRole, DiscountType, PaymentMethod } from '../domain/types';

// ==================== PRODUCT SCHEMAS ====================

export const createProductSchema = z.object({
    sku: z.string().min(1, 'SKU majburiy'),
    name: z.string().min(1, 'Mahsulot nomi majburiy'),
    defaultPrice: z.number().min(0, 'Narx 0 dan katta bo\'lishi kerak'),
    stockQty: z.number().int().min(0, 'Qoldiq 0 dan katta bo\'lishi kerak'),
});

export const updateProductSchema = z.object({
    sku: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    defaultPrice: z.number().min(0).optional(),
    stockQty: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
    productId: z.string().min(1),
    qtyChange: z.number().int(),
    reason: z.string().min(1, 'Sabab majburiy'),
});

// ==================== CLIENT SCHEMAS ====================

export const createClientSchema = z.object({
    name: z.string().min(1, 'Ism majburiy'),
    phone: z.string().optional(),
    address: z.string().optional(),
});

export const updateClientSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    active: z.boolean().optional(),
});

// ==================== ORDER SCHEMAS ====================

export const orderDiscountSchema = z.object({
    type: z.nativeEnum(DiscountType),
    value: z.number().min(0),
}).refine((data) => {
    if (data.type === DiscountType.PERCENT) {
        return data.value >= 0 && data.value <= 100;
    }
    return true;
}, {
    message: 'Foiz chegirma 0 va 100 orasida bo\'lishi kerak',
});

export const orderItemInputSchema = z.object({
    productId: z.string().min(1),
    qty: z.number().int().min(1, 'Miqdor kamida 1 bo\'lishi kerak'),
    unitPrice: z.number().min(0).optional(),
});

export const createOrderSchema = z.object({
    clientId: z.string().min(1, 'Mijoz majburiy'),
    orderDate: z.date(),
    items: z.array(orderItemInputSchema).min(1, 'Kamida 1 ta mahsulot kerak'),
    discount: orderDiscountSchema.optional(),
});

// ==================== PAYMENT SCHEMAS ====================

export const createPaymentSchema = z.object({
    orderId: z.string().min(1, 'Buyurtma majburiy'),
    amount: z.number().min(0.01, 'Summa 0 dan katta bo\'lishi kerak'),
    paymentDate: z.date(),
    method: z.nativeEnum(PaymentMethod),
});

export const updatePaymentSchema = z.object({
    amount: z.number().min(0.01).optional(),
    paymentDate: z.date().optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
});

// ==================== USER SCHEMAS ====================

export const createUserSchema = z.object({
    userId: z.string().min(1),
    username: z.string().optional(),
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    role: z.nativeEnum(UserRole),
});

export const updateUserSchema = z.object({
    role: z.nativeEnum(UserRole).optional(),
    active: z.boolean().optional(),
});

// ==================== COMMENT SCHEMAS ====================

export const createCommentSchema = z.object({
    orderId: z.string().min(1),
    text: z.string().min(1, 'Izoh matnini kiriting'),
});
