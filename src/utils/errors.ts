/**
 * Error handling utilities with Uzbek-friendly messages
 */

export class BusinessError extends Error {
    constructor(
        message: string,
        public code: string,
        public uzbekMessage: string
    ) {
        super(message);
        this.name = 'BusinessError';
    }
}

/**
 * Common business errors with Uzbek translations
 */
export const Errors = {
    // Product errors
    PRODUCT_NOT_FOUND: () =>
        new BusinessError(
            'Product not found',
            'PRODUCT_NOT_FOUND',
            'Mahsulot topilmadi'
        ),
    PRODUCT_INACTIVE: (name: string) =>
        new BusinessError(
            `Product inactive: ${name}`,
            'PRODUCT_INACTIVE',
            `Mahsulot nofaol: ${name}`
        ),


    // Client errors
    CLIENT_NOT_FOUND: () =>
        new BusinessError(
            'Client not found',
            'CLIENT_NOT_FOUND',
            'Mijoz topilmadi'
        ),

    // Order errors
    ORDER_NOT_FOUND: () =>
        new BusinessError(
            'Order not found',
            'ORDER_NOT_FOUND',
            'Buyurtma topilmadi'
        ),
    ORDER_ALREADY_CANCELLED: () =>
        new BusinessError(
            'Order already cancelled',
            'ORDER_ALREADY_CANCELLED',
            'Buyurtma allaqachon bekor qilingan'
        ),
    CANNOT_EDIT_CANCELLED: () =>
        new BusinessError(
            'Cannot edit cancelled order',
            'CANNOT_EDIT_CANCELLED',
            'Bekor qilingan buyurtmani tahrirlash mumkin emas'
        ),
    CANNOT_RESTORE_NON_COMPLETED: () =>
        new BusinessError(
            'Can only restore completed orders',
            'CANNOT_RESTORE_NON_COMPLETED',
            'Faqat yakunlangan buyurtmalarni tiklash mumkin'
        ),

    // Payment errors
    PAYMENT_NOT_FOUND: () =>
        new BusinessError(
            'Payment not found',
            'PAYMENT_NOT_FOUND',
            "To'lov topilmadi"
        ),
    INVALID_PAYMENT_AMOUNT: () =>
        new BusinessError(
            'Invalid payment amount',
            'INVALID_PAYMENT_AMOUNT',
            "To'lov miqdori noto'g'ri"
        ),

    // User/Permission errors
    USER_NOT_FOUND: () =>
        new BusinessError(
            'User not found',
            'USER_NOT_FOUND',
            'Foydalanuvchi topilmadi'
        ),
    PERMISSION_DENIED: () =>
        new BusinessError(
            'Permission denied',
            'PERMISSION_DENIED',
            'Sizda bu amal uchun huquq yo\'q'
        ),
    NOT_AUTHORIZED: () =>
        new BusinessError(
            'Not authorized',
            'NOT_AUTHORIZED',
            'Ruxsat berilmagan. Admin bilan bog\'laning.'
        ),

    // Concurrency errors
    LOCK_TIMEOUT: () =>
        new BusinessError(
            'Could not acquire lock',
            'LOCK_TIMEOUT',
            'Qulfni olib bo\'lmadi. Qaytadan urinib ko\'ring.'
        ),
    DUPLICATE_REQUEST: () =>
        new BusinessError(
            'Duplicate request detected',
            'DUPLICATE_REQUEST',
            'Bu amal allaqachon bajarilgan'
        ),

    // System errors
    SHEETS_ERROR: (details: string) =>
        new BusinessError(
            `Google Sheets error: ${details}`,
            'SHEETS_ERROR',
            'Tizim xatoligi. Qaytadan urinib ko\'ring.'
        ),
    VALIDATION_ERROR: (field: string) =>
        new BusinessError(
            `Validation error: ${field}`,
            'VALIDATION_ERROR',
            `Noto'g'ri ma'lumot: ${field}`
        ),
    NETWORK_ERROR: () =>
        new BusinessError(
            'Network error',
            'NETWORK_ERROR',
            'Tarmoq xatoligi. Internetni tekshiring.'
        ),
};

/**
 * Handle errors and return Uzbek-friendly message
 */
export function handleError(error: unknown): string {
    if (error instanceof BusinessError) {
        return error.uzbekMessage;
    }

    if (error instanceof Error) {
        // Check for common error patterns
        if (error.message.includes('not found')) {
            return 'Topilmadi';
        }
        if (error.message.includes('permission')) {
            return 'Sizda huquq yo\'q';
        }
        if (error.message.includes('network') || error.message.includes('timeout')) {
            return 'Tarmoq xatoligi. Qaytadan urinib ko\'ring.';
        }

        // Generic error
        return 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.';
    }

    return 'Noma\'lum xatolik';
}

/**
 * Safely execute async function with error handling
 */
export async function safeExecute<T>(
    fn: () => Promise<T>,
    fallback: T,
    onError?: (error: unknown) => void
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (onError) {
            onError(error);
        } else {
            console.error('Safe execute error:', error);
        }
        return fallback;
    }
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry business errors
            if (error instanceof BusinessError) {
                throw error;
            }

            // Wait before retry (exponential backoff)
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 10000
): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
            setTimeout(
                () => reject(Errors.NETWORK_ERROR()),
                timeoutMs
            )
        ),
    ]);
}
