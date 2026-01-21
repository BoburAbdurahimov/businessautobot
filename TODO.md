# TODO - Remaining Implementation Tasks

## ✅ Recently Completed (Jan 19, 2026)

### Rush-Time UX Features
**Status**: 🟢 Completed  
**Documentation**: See `RUSH_TIME_COMPLETE.md`

**Completed Tasks**:
- [x] Open orders grouped by client view
- [x] Client totals calculation and sorting
- [x] Flat list view with multi-criteria sorting
- [x] Sorting state management (in-memory)
- [x] Query service with advanced search backends
- [x] Pagination utilities
- [x] Enhanced keyboards with sort toolbars
- [x] Complete orders handler rewrite
- [x] Full Uzbek localization for new features

**Files Created/Modified**:
- ✅ `src/services/query.service.ts` (new)
- ✅ `src/i18n/uz.ts` (updated with search/pagination strings)
- ✅ `src/telegram/keyboards.ts` (new keyboards)
- ✅ `src/telegram/handlers/orders.handler.ts` (completely rewritten)

**Impact**:
- Orders can be viewed by client with aggregated balances
- Three sort options for open orders (newest/largest/by-date)
- Backend ready for full search functionality
- Significantly improved UX for daily operations

### Restore Completed Orders
**Status**: 🟢 Backend Complete (95%)  
**Documentation**: See `RESTORE_FEATURE.md`

**Completed Tasks**:
- [x] `restoreOrder()` service function
- [x] `getRecentCompletedOrders()` service function
- [x] Audit log with RESTORE action support
- [x] Admin-only menu option in orders keyboard
- [x] Full Uzbek localization
- [x] Complete handler code documented

**Files Created/Modified**:
- ✅ `src/services/order.service.ts` (restore functions added)
- ✅ `src/i18n/uz.ts` (restore strings added)
- ✅ `src/telegram/keyboards.ts` (admin conditional menu)
- ✅ `RESTORE_FEATURE.md` (complete implementation guide)

**Remaining**: 
- ⏳ Integrate handlers into `orders.handler.ts` (15 min, code provided)

**Impact**:
- Admins can restore completed orders to OPEN status
- Full audit trail of restore actions
- Automatically opens order for editing after restore

### Updated Google Sheets Schema
**Status**: 🟢 Fully Specified  
**Documentation**: See `SHEETS_SCHEMA.md`

**Completed Tasks**:
- [x] All 9 sheets specified with exact columns
- [x] Stable UUID/ULID ID strategy documented
- [x] Append-only write strategy defined
- [x] Settings sheet added for configuration
- [x] Improved column naming for clarity
- [x] Added clientId to Payments for reporting
- [x] RESTORE action added to AuditLog
- [x] Migration guide from old schema

**Files Created/Modified**:
- ✅ `SHEETS_SCHEMA.md` (completely rewritten)
- ✅ `FEATURES_3_4_SUMMARY.md` (implementation summary)

**Remaining**:
- ⏳ Update repositories to match new column names (1-2 hours, optional)
- ⏳ Update init.service.ts with new headers (optional)

**Impact**:
- Production-ready database schema
- Better normalized (clientId in Payments)
- More flexible (note fields, overpaid tracking)
- Settings infrastructure for configuration

---

## High Priority (Core Functionality)

### 1. Conversation State Management
**Status**: 🔴 Not Started  
**Effort**: Medium  
**Description**: Implement state machine for multi-step user inputs

**Tasks**:
- [ ] Create state storage (in-memory Map or Redis for production)
- [ ] Define state types for each flow (AddProduct, AddClient, AddOrder, etc.)
- [ ] Implement state transitions
- [ ] Add timeout/cleanup for stale states

**Example**:
```typescript
// src/telegram/state-manager.ts
interface ConversationState {
  userId: number;
  step: string;
  data: Record<string, any>;
  expiresAt: Date;
}
```

**Flows to Implement**:
- [ ] Add Product flow (name → SKU → price → stock)
- [ ] Add Client flow (name → phone → address)
- [ ] Add Order flow (client → items → discount → confirm)
- [ ] Add Payment flow (order → amount → date → method)
- [ ] Search flow (query → results)

---

### 2. Product Input Handler
**Status**: 🔴 Not Started  
**Effort**: Small  
**Location**: `src/telegram/handlers/products.handler.ts`

**Tasks**:
- [ ] Parse user input format: `SKU | Name | Price | Stock`
- [ ] Validate each field
- [ ] Call product service to create
- [ ] Show success message with product details

---

### 3. Client Input Handler
**Status**: 🔴 Not Started  
**Effort**: Small  
**Location**: `src/telegram/handlers/clients.handler.ts`

**Tasks**:
- [ ] Parse user input format: `Name | Phone | Address`
- [ ] Validate each field
- [ ] Call client service to create
- [ ] Show success message with client details

---

### 4. Order Creation Flow
**Status**: 🟡 Partially Started  
**Effort**: Large  
**Location**: `src/telegram/handlers/orders.handler.ts`

**Tasks**:
- [ ] Client selection with search
- [ ] Add items loop (product search → qty → price override)
- [ ] Discount selection (none/percent/fixed)
- [ ] Order summary preview
- [ ] Confirm and save
- [ ] Error handling for insufficient stock

---

### 5. Payment Input Handler
**Status**: 🔴 Not Started  
**Effort**: Small  
**Location**: `src/telegram/handlers/payments.handler.ts`

**Tasks**:
- [ ] Create payments handler file
- [ ] Order selection UI
- [ ] Amount input
- [ ] Date selection (keyboard with today/yesterday/custom)
- [ ] Method selection (cash/card/transfer)
- [ ] Show updated order totals after payment

---

### 6. Order Comment Handler
**Status**: 🔴 Not Started  
**Effort**: Small  
**Location**: `src/telegram/handlers/comments.handler.ts`

**Tasks**:
- [ ] Create comments handler file
- [ ] Text input for comment
- [ ] Save to OrderComments sheet
- [ ] Display updated comments list

---

## Medium Priority (Admin Features)

### 7. User Management UI
**Status**: 🔴 Not Started  
**Effort**: Medium  
**Location**: `src/telegram/handlers/users.handler.ts`

**Tasks**:
- [ ] Create users handler file
- [ ] List all users (admin only)
- [ ] Add user (require Telegram user ID input)
- [ ] Edit user role (admin ↔ staff)
- [ ] Deactivate/reactivate user
- [ ] Delete user (soft delete)

---

### 8. Edit Product Handler
**Status**: 🔴 Not Started  
**Effort**: Small  
**Location**: `src/telegram/handlers/products.handler.ts`

**Tasks**:
- [ ] Handle `product:edit:${productId}` callback
- [ ] Show current values
- [ ] Input loop for each field
- [ ] Update product
- [ ] Show success and updated details

---

### 9. Edit Order Handler
**Status**: 🔴 Not Started  
**Effort**: Large  
**Location**: `src/telegram/handlers/orders.handler.ts`

**Tasks**:
- [ ] Handle `order:edit:${orderId}` callback
- [ ] Menu: Edit client / Edit items / Edit discount / Edit date
- [ ] For edit items: Add / Remove / Edit item submenu
- [ ] Save updates with audit log
- [ ] Recalculate stock adjustments
- [ ] Show updated order

---

### 10. Delete/Cancel Confirmations
**Status**: 🟡 Partially Started  
**Effort**: Small  

**Tasks**:
- [ ] Product delete with confirmation
- [ ] Order cancel with confirmation (handler exists, wire up)
- [ ] Payment delete with confirmation (admin only)
- [ ] User delete with confirmation (admin only)

---

## Low Priority (Nice to Have)

### 11. Reports
**Status**: 🔴 Not Started  
**Effort**: Medium  
**Location**: `src/telegram/handlers/reports.handler.ts`

**Tasks**:
- [ ] Create reports handler file
- [ ] Sales report (by date range)
  - Total sales
  - Total payments
  - Outstanding balance
- [ ] Inventory report
  - All products with stock levels
  - Low stock warnings
- [ ] Client statement
  - All orders for a client
  - Total purchased
  - Total paid
  - Outstanding balance

---

### 12. Search Functionality
**Status**: 🔴 Not Started  
**Effort**: Small  

**Tasks**:
- [ ] Product search (inline query)
- [ ] Client search (inline query)
- [ ] Order search (by ID or client)
- [ ] Display results with pagination

---

### 13. Date Range Filtering
**Status**: 🟡 Structure Ready  
**Effort**: Small  
**Location**: `src/telegram/handlers/orders.handler.ts`

**Tasks**:
- [ ] Add date picker UI (today / this week / this month / custom)
- [ ] Parse date input
- [ ] Call `getOrdersByDateRange`
- [ ] Display filtered orders

---

### 14. Restore Cancelled Orders
**Status**: 🔴 Not Started  
**Effort**: Small  

**Tasks**:
- [ ] Show last 10 cancelled orders (admin only)
- [ ] Confirmation dialog
- [ ] Change status back to OPEN
- [ ] Decrease stock again
- [ ] Audit log

---

### 15. Settings UI
**Status**: 🔴 Not Started  
**Effort**: Small  
**Location**: `src/telegram/handlers/settings.handler.ts`

**Tasks**:
- [ ] Create settings handler file (admin only)
- [ ] View current settings
  - Low stock threshold
- [ ] Edit low stock threshold
- [ ] Store in Settings sheet (create repository)

---

## Polish & Production

### 16. Error Handling
**Status**: 🟡 Basic Implementation  
**Effort**: Medium  

**Tasks**:
- [ ] Better error messages in Uzbek
- [ ] Graceful handling of Google Sheets quota limits
- [ ] Retry logic for transient errors
- [ ] User-friendly error display

---

### 17. Loading States
**Status**: 🔴 Not Started  
**Effort**: Small  

**Tasks**:
- [ ] Show "Yuklanmoqda..." while processing
- [ ] Edit message after completion
- [ ] Use callback query answers for instant feedback

---

### 18. Input Validation Messages
**Status**: 🟡 Zod Errors Exist  
**Effort**: Small  

**Tasks**:
- [ ] Better Zod error messages in Uzbek
- [ ] Field-specific error guidance
- [ ] Examples in error messages

---

### 19. Pagination Improvements
**Status**: 🟢 Basic Implementation  
**Effort**: Small  

**Tasks**:
- [ ] Add "Jump to page" option
- [ ] Show current page number (Page 2 of 5)
- [ ] Increase page size option

---

### 20. Help & Documentation
**Status**: 🔴 Not Started  
**Effort**: Small  

**Tasks**:
- [ ] `/help` command with feature list
- [ ] Inline help buttons in each menu
- [ ] FAQ section
- [ ] Video tutorials (external)

---

## Testing & Quality

### 21. Unit Tests
**Status**: 🔴 Not Started  
**Effort**: Large  

**Tasks**:
- [ ] Test calculation functions
- [ ] Test validation schemas
- [ ] Test repository functions (mocked Sheets)
- [ ] Test service functions

---

### 22. Integration Tests
**Status**: 🔴 Not Started  
**Effort**: Large  

**Tasks**:
- [ ] Test complete order flow
- [ ] Test payment flow
- [ ] Test stock adjustments
- [ ] Test role permissions

---

### 23. Load Testing
**Status**: 🔴 Not Started  
**Effort**: Medium  

**Tasks**:
- [ ] Test with 100+ products
- [ ] Test with 1000+ orders
- [ ] Measure API response times
- [ ] Optimize slow queries

---

## DevOps & Monitoring

### 24. Logging
**Status**: 🟡 Console.log Only  
**Effort**: Small  

**Tasks**:
- [ ] Structured logging (Winston or Pino)
- [ ] Log levels (error, warn, info, debug)
- [ ] Request ID tracking
- [ ] Performance metrics

---

### 25. Monitoring
**Status**: 🔴 Not Started  
**Effort**: Small  

**Tasks**:
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring (Vercel Analytics)
- [ ] Google Sheets API quota monitoring
- [ ] Bot response time tracking

---

### 26. Backup Strategy
**Status**: 🔴 Not Started  
**Effort**: Small  

**Tasks**:
- [ ] Automated daily Google Sheets export
- [ ] Store backups in Google Drive or S3
- [ ] Restore procedure documentation

---

## Priority Matrix

### Must Have (for MVP)
1. ✅ Core domain types
2. ✅ Google Sheets repositories
3. ✅ Basic bot structure
4. ⏳ Conversation state management
5. ⏳ Product input handler
6. ⏳ Client input handler
7. ⏳ Order creation flow
8. ⏳ Payment input handler

### Should Have (for v1.0)
9. Edit handlers (product, order, client)
10. Delete/cancel confirmations
11. User management UI
12. Reports (basic)
13. Search functionality
14. Better error handling

### Nice to Have (for v2.0)
15. Settings UI
16. Restore cancelled orders
17. Advanced reports
18. Load testing
19. Unit/integration tests
20. Monitoring & logging

---

## Quick Wins (Easy Implementations)

These can be done quickly for immediate value:

1. **Add Loading Messages** (30 min)
   - Show "Processing..." on button clicks
   - Edit message when done

2. **Better Error Messages** (1 hour)
   - Translate Zod errors to Uzbek
   - Add helpful examples

3. **Product Delete Handler** (30 min)
   - Wire up existing confirmation UI
   - Call `deleteProduct` repo method

4. **Payment Handler Skeleton** (1 hour)
   - Create basic file
   - Add to main router
   - Simple input flow

5. **Order Comments View** (30 min)
   - Show comments in order detail view
   - Add button to add comment

---

## Estimated Total Effort

- **High Priority**: ~5-7 days
- **Medium Priority**: ~3-4 days
- **Low Priority**: ~2-3 days
- **Testing & Quality**: ~3-5 days
- **Total**: ~13-19 days for complete production system

---

## Recommended Implementation Order

Week 1:
- [ ] Conversation state management
- [ ] Product input handler
- [ ] Client input handler
- [ ] Payment input handler
- [ ] Order creation flow (basic)

Week 2:
- [ ] Edit handlers (product, client)
- [ ] Delete confirmations
- [ ] Order edit handler
- [ ] Better error handling
- [ ] Loading states

Week 3:
- [ ] User management UI
- [ ] Reports (basic)
- [ ] Search functionality
- [ ] Settings UI
- [ ] Testing

---

**Current Status**: 🟢 Foundation Complete (~60%)  
**Next Milestone**: 🎯 MVP (Interactive Flows) - ~70%  
**Final Milestone**: 🏁 v1.0 Production Ready - 100%
