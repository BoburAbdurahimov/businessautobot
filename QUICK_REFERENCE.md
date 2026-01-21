# Quick Reference - Orders Menu Flow

## Main Orders Menu

```
📋 Buyurtmalar
├── ➕ Yangi buyurtma
├── 🟡 Ochiq buyurtmalar (mijoz bo'yicha)  ← NEW!
├── 🟡 Ochiq buyurtmalar (ro'yxat)          ← NEW!
├── Barcha buyurtmalar
├── ✅ Yakunlangan buyurtmalar
├── 🔍 Buyurtmalarni qidirish              ← NEW (UI pending)
└── ⬅️ Ortga
```

---

## Flow 1: Client-Grouped View

```
🟡 Ochiq buyurtmalar (mijoz bo'yicha)
│
├── Shows: Jami X ta mijoz, Y ta ochiq buyurtma
├── Shows: Umumiy qoldiq: Z so'm
│
├── Client 1 • OrderCount • TotalBalance
├── Client 2 • OrderCount • TotalBalance
├── ...
│
├── ⬅️ Oldingi | Keyingi ➡️  (if >10 clients)
└── ⬅️ Ortga
```

**Click Client** →
```
🟡 [ClientName]ning ochiq buyurtmalari
│
├── Shows: Jami: X ta
├── Shows: Qoldiq: Y so'm
│
├── OrderID • ClientName • Balance
├── OrderID • ClientName • Balance
├── ...
│
└── ⬅️ Ortga
```

---

## Flow 2: Flat List with Sorting

```
🟡 Ochiq buyurtmalar (ro'yxat)
│
├── Shows: Jami: X ta
├── Shows: Umumiy qoldiq: Y so'm
├── Shows: Saralash: [Current Sort]
│
├── 📊 Saralash:
│   ├── ✓ Yangilari              (if selected)
│   ├── Katta qoldiqlar
│   └── Sana bo'yicha
│
├── ─────────
│
├── OrderID • Client • Balance
├── OrderID • Client • Balance
├── ...
│
└── ⬅️ Ortga
```

**Click Sort Option** → Re-renders list with new sort ✓

---

## Flow 3: Order Detail

```
📋 Buyurtma [ID]
│
├── Mijoz: [Name]
├── Sana: [Date]
├── Holat: [Status]
│
├── *Mahsulotlar:*
│   ├── 1. Product x Qty = Subtotal
│   ├── 2. Product x Qty = Subtotal
│   └── ...
│
├── *Hisob:*
│   ├── Mahsulotlar jami: X
│   ├── Chegirma: -Y (if any)
│   ├── Buyurtma jami: Z
│   ├── To'langan: A
│   └── Qoldiq: B
│   └── ⚠️ Ortiqcha to'lov: C (if overpaid)
│
├── *To'lovlar (N):*
│   ├── 1. Amount - Method (Date)
│   └── ...
│
├── *Izohlar (M)* (if any)
│
├── 💰 To'lov qo'shish | 💬 Izoh qo'shish
├── 📝 Tahrirlash
├── ❌ Bekor qilish (if not cancelled)
└── ⬅️ Ortga
```

---

## Data Flow

```
User clicks button
      ↓
handlers.ts routes to orders.handler.ts
      ↓
orders.handler.ts calls query.service.ts
      ↓
query.service.ts calls repositories
      ↓
repositories call Google Sheets
      ↓
Data flows back up
      ↓
orders.handler.ts builds UI
      ↓
keyboards.ts creates buttons
      ↓
i18n/uz.ts provides strings
      ↓
Bot sends message to user
```

---

## Sort State Management

```
User selects sort option
      ↓
orders.handler.ts extracts choice from callback_data
      ↓
Stores in sortState Map: userId → sortType
      ↓
Calls queryService.sortOrders(orders, sortType)
      ↓
Returns sorted array
      ↓
Displays with checkmark ✓ on active sort
```

---

## Client Grouping Logic

```
1. Get all OPEN orders
2. Group by clientId
3. For each client:
   - Calculate totalOpenBalance (sum of balanceDue)
   - Count orders
4. Sort by totalOpenBalance (descending)
5. Paginate (10 per page)
6. Display
```

---

## Key Files

| Feature | Handler | Service | Keyboard |
|---------|---------|---------|----------|
| Client-grouped | orders.handler.ts:51 | query.service.ts:29 | keyboards.ts:211 |
| Flat list + sort | orders.handler.ts:101 | query.service.ts:72 | keyboards.ts:250 |
| Search (backend) | - | query.service.ts:101+ | - |
| Pagination | All | query.service.ts:244 | keyboards.ts |

---

## Callback Data Patterns

| Pattern | Meaning |
|---------|---------|
| `menu:orders` | Main orders menu |
| `orders:open_by_client` | Client-grouped view (page 0) |
| `orders:open_by_client:page:N` | Client-grouped view (page N) |
| `orders:client_open:ID` | Single client's open orders |
| `orders:open_list` | Flat list view |
| `orders:open_list:sort:TYPE` | Flat list with sort |
| `order:view:ID` | Order detail |
| `orders:all` | All orders |
| `orders:completed` | Completed orders |

---

## Sort Types

| Code | Label | Logic |
|------|-------|-------|
| `newest_updated` | Yangilari | Sort by updatedAt DESC |
| `largest_balance` | Katta qoldiqlar | Sort by balanceDue DESC |
| `by_date` | Sana bo'yicha | Sort by orderDate DESC |

---

## Translation Keys

| English | Uzbek | Key |
|---------|-------|-----|
| Open Orders (by client) | Ochiq buyurtmalar (mijoz bo'yicha) | `orders.openOrdersByClient` |
| Open Orders (list) | Ochiq buyurtmalar (ro'yxat) | `orders.openOrdersList` |
| Sort by | Saralash | `search.sortBy` |
| Newest | Yangilari | `orders.sortNewest` |
| Largest balance | Katta qoldiqlar | `orders.sortLargestBalance` |
| By date | Sana bo'yicha | `orders.sortByDate` |
| Previous | ⬅️ Oldingi | `pagination.prev` |
| Next | Keyingi ➡️ | `pagination.next` |
| Page | Sahifa | `pagination.page` |

---

## Testing Commands

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Run in dev mode (polling)
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel
```

---

## Quick Troubleshooting

**Issue**: Clients not showing in grouped view  
**Fix**: Create some OPEN orders first

**Issue**: Sort not persisting  
**Fix**: Expected - in-memory only, resets on restart

**Issue**: No pagination buttons  
**Fix**: Expected - only shows if >10 items

**Issue**: Lint errors  
**Fix**: Run `npm run type-check` to see details

**Issue**: Bot not responding  
**Fix**: Check Vercel logs or console for errors

---

## Next Steps

1. Test the new views with real data
2. Create 10+ clients with open orders
3. Try all sort options
4. Verify pagination works
5. Check totals are correct
6. (Optional) Implement search UI

---

## Production Checklist

- [ ] Test with 100+ orders
- [ ] Test pagination edge cases
- [ ] Verify sort stability
- [ ] Add loading indicators
- [ ] Implement search UI
- [ ] Add Redis for sort state
- [ ] Add caching layer
- [ ] Monitor performance
- [ ] Collect user feedback

---

**Documentation**: See `RUSH_TIME_COMPLETE.md` for full details!  
**Support**: Check `TODO.md` for remaining work!  
**Deploy**: Follow `README.md` deployment section!
