import { Client } from '../domain/types';
import { appendRows, findRows, updateRow, ensureHeaders } from './operations';
import { generateId, formatDate, parseDate } from '../utils/helpers';

const SHEET_NAME = 'Mijozlar';
const HEADERS = ['MijozID', 'Ism', 'Telefon', 'Manzil', 'Faol', 'Yaratilgan', 'Yangilangan'];

export async function initClientsSheet(): Promise<void> {
    await ensureHeaders(SHEET_NAME, HEADERS);
}

function rowToClient(row: any[]): Client {
    const activeVal = row[4];
    return {
        clientId: row[0] || '',
        name: row[1] || '',
        phone: row[2] || '',
        address: row[3] || '',
        active: String(activeVal).toLowerCase() === 'true' || activeVal === true || activeVal === 1 || activeVal === '1',
        createdAt: parseDate(row[5]),
        updatedAt: parseDate(row[6]),
    };
}

function clientToRow(client: Client): any[] {
    return [
        client.clientId,
        client.name,
        client.phone || '',
        client.address || '',
        client.active,
        formatDate(client.createdAt),
        formatDate(client.updatedAt),
    ];
}

export async function createClient(
    name: string,
    phone?: string,
    address?: string
): Promise<Client> {
    const now = new Date();
    const client: Client = {
        clientId: generateId('CLT'),
        name,
        phone,
        address,
        active: true,
        createdAt: now,
        updatedAt: now,
    };

    await appendRows(SHEET_NAME, [clientToRow(client)]);
    return client;
}

export async function getClientById(clientId: string): Promise<Client | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === clientId);
    return results.length > 0 ? rowToClient(results[0].row) : null;
}

export async function getAllClients(activeOnly: boolean = true): Promise<Client[]> {
    const results = await findRows(SHEET_NAME, (row) => {
        if (!row[0]) return false;
        if (activeOnly) {
            const val = row[4];
            const isActive = String(val).toLowerCase() === 'true' || val === true || val === 1 || val === '1';
            if (!isActive) return false;
        }
        return true;
    });

    return results.map(r => rowToClient(r.row));
}

export async function searchClients(query: string, activeOnly: boolean = true): Promise<Client[]> {
    const lowerQuery = query.toLowerCase();
    const results = await findRows(SHEET_NAME, (row) => {
        if (!row[0]) return false;
        if (activeOnly) {
            const val = row[4];
            const isActive = String(val).toLowerCase() === 'true' || val === true || val === 1 || val === '1';
            if (!isActive) return false;
        }

        const name = (row[1] || '').toLowerCase();
        const phone = (row[2] || '').toLowerCase();

        return name.includes(lowerQuery) || phone.includes(lowerQuery);
    });

    return results.map(r => rowToClient(r.row));
}

export async function updateClient(
    clientId: string,
    updates: Partial<Pick<Client, 'name' | 'phone' | 'address' | 'active'>>
): Promise<Client | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === clientId);

    if (results.length === 0) {
        return null;
    }

    const client = rowToClient(results[0].row);

    if (updates.name !== undefined) client.name = updates.name;
    if (updates.phone !== undefined) client.phone = updates.phone;
    if (updates.address !== undefined) client.address = updates.address;
    if (updates.active !== undefined) client.active = updates.active;

    client.updatedAt = new Date();

    await updateRow(SHEET_NAME, results[0].index, clientToRow(client));
    return client;
}
