import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';

let sheetsClient: sheets_v4.Sheets | null = null;
let auth: JWT | null = null;

export async function initSheetsClient(): Promise<sheets_v4.Sheets> {
    if (sheetsClient) {
        return sheetsClient;
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!email || !key) {
        throw new Error('Google service account credentials not configured');
    }

    auth = new JWT({
        email,
        key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
}

export async function getSheets(): Promise<sheets_v4.Sheets> {
    if (!sheetsClient) {
        return initSheetsClient();
    }
    return sheetsClient;
}

export function getSpreadsheetId(): string {
    const id = process.env.GOOGLE_SHEETS_ID;
    if (!id) {
        throw new Error('GOOGLE_SHEETS_ID not configured');
    }
    return id;
}
