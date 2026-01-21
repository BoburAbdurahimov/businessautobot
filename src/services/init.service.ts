import * as productsRepo from '../sheets/products.repository';
import * as clientsRepo from '../sheets/clients.repository';
import * as ordersRepo from '../sheets/orders.repository';
import * as orderItemsRepo from '../sheets/order-items.repository';
import * as paymentsRepo from '../sheets/payments.repository';
import * as usersRepo from '../sheets/users.repository';
import * as auditLogRepo from '../sheets/audit-log.repository';
import { initSheetsClient } from '../sheets/client';

/**
 * Initialize all Google Sheets with headers
 */
export async function initializeDatabase(): Promise<void> {
    console.log('Initializing database...');

    // Initialize Sheets client
    await initSheetsClient();

    // Initialize all sheets with headers
    // Settings and Idempotency are removed as per user request to clean up redundant lists
    await Promise.all([
        productsRepo.initProductsSheet(),
        clientsRepo.initClientsSheet(),
        ordersRepo.initOrdersSheet(),
        orderItemsRepo.initOrderItemsSheet(),
        paymentsRepo.initPaymentsSheet(),
        usersRepo.initUsersSheet(),
        auditLogRepo.initAuditLogSheet(),
    ]);

    console.log('Database initialized successfully');
}
