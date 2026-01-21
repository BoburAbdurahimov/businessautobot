import { getSheets, getSpreadsheetId } from './client';

/**
 * Append rows to a sheet
 */
export async function appendRows(
    sheetName: string,
    values: any[][]
): Promise<void> {
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId();

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
            values,
        },
    });
}

/**
 * Get all rows from a sheet
 */
export async function getAllRows(sheetName: string): Promise<any[][]> {
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:ZZ`,
    });

    return response.data.values || [];
}

/**
 * Update a specific range
 */
export async function updateRange(
    sheetName: string,
    range: string,
    values: any[][]
): Promise<void> {
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId();

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: 'RAW',
        requestBody: {
            values,
        },
    });
}

/**
 * Update a single row by index (1-based)
 */
export async function updateRow(
    sheetName: string,
    rowIndex: number,
    values: any[]
): Promise<void> {
    await updateRange(sheetName, `A${rowIndex}:ZZ${rowIndex}`, [values]);
}

/**
 * Find rows matching a criteria
 */
export async function findRows(
    sheetName: string,
    predicate: (row: any[]) => boolean
): Promise<{ row: any[]; index: number }[]> {
    const allRows = await getAllRows(sheetName);
    const results: { row: any[]; index: number }[] = [];

    allRows.forEach((row, index) => {
        if (index === 0) return; // Skip header row
        if (predicate(row)) {
            results.push({ row, index: index + 1 }); // 1-based index
        }
    });

    return results;
}

/**
 * Ensure sheet exists
 */
export async function ensureSheet(sheetName: string): Promise<void> {
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId();

    const metadata = await sheets.spreadsheets.get({
        spreadsheetId,
    });

    const sheetExists = metadata.data.sheets?.some(
        (s) => s.properties?.title === sheetName
    );

    if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: sheetName,
                            },
                        },
                    },
                ],
            },
        });
    }
}

/**
 * Ensure sheet has headers
 */
export async function ensureHeaders(
    sheetName: string,
    headers: string[]
): Promise<void> {
    await ensureSheet(sheetName);
    const rows = await getAllRows(sheetName);

    if (rows.length === 0) {
        await appendRows(sheetName, [headers]);
    }
}
