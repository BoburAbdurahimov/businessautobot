import { Product } from '../domain/types';
import { appendRows, updateRow, findRows, ensureHeaders } from './operations';
import { generateId, formatDate, parseDate } from '../utils/helpers';

const SHEET_NAME = 'Mahsulotlar';
const HEADERS = [
    'MahsulotID',
    'Nomi',
    'Narxi',
    'Qoldiq',
    'Faol',
    'Yaratilgan',
    'Yangilangan'
];

export async function initProductsSheet(): Promise<void> {
    await ensureHeaders(SHEET_NAME, HEADERS);
}

function rowToProduct(row: any[]): Product {
    const activeRaw = row[4];
    const active = activeRaw === true || String(activeRaw).toLowerCase() === 'true';

    return {
        productId: String(row[0] || ''),
        name: String(row[1] || ''),
        defaultPrice: parseFloat(row[2]) || 0,
        stockQty: parseInt(row[3]) || 0,
        active,
        createdAt: parseDate(row[5]),
        updatedAt: parseDate(row[6]),
    };
}

function productToRow(product: Product): any[] {
    return [
        product.productId,
        product.name,
        product.defaultPrice,
        product.stockQty,
        product.active,
        formatDate(product.createdAt),
        formatDate(product.updatedAt),
    ];
}

export async function createProduct(
    name: string,
    defaultPrice: number,
    stockQty: number
): Promise<Product> {
    const now = new Date();
    const product: Product = {
        productId: generateId('PRD'),
        name,
        defaultPrice,
        stockQty,
        active: true,
        createdAt: now,
        updatedAt: now,
    };

    await appendRows(SHEET_NAME, [productToRow(product)]);
    return product;
}

export async function getProductById(productId: string): Promise<Product | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === productId);
    return results.length > 0 ? rowToProduct(results[0].row) : null;
}

export async function getAllProducts(activeOnly: boolean = false): Promise<Product[]> {
    const results = await findRows(SHEET_NAME, (row) => {
        if (!row[0]) return false; // Skip empty rows
        if (activeOnly) {
            const activeRaw = row[4];
            const isActive = activeRaw === true || String(activeRaw).toLowerCase() === 'true';
            if (!isActive) return false;
        }
        return true;
    });

    return results.map(r => rowToProduct(r.row));
}

export async function searchProducts(query: string, activeOnly: boolean = true): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    const results = await findRows(SHEET_NAME, (row) => {
        if (!row[0]) return false;
        if (activeOnly) {
            const activeRaw = row[4];
            const isActive = activeRaw === true || String(activeRaw).toLowerCase() === 'true';
            if (!isActive) return false;
        }

        const name = (row[1] || '').toLowerCase();

        return name.includes(lowerQuery);
    });

    return results.map(r => rowToProduct(r.row));
}

export async function updateProduct(
    productId: string,
    updates: Partial<Pick<Product, 'name' | 'defaultPrice' | 'stockQty' | 'active'>>
): Promise<Product | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === productId);

    if (results.length === 0) {
        return null;
    }

    const product = rowToProduct(results[0].row);

    if (updates.name !== undefined) product.name = updates.name;
    if (updates.defaultPrice !== undefined) product.defaultPrice = updates.defaultPrice;
    if (updates.stockQty !== undefined) product.stockQty = updates.stockQty;
    if (updates.active !== undefined) product.active = updates.active;

    product.updatedAt = new Date();

    await updateRow(SHEET_NAME, results[0].index, productToRow(product));
    return product;
}

export async function adjustStock(
    productId: string,
    qtyChange: number
): Promise<Product | null> {
    const results = await findRows(SHEET_NAME, (row) => row[0] === productId);

    if (results.length === 0) {
        return null;
    }

    const product = rowToProduct(results[0].row);
    product.stockQty += qtyChange;
    product.updatedAt = new Date();

    await updateRow(SHEET_NAME, results[0].index, productToRow(product));
    return product;
}

export async function deleteProduct(productId: string): Promise<boolean> {
    return (await updateProduct(productId, { active: false })) !== null;
}
