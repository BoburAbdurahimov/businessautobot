# Telegram Business Bot - Quick Start Guide

## Step-by-Step Setup

### 1. Google Sheets Setup

1. Create a new Google Spreadsheet
2. Note the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`

### 2. Google Service Account Setup

1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Enable Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: `telegram-business-bot`
   - Click "Create and Continue"
   - Role: Select "Editor"
   - Click "Continue" then "Done"
5. Create Key:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON"
   - Download the file
6. Share your Google Sheet:
   - Open your Google Sheet
   - Click "Share"
   - Add the service account email (from the JSON file)
   - Give "Editor" permissions

### 3. Telegram Bot Setup

1. Message @BotFather on Telegram
2. Send: `/newbot`
3. Follow prompts to create your bot
4. Copy the token you receive    

### 4. Get Your Telegram User ID

1. Message @userinfobot on Telegram   1223819877
2. Copy your user ID number

### 5. Local Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
# - TELEGRAM_BOT_TOKEN: from BotFather
# - GOOGLE_SHEETS_ID: from your spreadsheet URL
# - GOOGLE_SERVICE_ACCOUNT_EMAIL: from JSON key file
# - GOOGLE_PRIVATE_KEY: from JSON key file (copy the entire key including headers)
# - Leave TELEGRAM_WEBHOOK_URL empty for local development
```

### 6. Add Yourself as Admin

The bot will create all sheets automatically. After first run:

1. Open your Google Sheet
2. Go to the "Users" tab
3. Add a row (if headers exist, add to row 2):
   - Column A: Your Telegram user ID
   - Column B: Your username (optional)
   - Column C: Your first name
   - Column D: Your last name (optional)
   - Column E: `ADMIN`
   - Column F: `true`
   - Column G: Current date/time in ISO format (e.g., `2026-01-19T22:00:00Z`)

### 7. Run Locally

```bash
npm run dev
```

You should see:
```
Starting Telegram Business Bot...
Initializing database...
Database initialized successfully
Running in polling mode
Bot is ready!
```

### 8. Test the Bot

1. Open Telegram
2. Find your bot (search for the username you set)
3. Send: `/start`
4. You should see the main menu!

### 9. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts
```

After deployment:

1. Go to your Vercel project dashboard
2. Go to Settings > Environment Variables
3. Add all variables from your .env file
4. Redeploy

5. Update your .env TELEGRAM_WEBHOOK_URL to:
   `https://your-project.vercel.app/api/webhook`

6. The bot will automatically set the webhook

### Common Issues

**"Bot not responding"**
- Check your bot token is correct
- Make sure you added yourself to Users sheet
- Verify you set active=true

**"Google Sheets error"**
- Verify service account email has access to the sheet
- Check the sheet ID is correct
- Ensure Google Sheets API is enabled

**"Permission denied"**
- Make sure your role is set to ADMIN
- Check active=true in Users sheet

## What to Do Next

1. **Add Products**: Use the bot to add your first products
2. **Add Clients**: Add your customers
3. **Create Orders**: Test the order flow
4. **Add Staff**: Add team members with STAFF role
5. **Set Low Stock Alert**: Adjust LOW_STOCK_THRESHOLD in .env

## Sample Test Data

After setup, try creating:

### Sample Product
- SKU: `APPLE001`
- Name: `Olma`
- Price: `5000`
- Stock: `100`

### Sample Client
- Name: `Anvar Aliyev`
- Phone: `+998901234567`
- Address: `Toshkent`

### Sample Order
1. Select client: Anvar Aliyev
2. Add product: Olma, qty: 10
3. Apply discount: 10% percent
4. Confirm

### Sample Payment
1. Select order
2. Add payment: 40000 so'm
3. Method: Cash
4. Date: Today

Enjoy managing your business with Telegram! 🚀
