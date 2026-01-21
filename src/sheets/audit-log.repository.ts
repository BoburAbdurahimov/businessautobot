import { AuditLog } from '../domain/types';
import { appendRows, ensureHeaders } from './operations';
import { generateId, formatDate } from '../utils/helpers';

const SHEET_NAME = 'AuditLog';
const HEADERS = [
    'AuditID',
    'Turi',
    'ObyektID',
    'Amal',
    'EskiMalumot',
    'YangiMalumot',
    'Bajaruvchi',
    'Vaqt'
];

export async function initAuditLogSheet(): Promise<void> {
    await ensureHeaders(SHEET_NAME, HEADERS);
}

function auditLogToRow(log: AuditLog): any[] {
    return [
        log.auditId,
        log.entityType,
        log.entityId,
        log.action,
        log.beforeData || '',
        log.afterData || '',
        log.performedBy,
        formatDate(log.timestamp),
    ];
}

export async function createAuditLog(
    entityType: AuditLog['entityType'],
    entityId: string,
    action: AuditLog['action'],
    performedBy: string,
    beforeData?: any,
    afterData?: any
): Promise<AuditLog> {
    const log: AuditLog = {
        auditId: generateId('AUD'),
        entityType,
        entityId,
        action,
        beforeData: beforeData ? JSON.stringify(beforeData) : undefined,
        afterData: afterData ? JSON.stringify(afterData) : undefined,
        performedBy,
        timestamp: new Date(),
    };

    await appendRows(SHEET_NAME, [auditLogToRow(log)]);
    return log;
}
