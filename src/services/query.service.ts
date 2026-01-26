import { Order, Client, Product } from '../domain/types';
import * as ordersRepo from '../sheets/orders.repository';
import * as clientsRepo from '../sheets/clients.repository';
import * as productsRepo from '../sheets/products.repository';
import { OrderStatus } from '../domain/types';

// ==================== CLIENT GROUPING ====================

export interface ClientWithOpenOrders {
    client: Client;
    openOrders: Order[];
    totalOpenBalance: number;
    orderCount: number;
}

/**
 * Get clients with their open orders grouped
 */
export async function getClientsWithOpenOrders(): Promise<ClientWithOpenOrders[]> {
    const openOrders = await ordersRepo.getOrdersByStatus(OrderStatus.OPEN);
    const clients = await clientsRepo.getAllClients(true);

    // Group orders by client
    const clientOrdersMap = new Map<string, Order[]>();
    openOrders.forEach(order => {
        if (!clientOrdersMap.has(order.clientId)) {
            clientOrdersMap.set(order.clientId, []);
        }
        clientOrdersMap.get(order.clientId)!.push(order);
    });

    // Build result
    const result: ClientWithOpenOrders[] = [];

    for (const client of clients) {
        const orders = clientOrdersMap.get(client.clientId) || [];
        if (orders.length > 0) {
            const totalOpenBalance = orders.reduce((sum, order) => sum + order.balanceDue, 0);
            result.push({
                client,
                openOrders: orders,
                totalOpenBalance,
                orderCount: orders.length,
            });
        }
    }

    return result;
}

export interface ClientWithDebt {
    client: Client;
    totalDebt: number;
}

/**
 * Get all clients with their total debt (for client list)
 * Efficiently fetches all clients and all open orders once.
 */
export async function getAllClientsWithDebt(): Promise<ClientWithDebt[]> {
    const clients = await clientsRepo.getAllClients(true);
    const openOrders = await ordersRepo.getOrdersByStatus(OrderStatus.OPEN);

    // Create a map of debts
    const deptMap = new Map<string, number>();
    openOrders.forEach(order => {
        const current = deptMap.get(order.clientId) || 0;
        deptMap.set(order.clientId, current + order.balanceDue);
    });

    // Map clients to result
    return clients.map(client => ({
        client,
        totalDebt: deptMap.get(client.clientId) || 0
    }));
}

/**
 * Sort clients with open orders
 */
export function sortClientsWithOpenOrders(
    clients: ClientWithOpenOrders[],
    sortBy: 'name' | 'balance' | 'count'
): ClientWithOpenOrders[] {
    const sorted = [...clients];

    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.client.name.localeCompare(b.client.name, 'uz'));
            break;
        case 'balance':
            sorted.sort((a, b) => b.totalOpenBalance - a.totalOpenBalance); // Descending
            break;
        case 'count':
            sorted.sort((a, b) => b.orderCount - a.orderCount); // Descending
            break;
    }

    return sorted;
}

// ==================== ORDER SORTING ====================

export type OrderSortType = 'newest_updated' | 'largest_balance' | 'by_date' | 'oldest_date';

/**
 * Sort orders
 */
export function sortOrders(orders: Order[], sortBy: OrderSortType): Order[] {
    const sorted = [...orders];

    switch (sortBy) {
        case 'newest_updated':
            sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            break;
        case 'largest_balance':
            sorted.sort((a, b) => b.balanceDue - a.balanceDue);
            break;
        case 'by_date':
            sorted.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
            break;
        case 'oldest_date':
            sorted.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
            break;
    }

    return sorted;
}

// ==================== SEARCH ====================

export type ClientSortType = 'a_z' | 'biggest_debt';
export type ProductSortType = 'a_z' | 'price_high' | 'price_low';

/**
 * Search clients
 */
export async function searchClients(
    query: string,
    sortBy: ClientSortType = 'a_z'
): Promise<Client[]> {
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length < 2) {
        return [];
    }

    let results = await clientsRepo.searchClients(query, true);

    // Sort results
    switch (sortBy) {
        case 'a_z':
            results.sort((a, b) => a.name.localeCompare(b.name, 'uz'));
            break;
        case 'biggest_debt':
            // Calculate debt for each client
            const openOrders = await ordersRepo.getOrdersByStatus(OrderStatus.OPEN);
            const debtMap = new Map<string, number>();

            openOrders.forEach(order => {
                const current = debtMap.get(order.clientId) || 0;
                debtMap.set(order.clientId, current + order.balanceDue);
            });

            results.sort((a, b) => {
                const debtA = debtMap.get(a.clientId) || 0;
                const debtB = debtMap.get(b.clientId) || 0;
                return debtB - debtA; // Descending
            });
            break;
    }

    return results;
}

/**
 * Search products
 */
export async function searchProductsWithSort(
    query: string,
    sortBy: ProductSortType = 'a_z'
): Promise<Product[]> {
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length < 2) {
        return [];
    }

    let results = await productsRepo.searchProducts(query, true);

    // Sort results
    switch (sortBy) {
        case 'a_z':
            results.sort((a, b) => a.name.localeCompare(b.name, 'uz'));
            break;
        case 'price_high':
            results.sort((a, b) => b.defaultPrice - a.defaultPrice);
            break;
        case 'price_low':
            results.sort((a, b) => a.defaultPrice - b.defaultPrice);
            break;

    }

    return results;
}

/**
 * Search orders
 */
export async function searchOrders(
    query: string,
    sortBy: OrderSortType = 'newest_updated'
): Promise<Order[]> {
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length < 2) {
        return [];
    }

    const allOrders = await ordersRepo.getAllOrders();
    let results: Order[] = [];

    // Check if it's an exact order ID match
    if (lowerQuery.startsWith('ord-')) {
        const exactMatch = allOrders.find(o => o.orderId.toLowerCase() === lowerQuery);
        if (exactMatch) {
            return [exactMatch];
        }
    }

    // Check if it's a date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(lowerQuery)) {
        results = allOrders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.toISOString().split('T')[0] === lowerQuery;
        });
    } else {
        // Search by client name
        results = allOrders.filter(order =>
            order.clientName.toLowerCase().includes(lowerQuery)
        );
    }

    // Sort results
    return sortOrders(results, sortBy);
}

// ==================== PAGINATION ====================

export interface PaginatedResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

/**
 * Paginate any array
 */
export function paginate<T>(
    items: T[],
    page: number,
    pageSize: number
): PaginatedResult<T> {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = page * pageSize;
    const end = start + pageSize;

    return {
        items: items.slice(start, end),
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages - 1,
        hasPrev: page > 0,
    };
}
