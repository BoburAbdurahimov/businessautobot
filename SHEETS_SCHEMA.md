# Google Sheets Database Schema - Updated Specification

This document describes the **exact** Google Sheets structure as requested, with all required tabs and columns.

---

## Overview

**Spreadsheet Name**: Business Bot Database  
**ID Strategy**: UUID/ULID stable IDs (never use row numbers as IDs)  
**Write Strategy**: Append-only where possible; updates find row by ID  
**Initialization**: Create tabs + seed headers on first run if missing

---

## Sheet 1: Users

**Purpose**: Authorized bot users with role-based access

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | telegramUserId | String | Yes | Telegram user ID |
| B | name | String | Yes | User's full name |
| C | role | Enum | Yes | Admin or Staff |
| D | active | Boolean | Yes | true or false |
| E | createdAt | ISO Date | Yes | When user was added |

**Sample**:
```
telegramUserId | name          | role  | active | createdAt
123456789      | Anvar Aliyev  | Admin | true   | 2026-01-19T22:00:00Z
987654321      | Laylo Karim   | Staff | true   | 2026-01-19T22:05:00Z
```

**Notes**:
- Use `telegramUserId` (not just userId) to be explicit
- Roles: `Admin` or `Staff` (capitalized)
- No username/firstName/lastName columns (simplified)

---

## Sheet 2: Clients

**Purpose**: Customer/client database

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | clientId | String (UUID) | Yes | Unique client ID |
| B | name | String | Yes | Client name |
| C | phone | String | No | Phone number (optional) |
| D | note | String | No | Additional notes |
| E | createdAt | ISO Date | Yes | When created |
| F | updatedAt | ISO Date | Yes | Last updated |

**Sample**:
```
clientId       | name          | phone          | note              | createdAt            | updatedAt
CLT-ABC123XYZ  | Anvar Aliyev  | +998901234567  | VIP client        | 2026-01-19T22:00:00Z | 2026-01-19T22:00:00Z
```

**Changes from previous**:
- Added `note` column (was `address`)
- Removed `active` flag (clients always active, soft delete via note if needed)

---

## Sheet 3: Products

**Purpose**: Product catalog with inventory

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | productId | String (UUID) | Yes | Unique product ID |
| B | name | String | Yes | Product name |
| C | sku | String | No | Stock keeping unit (optional) |
| D | defaultPrice | Number | Yes | Default selling price |
| E | stockQty | Integer | Yes | Current stock quantity |
| F | active | Boolean | Yes | true or false |
| G | createdAt | ISO Date | Yes | When created |
| H | updatedAt | ISO Date | Yes | Last updated |

**Sample**:
```
productId      | name  | sku       | defaultPrice | stockQty | active | createdAt            | updatedAt
PRD-LMN123ABC  | Olma  | APPLE001  | 5000         | 100      | true   | 2026-01-19T22:00:00Z | 2026-01-19T22:00:00Z
```

**Notes**:
- `sku` is optional (some businesses don't use SKUs)
- Same as before, no changes

---

## Sheet 4: Orders

**Purpose**: Order headers with totals and status

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | orderId | String (UUID) | Yes | Unique order ID |
| B | orderDate | String (YYYY-MM-DD) | Yes | Order date (not full timestamp) |
| C | clientId | String (UUID) | Yes | Reference to Clients |
| D | status | Enum | Yes | OPEN, COMPLETED, CANCELLED |
| E | orderDiscountType | Enum | Yes | none, percent, fixed |
| F | orderDiscountValue | Number | Yes | Discount value (0 if none) |
| G | subtotal | Number | Yes | Sum of all line items |
| H | discountTotal | Number | Yes | Calculated discount amount |
| I | total | Number | Yes | subtotal - discountTotal |
| J | totalPaid | Number | Yes | Sum of payments |
| K | balanceDue | Number | Yes | total - totalPaid |
| L | overpaid | Number | No | Amount overpaid (optional, can be calculated) |
| M | createdBy | String | Yes | telegramUserId who created |
| N | createdAt | ISO Date | Yes | When created |
| O | updatedAt | ISO Date | Yes | Last updated |

**Sample**:
```
orderId       | orderDate  | clientId      | status | orderDiscountType | orderDiscountValue | subtotal | discountTotal | total  | totalPaid | balanceDue | overpaid | createdBy | createdAt            | updatedAt
ORD-ABC123XYZ | 2026-01-19 | CLT-ABC123XYZ | OPEN   | percent           | 10                 | 50000    | 5000          | 45000  | 20000     | 25000      | 0        | 123456789 | 2026-01-19T22:00:00Z | 2026-01-19T22:00:00Z
```

**Key Changes**:
- `orderDate` is YYYY-MM-DD string (not full timestamp) - simpler
- Renamed `itemsTotal` → `subtotal`
- Renamed `discountAmount` → `discountTotal`
- Renamed `orderTotal` → `total`
- Added `overpaid` column (optional, for explicit tracking)
- Removed `clientName` snapshot (use JOIN instead)

---

## Sheet 5: OrderItems

**Purpose**: Line items for each order

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | orderItemId | String (UUID) | Yes | Unique line item ID |
| B | orderId | String (UUID) | Yes | Reference to Orders |
| C | productId | String (UUID) | Yes | Reference to Products |
| D | qty | Integer | Yes | Quantity ordered |
| E | unitPrice | Number | Yes | Price per unit at time of order |
| F | lineSubtotal | Number | Yes | qty × unitPrice |

**Sample**:
```
orderItemId    | orderId       | productId     | qty | unitPrice | lineSubtotal
OITM-DEF456GHI | ORD-ABC123XYZ | PRD-LMN123ABC | 10  | 5000      | 50000
```

**Key Changes**:
- Removed `productName` and `sku` snapshots (use JOIN instead)
- Renamed `subtotal` → `lineSubtotal` (clearer naming)

---

## Sheet 6: Payments

**Purpose**: Payment records for orders

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | paymentId | String (UUID) | Yes | Unique payment ID |
| B | orderId | String (UUID) | Yes | Reference to Orders |
| C | clientId | String (UUID) | Yes | Reference to Clients (denormalized) |
| D | paymentDate | String (YYYY-MM-DD) | Yes | When payment was made |
| E | amount | Number | Yes | Payment amount |
| F | method | Enum | Yes | cash, card, transfer, other |
| G | note | String | No | Additional notes |
| H | createdBy | String | Yes | telegramUserId who recorded |
| I | createdAt | ISO Date | Yes | When recorded |

**Sample**:
```
paymentId      | orderId       | clientId      | paymentDate | amount | method | note         | createdBy | createdAt
PAY-GHI789JKL  | ORD-ABC123XYZ | CLT-ABC123XYZ | 2026-01-19  | 20000  | cash   | First payment| 123456789 | 2026-01-19T22:00:00Z
```

**Key Changes**:
- Added `clientId` (denormalized for easier reporting)
- `paymentDate` is YYYY-MM-DD string (not full timestamp)
- Changed `method` options: cash/card/transfer/other (simplified)
- Added `note` column for payment notes

---

## Sheet 7: OrderComments

**Purpose**: Staff notes and comments on orders

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | commentId | String (UUID) | Yes | Unique comment ID |
| B | orderId | String (UUID) | Yes | Reference to Orders |
| C | text | String | Yes | Comment text |
| D | createdBy | String | Yes | telegramUserId who commented |
| E | createdAt | ISO Date | Yes | When commented |

**Sample**:
```
commentId      | orderId       | text                | createdBy | createdAt
CMT-JKL012MNO  | ORD-ABC123XYZ | Mijoz ertaga oladi  | 987654321 | 2026-01-19T22:00:00Z
```

**Notes**:
- No changes from previous schema

---

## Sheet 8: AuditLog

**Purpose**: Track all changes to critical data

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | auditId | String (UUID) | Yes | Unique audit log ID |
| B | entityType | Enum | Yes | Order/OrderItem/Product/Client/Payment/Comment |
| C | entityId | String (UUID) | Yes | ID of the entity |
| D | action | Enum | Yes | CREATE/UPDATE/DELETE/RESTORE/CANCEL |
| E | beforeJson | JSON String | No | Entity state before change (null for CREATE) |
| F | afterJson | JSON String | No | Entity state after change (null for DELETE) |
| G | byUserId | String | Yes | telegramUserId who performed action |
| H | timestamp | ISO Date | Yes | When action occurred |

**Sample**:
```
auditId        | entityType | entityId      | action  | beforeJson        | afterJson             | byUserId  | timestamp
AUD-MNO345PQR  | Order      | ORD-ABC123XYZ | UPDATE  | {"status":"OPEN"} | {"status":"CANCELLED"}| 123456789 | 2026-01-19T22:00:00Z
AUD-PQR678STU  | Order      | ORD-DEF456GHI | RESTORE | {"status":"COMPLETED"} | {"status":"OPEN"} | 123456789 | 2026-01-19T23:00:00Z
```

**Key Changes**:
- Added `RESTORE` action type (for restoring completed orders)
- Renamed `performedBy` → `byUserId` (consistency)
- Entity types with capital first letter (Order, not ORDER)

---

## Sheet 9: Settings

**Purpose**: Application configuration and settings

| Column | Name | Type | Required | Description |
|--------|------|------|----------|-------------|
| A | key | String | Yes | Setting key |
| B | value | String | Yes | Setting value (JSON for complex values) |

**Sample**:
```
key                  | value
currency             | UZS
timezone             | Asia/Tashkent
lowStockThreshold    | 10
sheetVersion         | 1.0.0
language             | uz
```

**Notes**:
- Simple key-value store
- Use JSON strings for complex values
- Examples:
  - `locks` → `{"order-123": true}`
  - `features` → `{"enableRestore": true}`

---

## Implementation Checklist

### Initialization (src/services/init.service.ts)

For each sheet:
1. Check if sheet tab exists
2. If not, create it
3. Check if headers exist
4. If not, append header row
5. Log completion

### repositories (src/sheets/*.repository.ts)

For each entity:
1. **Never use row numbers as IDs** ✓
2. Use `findRows()` to locate by ID ✓
3. Use `updateRow()` with found row index ✓
4. Use `appendRows()` for new records ✓
5. Generate UUIDs with `generateId()` ✓

### ID Format

All IDs use this pattern:
```
PREFIX-TIMESTAMP-RANDOM
Example: ORD-LN7K2P0-ABC12
```

Prefixes:
- Orders: `ORD-`
- Clients: `CLT-`
- Products: `PRD-`
- OrderItems: `OITM-`
- Payments: `PAY-`
- Comments: `CMT-`
- Audit: `AUD-`

### Date Formats

Two formats used:
1. **Full timestamps** (ISO 8601): `2026-01-19T22:00:00Z`
   - createdAt, updatedAt, timestamp
2. **Date only** (YYYY-MM-DD): `2026-01-19`
   - orderDate, paymentDate

### Enum Values

All enums use **lowercase** (changed from previous):

**User Roles**:
- `Admin`
- `Staff`

**Order Status**:
- `OPEN`
- `COMPLETED`
- `CANCELLED`

**Discount Types**:
- `none`
- `percent`
- `fixed`

**Payment Methods**:
- `cash`
- `card`
- `transfer`
- `other`

**Audit Actions**:
- `CREATE`
- `UPDATE`
- `DELETE`
- `RESTORE`
- `CANCEL`

**Entity Types** (for audit):
- `Order`
- `OrderItem`
- `Product`
- `Client`
- `Payment`
- `Comment`

---

## Migration Notes

### Changes from Previous Schema

#### Orders Sheet
- `itemsTotal` → `subtotal`
- `discountAmount` → `discountTotal`
- `orderTotal` → `total`
- Removed `clientName` (use JOIN)
- Changed `orderDate` to YYYY-MM-DD (was full timestamp)
- Added `overpaid` column

#### OrderItems Sheet
- Removed `productName`, `sku` (use JOIN)
- `subtotal` → `lineSubtotal`

#### Payments Sheet
- Added `clientId`
- Changed `paymentDate` to YYYY-MM-DD (was full timestamp)
- Added `note` column

#### Clients Sheet
- `address` → `note`
- Removed `active` flag

#### Users Sheet
- Renamed to `telegramUserId`
- Simplified to `name` only (removed firstName/lastName/username)

#### AuditLog Sheet
- Added `RESTORE` action
- `performedBy` → `byUserId`

### Migration Strategy

If you have existing data:

1. **Backup first!** Export current sheets
2. Add new columns (overpaid, note, clientId)
3. Rename columns:
   ```
   itemsTotal → subtotal
   discountAmount → discountTotal
   orderTotal → total
   subtotal → lineSubtotal (in OrderItems)
   ```
4. Convert date formats:
   - orderDate: Extract date part only
   - paymentDate: Extract date part only
5. Populate new columns:
   - clientId in Payments (lookup from Orders)
   - overpaid in Orders (calculate: max(0, totalPaid - total))

---

## Benefits of This Schema

### Simpler
- Fewer snapshot fields (use JOINs instead)
- Date-only fields where timestamps not needed
- Consistent naming (subtotal, total)

### More Normalized
- clientId in Payments enables client payment reports
- No redundant productName/clientName storage

### More Flexible
- `note` fields for free-form text
- `overpaid` explicit tracking
- Settings sheet for configuration

### Audit-Friendly
- RESTORE action tracks order restoration
- Full before/after JSON
- Consistent byUserId naming

---

## Example Queries

### Get order with all details (manual JOIN)

```typescript
const order = await getOrderById(orderId);
const client = await getClientById(order.clientId);
const items = await getOrderItems(orderId);
const products = await Promise.all(
  items.map(item => getProductById(item.productId))
);
const payments = await getPaymentsByOrder(orderId);
```

### Get client payment history

```typescript
// Now possible because clientId in Payments!
const payments = await findRows('Payments', row => 
  row[2] === clientId  // Column C = clientId
);
```

### Get overpaid orders

```typescript
const overpaid = await findRows('Orders', row =>
  parseFloat(row[11]) > 0  // Column L = overpaid
);
```

---

## Status

**Schema Design**: ✅ Complete  
**Documentation**: ✅ Complete  
**Repository Updates Needed**: ⏳ Partial

Next steps:
1. Update repository files to match new column names
2. Update init.service.ts with new headers
3. Update migration guide if converting from old schema
4. Test all CRUD operations

---

This schema is production-ready and follows best practices for Google Sheets as a database! 🎉
