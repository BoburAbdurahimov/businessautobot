import { getSheets } from './client';
import { appendRows, findRows, updateRow } from './operations';

const SETTINGS_TAB = 'Settings';
const IDEMPOTENCY_TAB = 'Idempotency';

// ==================== IDEMPOTENCY ====================

export interface IdempotencyKey {
    key: string; // chatId_messageId_actionType
    processedAt: Date;
    result: string; // Serialized result
    expiresAt: Date;
}

/**
 * Generate idempotency key
 */
export function generateIdempotencyKey(
    chatId: number,
    messageId: number | undefined,
    actionType: string
): string {
    return `${chatId}_${messageId || 'none'}_${actionType}`;
}

/**
 * Check if action has already been processed (idempotency check)
 */
export async function checkIdempotency(
    chatId: number,
    messageId: number | undefined,
    actionType: string
): Promise<{ processed: boolean; result?: any }> {
    const key = generateIdempotencyKey(chatId, messageId, actionType);

    try {
        // Try to find existing key
        const rows = await findRows(IDEMPOTENCY_TAB, (row) => row[0] === key);

        if (rows.length > 0) {
            const rowWrapper = rows[0];
            const rowData = rowWrapper.row;
            const expiresAt = new Date(rowData[3]);

            // Check if expired
            if (expiresAt > new Date()) {
                return {
                    processed: true,
                    result: rowData[2] ? JSON.parse(rowData[2]) : undefined,
                };
            }
        }

        return { processed: false };
    } catch (error) {
        console.error('Idempotency check error:', error);
        // On error, assume not processed (safer)
        return { processed: false };
    }
}

/**
 * Record that action has been processed
 */
export async function recordIdempotency(
    chatId: number,
    messageId: number | undefined,
    actionType: string,
    result: any,
    ttlMinutes: number = 60
): Promise<void> {
    const key = generateIdempotencyKey(chatId, messageId, actionType);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const row = [
        key,
        now.toISOString(),
        JSON.stringify(result),
        expiresAt.toISOString(),
    ];

    await appendRows(IDEMPOTENCY_TAB, [row]);
}

// ==================== LOCKING ====================

export interface Lock {
    lockKey: string;
    ownerId: string;
    acquiredAt: Date;
    expiresAt: Date;
}

/**
 * Acquire a lock (simple distributed lock in Settings sheet)
 */
export async function acquireLock(
    lockKey: string,
    ownerId: string,
    ttlSeconds: number = 30
): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
        // Check if lock exists and is valid
        const rows = await findRows(SETTINGS_TAB, (row) => row[0] === `lock:${lockKey}`);

        if (rows.length > 0) {
            const rowWrapper = rows[0];
            const lockData = JSON.parse(rowWrapper.row[1]);
            const lockExpiry = new Date(lockData.expiresAt);

            // Lock exists and hasn't expired
            if (lockExpiry > now) {
                // Check if we already own it
                if (lockData.ownerId === ownerId) {
                    // Extend expiry
                    lockData.expiresAt = expiresAt.toISOString();
                    await updateRow(SETTINGS_TAB, rowWrapper.index, [
                        `lock:${lockKey}`,
                        JSON.stringify(lockData),
                    ]);
                    return true;
                }
                return false; // Someone else owns it
            }

            // Lock expired, take it over
            const newLock: Lock = {
                lockKey,
                ownerId,
                acquiredAt: now,
                expiresAt,
            };

            await updateRow(SETTINGS_TAB, rowWrapper.index, [
                `lock:${lockKey}`,
                JSON.stringify(newLock),
            ]);
            return true;
        }

        // No lock exists, create one
        const newLock: Lock = {
            lockKey,
            ownerId,
            acquiredAt: now,
            expiresAt,
        };

        await appendRows(SETTINGS_TAB, [[`lock:${lockKey}`, JSON.stringify(newLock)]]);
        return true;
    } catch (error) {
        console.error('Lock acquisition error:', error);
        return false;
    }
}

/**
 * Release a lock
 */
export async function releaseLock(lockKey: string, ownerId: string): Promise<void> {
    try {
        const rows = await findRows(SETTINGS_TAB, (row) => row[0] === `lock:${lockKey}`);

        if (rows.length > 0) {
            const rowWrapper = rows[0];
            const lockData = JSON.parse(rowWrapper.row[1]);

            // Only release if we own it
            if (lockData.ownerId === ownerId) {
                await updateRow(SETTINGS_TAB, rowWrapper.index, [`lock:${lockKey}`, '']);
            }
        }
    } catch (error) {
        console.error('Lock release error:', error);
    }
}

/**
 * Execute function with lock
 */
export async function withLock<T>(
    lockKey: string,
    ownerId: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 30,
    retries: number = 3
): Promise<T> {
    let attempts = 0;

    while (attempts < retries) {
        const acquired = await acquireLock(lockKey, ownerId, ttlSeconds);

        if (acquired) {
            try {
                return await fn();
            } finally {
                await releaseLock(lockKey, ownerId);
            }
        }

        // Wait before retry
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }

    throw new Error('Qulfni olib bo\'lmadi. Qaytadan urinib ko\'ring.');
}

// ==================== BATCH OPERATIONS ====================

/**
 * Batch read multiple ranges
 */
export async function batchRead(ranges: string[]): Promise<any[][]> {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
    });

    return (response.data.valueRanges || []).map((vr) => vr.values || []);
}

/**
 * Batch update multiple ranges
 */
export async function batchUpdate(updates: Array<{ range: string; values: any[][] }>): Promise<void> {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    const data = updates.map((update) => ({
        range: update.range,
        values: update.values,
    }));

    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
            valueInputOption: 'RAW',
            data,
        },
    });
}

/**
 * Batch append to multiple sheets
 */
export async function batchAppend(
    appends: Array<{ range: string; values: any[][] }>
): Promise<void> {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    for (const append of appends) {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: append.range,
            valueInputOption: 'RAW',
            requestBody: {
                values: append.values,
            },
        });
    }
}
