import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets, getSpreadsheetId } from '../src/sheets/client';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    try {
        const spreadsheetId = getSpreadsheetId();
        const sheets = await getSheets();

        // Try to read metadata
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId
        });

        return res.status(200).json({
            status: 'success',
            spreadsheetTitle: metadata.data.properties?.title,
            sheetCount: metadata.data.sheets?.length
        });
    } catch (error: any) {
        return res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack,
            envCheck: {
                hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
                keyLength: process.env.GOOGLE_PRIVATE_KEY?.length,
                hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID
            }
        });
    }
}
