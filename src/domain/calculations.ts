import { OrderDiscount, OrderItem, DiscountType } from './types';

/**
 * CALCULATIONS SPECIFICATION
 * 
 * These functions implement the exact calculation formulas required:
 * 
 * 1. lineSubtotal = qty * unitPrice
 * 2. subtotal = sum(lineSubtotal)
 * 3. discountTotal:
 *    - none: 0
 *    - percent: subtotal * percent/100
 *    - fixed: min(fixed, subtotal)
 * 4. total = subtotal - discountTotal
 * 5. totalPaid = sum(payments.amount for orderId)
 * 6. balanceDue = total - totalPaid
 * 7. overpaid = max(0, totalPaid - total)
 * 
 * All calculations are verified and tested.
 */

/**
 * Calculate line item subtotal
 * Formula: lineSubtotal = qty * unitPrice
 */
export function calculateItemSubtotal(qty: number, unitPrice: number): number {
    return qty * unitPrice;
}

/**
 * Calculate discount amount based on type
 * Formulas:
 *   - none: 0
 *   - percent: subtotal * percent/100 (clamped to 0-100%)
 *   - fixed: min(fixed, subtotal) - cannot exceed subtotal
 */
export function calculateDiscountAmount(subtotal: number, discount: OrderDiscount): number {
    if (discount.type === DiscountType.NONE) {
        return 0;
    }

    if (discount.type === DiscountType.PERCENT) {
        // Clamp percent to 0-100
        const percent = Math.max(0, Math.min(100, discount.value));
        return Math.round((subtotal * percent) / 100);
    }

    if (discount.type === DiscountType.FIXED) {
        // Discount cannot exceed subtotal
        return Math.max(0, Math.min(subtotal, discount.value));
    }

    return 0;
}

/**
 * Calculate all order totals in one pass
 * 
 * Formulas:
 *   subtotal = sum(lineSubtotal)
 *   discountTotal = calculateDiscountAmount(subtotal, discount)
 *   total = subtotal - discountTotal
 *   balanceDue = total - totalPaid
 * 
 * Returns all computed values for storing in Orders sheet
 */
export function calculateOrderTotals(
    items: OrderItem[],
    discount: OrderDiscount,
    totalPaid: number
): {
    itemsTotal: number;      // Legacy name, same as subtotal
    subtotal: number;         // Sum of all line items
    discountAmount: number;   // Legacy name, same as discountTotal
    discountTotal: number;    // Calculated discount
    orderTotal: number;       // Legacy name, same as total
    total: number;            // Final order total
    balanceDue: number;       // Remaining balance
} {
    // Step 1: Calculate subtotal (sum of line items)
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Step 2: Calculate discount
    const discountTotal = calculateDiscountAmount(subtotal, discount);

    // Step 3: Calculate final total
    const total = subtotal - discountTotal;

    // Step 4: Calculate balance due
    const balanceDue = total - totalPaid;

    return {
        itemsTotal: subtotal,      // For backward compatibility
        subtotal,
        discountAmount: discountTotal,  // For backward compatibility
        discountTotal,
        orderTotal: total,         // For backward compatibility
        total,
        balanceDue,
    };
}

/**
 * Calculate overpayment amount
 * Formula: overpaid = max(0, totalPaid - total)
 */
export function getOverpaymentAmount(total: number, totalPaid: number): number {
    return Math.max(0, totalPaid - total);
}

/**
 * Check if order is overpaid
 * Returns true if totalPaid > total
 */
export function isOverpaid(total: number, totalPaid: number): boolean {
    return totalPaid > total;
}

/**
 * Determine order status based on payment status
 * 
 * Rules:
 *   - CANCELLED stays CANCELLED
 *   - totalPaid >= total → COMPLETED
 *   - Otherwise → OPEN
 */
export function determineOrderStatus(
    total: number,
    totalPaid: number,
    currentStatus: string
): string {
    if (currentStatus === 'CANCELLED') {
        return 'CANCELLED';
    }

    if (totalPaid >= total) {
        return 'COMPLETED';
    }

    return 'OPEN';
}

/**
 * Verify calculations are correct (for testing)
 */
export function verifyCalculations(): boolean {
    // Test 1: Line subtotal
    const line1 = calculateItemSubtotal(10, 5000);
    if (line1 !== 50000) return false;

    // Test 2: No discount
    const totals1 = calculateOrderTotals(
        [{ subtotal: 50000 } as OrderItem],
        { type: DiscountType.NONE, value: 0 },
        0
    );
    if (totals1.total !== 50000) return false;

    // Test 3: Percent discount
    const totals2 = calculateOrderTotals(
        [{ subtotal: 50000 } as OrderItem],
        { type: DiscountType.PERCENT, value: 10 },
        0
    );
    if (totals2.discountTotal !== 5000) return false;
    if (totals2.total !== 45000) return false;

    // Test 4: Fixed discount
    const totals3 = calculateOrderTotals(
        [{ subtotal: 50000 } as OrderItem],
        { type: DiscountType.FIXED, value: 3000 },
        0
    );
    if (totals3.discountTotal !== 3000) return false;
    if (totals3.total !== 47000) return false;

    // Test 5: Fixed discount capped at subtotal
    const totals4 = calculateOrderTotals(
        [{ subtotal: 50000 } as OrderItem],
        { type: DiscountType.FIXED, value: 100000 },
        0
    );
    if (totals4.discountTotal !== 50000) return false;
    if (totals4.total !== 0) return false;

    // Test 6: Balance due
    const totals5 = calculateOrderTotals(
        [{ subtotal: 50000 } as OrderItem],
        { type: DiscountType.NONE, value: 0 },
        20000
    );
    if (totals5.balanceDue !== 30000) return false;

    // Test 7: Overpayment
    const overpaid = getOverpaymentAmount(45000, 50000);
    if (overpaid !== 5000) return false;

    // Test 8: Not overpaid
    const notOverpaid = getOverpaymentAmount(45000, 40000);
    if (notOverpaid !== 0) return false;

    // All tests passed
    return true;
}

// Run verification on module load (in development)
if (process.env.NODE_ENV !== 'production') {
    const verified = verifyCalculations();
    if (verified) {
        console.log('✅ Calculations verified successfully');
    } else {
        console.error('❌ Calculation verification failed!');
    }
}
