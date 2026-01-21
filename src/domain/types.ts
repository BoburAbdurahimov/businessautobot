// ==================== ENUMS ====================

export enum UserRole {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF'
}

export enum OrderStatus {
    OPEN = 'OPEN',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum DiscountType {
    NONE = 'NONE',
    PERCENT = 'PERCENT',
    FIXED = 'FIXED'
}

export enum PaymentMethod {
    CASH = 'CASH',
    CARD = 'CARD',
    TRANSFER = 'TRANSFER'
}

// ==================== USER ====================

export interface User {
    userId: string; // Telegram userId
    username?: string;
    firstName: string;
    lastName?: string;
    role: UserRole;
    active: boolean;
    language?: string;
    createdAt: Date;
}

// ==================== PRODUCT ====================

export interface Product {
    productId: string;
    // sku removed
    name: string;
    defaultPrice: number;
    stockQty: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== CLIENT ====================

export interface Client {
    clientId: string;
    name: string;
    phone?: string;
    address?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== ORDER ====================

export interface OrderDiscount {
    type: DiscountType;
    value: number; // percent (0-100) or fixed amount
}

export interface OrderItem {
    orderItemId: string;
    orderId: string;
    productId: string;
    productName: string; // snapshot for historical accuracy
    // sku removed
    qty: number;
    unitPrice: number;
    subtotal: number; // qty * unitPrice
}

export interface Order {
    orderId: string;
    clientId: string;
    clientName: string; // snapshot
    orderDate: Date;
    status: OrderStatus;
    discount: OrderDiscount;
    itemsTotal: number; // sum of all item subtotals
    discountAmount: number; // calculated from discount
    orderTotal: number; // itemsTotal - discountAmount
    totalPaid: number; // computed from payments
    balanceDue: number; // orderTotal - totalPaid
    comment?: string;
    createdBy: string; // userId
    createdAt: Date;
    updatedAt: Date;
}

// ==================== PAYMENT ====================

export interface Payment {
    paymentId: string;
    orderId: string;
    amount: number;
    paymentDate: Date;
    method: PaymentMethod;
    createdBy: string; // userId
    createdAt: Date;
}

// ==================== AUDIT LOG ====================

export interface AuditLog {
    auditId: string;
    entityType: 'ORDER' | 'PRODUCT' | 'PAYMENT' | 'USER';
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'RESTORE';
    beforeData?: string; // JSON
    afterData?: string; // JSON
    performedBy: string; // userId
    timestamp: Date;
}

// ==================== STOCK ADJUSTMENT ====================

export interface StockAdjustment {
    adjustmentId: string;
    productId: string;
    qtyChange: number; // positive for increase, negative for decrease
    reason: string;
    performedBy: string; // userId
    timestamp: Date;
}

// ==================== SETTINGS ====================

export interface Settings {
    lowStockThreshold: number;
}
