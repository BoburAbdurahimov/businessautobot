/**
 * Generate unique ID with prefix
 */
export function generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Format date for Google Sheets (ISO 8601)
 */
export function formatDate(date: Date | string): string {
    if (typeof date === 'string') {
        return date;
    }
    return date.toISOString();
}

/**
 * Parse date from Google Sheets
 */
export function parseDate(dateStr: string): Date {
    if (!dateStr) {
        return new Date();
    }
    return new Date(dateStr);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
    return amount.toLocaleString('uz-UZ') + ' so\'m';
}

/**
 * Parse number safely
 */
export function parseNumber(value: string | number | undefined, defaultValue: number = 0): number {
    if (typeof value === 'number') {
        return value;
    }
    const parsed = parseFloat(value || '');
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse integer safely
 */
export function parseInt(value: string | number | undefined, defaultValue: number = 0): number {
    if (typeof value === 'number') {
        return Math.floor(value);
    }
    const parsed = Number.parseInt(value || '', 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Truncate string
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
