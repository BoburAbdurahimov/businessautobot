# Telegram Business Bot - Biznes Boshqaruv Boti

Production-ready Telegram bot in Uzbek (Latin) for small business management. Manage products, orders, inventory, clients, payments, and more - all from inside Telegram.

## Features

### Core Features
- ✅ **Role-based Access Control** - Admin and Staff roles with different permissions
- ✅ **Product Management** - CRUD operations, stock tracking, low stock alerts
- ✅ **Order Management** - Create, edit, cancel orders with full audit trail
- ✅ **Order Discounts** - Percentage or fixed amount discounts
- ✅ **Multi-part Payments** - Split payments across different dates
- ✅ **Overpayment Handling** - Track and display overpayments
- ✅ **Inventory Management** - Automatic stock adjustments
- ✅ **Client Management** - Store and search client information
- ✅ **Order Comments** - Staff can add notes to orders
- ✅ **Audit Logging** - Track all changes to critical data
- ✅ **Uzbek UI** - All user-facing text in Uzbek (Latin)

### Technology Stack
- **Runtime**: Node.js + TypeScript
- **Hosting**: Vercel (serverless)
- **Telegram**: Webhook mode
- **Database**: Google Sheets API v4 with Service Account
- **Validation**: Zod
- **Architecture**: Clean layered architecture

## Project Structure

```
telegram-business-bot/
├── api/
│   └── webhook.ts              # Vercel serverless function
├── src/
│   ├── domain/
│   │   ├── types.ts            # Core domain types
│   │   └── calculations.ts     # Business logic calculations
│   ├── i18n/
│   │   ├── uz.ts              # Uzbek translations
│   │   └── index.ts           # i18n helper
│   ├── sheets/
│   │   ├── client.ts          # Google Sheets client
│   │   ├── operations.ts      # Low-level Sheets operations
│   │   ├── products.repository.ts
│   │   ├── clients.repository.ts
│   │   ├── orders.repository.ts
│   │   ├── order-items.repository.ts
│   │   ├── payments.repository.ts
│   │   ├── order-comments.repository.ts
│   │   ├── users.repository.ts
│   │   └── audit-log.repository.ts
│   ├── services/
│   │   ├── order.service.ts   # Order business logic
│   │   ├── payment.service.ts # Payment business logic
│   │   └── init.service.ts    # Database initialization
│   ├── telegram/
│   │   ├── bot.ts             # Bot initialization
│   │   ├── handlers.ts        # Main handler router
│   │   ├── keyboards.ts       # Inline keyboard builders
│   │   └── handlers/
│   │       ├── products.handler.ts
│   │       ├── orders.handler.ts
│   │       └── clients.handler.ts
│   ├── utils/
│   │   ├── helpers.ts         # Utility functions
│   │   └── validation.ts      # Zod schemas
│   └── index.ts               # Main entry point
├── .env.example               # Environment variables template
├── package.json
├── tsconfig.json
└── vercel.json               # Vercel configuration
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18 or higher
- Google Cloud account
- Telegram Bot Token
- Vercel account (for deployment)

### 2. Create Google Sheets Database

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Business Bot Database" or any name you prefer
3. The bot will automatically create the following sheets:
   - Users
   - Products
   - Clients
   - Orders
   - OrderItems
   - Payments
   - OrderComments
   - AuditLog

### 3. Set Up Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Give it a name like "telegram-bot"
   - Grant it "Editor" role
   - Create a JSON key and download it
5. Share your Google Sheet with the service account email (found in the JSON key)

### 4. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the instructions
3. Save the bot token you receive

### 5. Install Dependencies

```bash
npm install
```

### 6. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.vercel.app/api/webhook
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
LOW_STOCK_THRESHOLD=10
```

**Getting the Spreadsheet ID**: It's in the URL of your Google Sheet:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

### 7. Add Your First Admin User

You need to manually add your Telegram user to the Users sheet:

1. Open your Google Sheet
2. Go to the "Users" tab (it will be created on first run)
3. Add a row with your information:
   - Column A (userId): Your Telegram user ID (you can get this from [@userinfobot](https://t.me/userinfobot))
   - Column B (username): Your Telegram username
   - Column C (firstName): Your first name
   - Column D (lastName): Your last name
   - Column E (role): `ADMIN`
   - Column F (active): `true`
   - Column G (createdAt): Today's date in ISO format

## Development

Run the bot locally in polling mode:

```bash
npm run dev
```

This will start the bot and listen for updates. You can now chat with your bot on Telegram.

## Deployment to Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
vercel
```

Follow the prompts to deploy.

### 3. Set Environment Variables

In your Vercel dashboard, go to your project settings and add all environment variables from your `.env` file.

Alternatively, use the Vercel CLI:

```bash
vercel env add TELEGRAM_BOT_TOKEN
vercel env add GOOGLE_SHEETS_ID
# ... add all other variables
```

### 4. Set Webhook

After deployment, your webhook URL will be:
```
https://your-project.vercel.app/api/webhook
```

The bot will automatically set the webhook on first start, or you can manually set it:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-project.vercel.app/api/webhook"}'
```

## Usage

### User Roles

**Admin can:**
- Manage users
- Delete/cancel orders
- Edit historical orders
- Edit/delete payments
- All staff permissions

**Staff can:**
- Create orders
- Add comments
- Record payments
- Manage products
- Manage clients

### Main Features

#### Products
- Add new products
- Edit product details (name, SKU, price)
- Adjust stock levels
- View low stock warnings
- Soft delete products

#### Orders
- Create orders with multiple items
- Apply order-level discounts (percent or fixed)
- Add/edit/remove items
- Cancel orders (returns stock)
- View order history by status or client

#### Payments
- Add payments to orders
- Split payments across dates
- Multiple payment methods (cash, card, transfer)
- Automatic order status updates
- Overpayment tracking

#### Comments
- Staff can add notes to any order
- View comment history

## Database Schema

All data is stored in Google Sheets with the following structure:

- **Users**: userId, username, firstName, lastName, role, active, createdAt
- **Products**: productId, sku, name, defaultPrice, stockQty, active, createdAt, updatedAt
- **Clients**: clientId, name, phone, address, active, createdAt, updatedAt
- **Orders**: orderId, clientId, clientName, orderDate, status, discountType, discountValue, itemsTotal, discountAmount, orderTotal, totalPaid, balanceDue, createdBy, createdAt, updatedAt
- **OrderItems**: orderItemId, orderId, productId, productName, sku, qty, unitPrice, subtotal
- **Payments**: paymentId, orderId, amount, paymentDate, method, createdBy, createdAt
- **OrderComments**: commentId, orderId, text, createdBy, createdAt
- **AuditLog**: auditId, entityType, entityId, action, beforeData, afterData, performedBy, timestamp

## Architecture

### Layers

1. **Domain Layer** (`src/domain/`): Pure business logic and types
2. **Repository Layer** (`src/sheets/`): Data access using Google Sheets
3. **Service Layer** (`src/services/`): Business logic orchestration
4. **Telegram Layer** (`src/telegram/`): Bot handlers and keyboards
5. **API Layer** (`api/`): Vercel serverless functions

### Key Design Decisions

- **Stateless**: No local state, all data in Google Sheets
- **Idempotent**: Safe to retry operations
- **Append-friendly**: Google Sheets operations optimized for serverless
- **Audit Trail**: All critical changes logged
- **Stock Management**: Automatic inventory adjustments
- **Multi-part Payments**: Support for payment plans
- **Uzbek-first**: All UI text in Uzbek (Latin)

## Troubleshooting

### Bot not responding
1. Check that your bot token is correct
2. Verify the webhook is set correctly
3. Check Vercel logs for errors

### Google Sheets errors
1. Verify the service account email has edit access to the spreadsheet
2. Check that the spreadsheet ID is correct
3. Ensure the Google Sheets API is enabled in your Google Cloud project

### Permission errors
1. Make sure your user is added to the Users sheet
2. Verify your role is set correctly
3. Check that the `active` field is `true`

## Contributing

This is a production-ready template. Feel free to:
- Add new features
- Improve existing functionality
- Translate to other languages
- Extend the domain model

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
