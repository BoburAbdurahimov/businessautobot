# Simple Deployment Guide

Follow these exact steps to deploy your bot.

## Step 1: Link Project
Run this command in your terminal:
```bash
vercel
```
- Select `Y` to set up
- Which scope? Select your account
- Link to existing project? `N`
- Project Name? Press Enter (accept default)
- In which directory? Press Enter (accept default `./`)

## Step 2: Add Secrets
You need to add your tokens to Vercel. Run these lines one by one and paste your values when prompted:

```bash
vercel env add TELEGRAM_BOT_TOKEN
# Paste your bot token
```

```bash
vercel env add GOOGLE_SHEETS_SPREADSHEET_ID
# Paste spreadsheet ID
```

```bash
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# Paste service email
```

```bash
vercel env add GOOGLE_PRIVATE_KEY
# Paste the ENTIRE private key (including BEGIN/END lines)
```

## Step 3: Deploy
Push the code to production:
```bash
vercel --prod
```
- It will give you a URL like `https://telegram-business-bot-xyz.vercel.app`

## Step 4: Connect Telegram
Tell Telegram where your bot lives. Replace `<YOUR_URL>` with the URL you got in Step 3:

```bash
# Example: https://telegram-business-bot-xyz.vercel.app/api/telegram
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram"
```
