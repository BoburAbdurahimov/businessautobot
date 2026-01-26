# Vercel Deployment Guide

Complete guide for deploying the Telegram Business Bot to Vercel.

---

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **Telegram Bot Token**: Create bot via @BotFather
3. **Google Sheets**: Spreadsheet with service account access
4. **Node.js**: v18+ installed locally

---

## Environment Variables

### Required Variables

Configure these in Vercel dashboard or via CLI:

#### 1. `TELEGRAM_BOT_TOKEN`
**Description**: Your Telegram bot token from BotFather  
**Example**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`  
**How to get**:
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow instructions
4. Copy the token

#### 2. `TELEGRAM_WEBHOOK_SECRET` (Optional but Recommended)
**Description**: Secret token to verify webhook requests  
**Example**: `my-super-secret-webhook-token-12345`  
**How to set**:
- Generate a random string (20+ characters)
- Keep it secret!
- Used to prevent unauthorized webhook calls

#### 3. `GOOGLE_SHEETS_SPREADSHEET_ID`
**Description**: ID of your Google Sheets spreadsheet  
**Example**: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`  
**How to get**:
- Open your Google Sheet
- Look at the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
- Copy the ID between `/d/` and `/edit`

#### 4. `GOOGLE_SERVICE_ACCOUNT_EMAIL`
**Description**: Email of the service account with Sheets access  
**Example**: `bot-service@project-id.iam.gserviceaccount.com`  
**How to get**:
1. Go to Google Cloud Console
2. Create a service account
3. Copy the email address
4. Share your Google Sheet with this email (Editor access)

#### 5. `GOOGLE_PRIVATE_KEY`
**Description**: Private key from service account JSON  
**Important**: Handle newline escaping properly!  
**Format**:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG...
...your key here...
...VeryLongString=
-----END PRIVATE KEY-----
```

**How to set** (Critical!):

Option A - Via Vercel CLI:
```bash
# The key must be in quotes and newlines as \n
vercel env add GOOGLE_PRIVATE_KEY

# When prompted, paste your key with actual newlines, then press Enter
# Vercel will handle the escaping
```

Option B - Via Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add `GOOGLE_PRIVATE_KEY`
3. Paste the ENTIRE key including headers
4. Vercel automatically handles newlines

Option C - In `.env` (local development):
```bash
# Replace actual newlines with \n
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG...\n...VeryLongString=\n-----END PRIVATE KEY-----\n"
```

**Common Issues**:
- ❌ Missing `\n` → Key won't parse
- ❌ Extra spaces → Key invalid
- ❌ Missing quotes → Breaks on newlines
- ✅ Use Vercel CLI or Dashboard for easiest setup

#### 6. `LOW_STOCK_THRESHOLD` (Optional)
**Description**: When to show low stock warnings  
**Default**: `10`  
**Example**: `5`

---

## Deployment Steps

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

###Step 3: Set Environment Variables

**Option A - Interactive** (Recommended):
```bash
vercel env add TELEGRAM_BOT_TOKEN
# Paste your token when prompted

vercel env add TELEGRAM_WEBHOOK_SECRET
# Paste your webhook secret

vercel env add GOOGLE_SHEETS_SPREADSHEET_ID
# Paste spreadsheet ID

vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
# Paste service account email

vercel env add GOOGLE_PRIVATE_KEY
# Paste the ENTIRE private key (with headers and newlines)

vercel env add LOW_STOCK_THRESHOLD
# Enter: 10
```

**Option B - Via Dashboard**:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above

### Step 4: Deploy

```bash
# From project root directory
cd C:\Users\user\.gemini\antigravity\scratch\telegram-business-bot

# Deploy to Vercel
vercel

# Follow prompts:
# - Link to existing project? → No
# - Project name? → telegram-business-bot
# - Directory? → ./
```

### Step 5: Note Your Webhook URL

After deployment, Vercel will give you a URL like:
```
https://telegram-business-bot-abc123.vercel.app
```

Your webhook endpoint is:
```
https://telegram-business-bot-abc123.vercel.app/api/telegram
```

---

## Set Telegram Webhook

### Method 1: Using curl

```bash
# Replace with your actual values
export BOT_TOKEN="your_bot_token_here"
export WEBHOOK_URL="https://your-project.vercel.app/api/telegram"
export WEBHOOK_SECRET="your_webhook_secret_here"

# Set webhook WITH secret (recommended)
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"secret_token\":\"${WEBHOOK_SECRET}\"}"

# Or WITHOUT secret
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\"}"
```

### Method 2: Using Browser

Visit this URL (replace placeholders):
```
https://api.telegram.org/bot8166980392:AAFkI1-UyRThz-IZ8eexLYxC65_xFrKfZGU/setWebhook?url=https://businessautobot-vbre-qn5c931pv-boburs-projects-05777480.vercel.app/api/telegram&secret_token=secret123
```

Example:
```
https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://mybot.vercel.app/api/telegram&secret_token=mysecret123
```

### Method 3: Using Script

Create `scripts/set-webhook.sh`:
```bash
#!/bin/bash

BOT_TOKEN="your_token_here"
WEBHOOK_URL="https://your-project.vercel.app/api/telegram"
WEBHOOK_SECRET="your_secret_here"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"secret_token\":\"${WEBHOOK_SECRET}\"}"
```

Run:
```bash
chmod +x scripts/set-webhook.sh
./scripts/set-webhook.sh
```

---

## Verify Deployment

### 1. Check Webhook Status

```bash
curl "https://api.telegram.org/bot8166980392:AAFkI1-UyRThz-IZ8eexLYxC65_xFrKfZGU/getWebhookInfo"
```

Should return:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-project.vercel.app/api/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

### 2. Test Bot

1. Open Telegram
2. Find your bot (search for username)
3. Send `/start`
4. Should receive welcome message

### 3. Check Vercel Logs

```bash
# View logs
vercel logs

# Or in dashboard
# https://vercel.com/your-project/deployments → Click deployment → View Logs
```

---

## Troubleshooting

### Bot Not Responding

**1. Check webhook is set**:
```bash
curl "https://api.telegram.org/bot8166980392:AAFkI1-UyRThz-IZ8eexLYxC65_xFrKfZGU/getWebhookInfo"

```

**2. Check Vercel logs**:
```bash
vercel logs --follow
```

**3. Test endpoint directly**:
```bash
curl https://your-project.vercel.app/api/telegram
# Should return: {"error":"Method not allowed"}
```

### "Cannot find module" Errors

**Problem**: TypeScript not compiled

**Solution**:
```bash
# Build locally first
npm run build

# Then deploy
vercel
```

### Google Sheets Errors

**1. Check service account has access**:
- Open your Google Sheet
- Click "Share"
- Verify service account email is listed
- Permission should be "Editor"

**2. Check private key**:
```bash
# Test locally
npm run dev
# If works locally, issue is with Vercel env var
```

**3. Re-add private key**:
```bash
# Remove old one
vercel env rm GOOGLE PRIVATE_KEY

# Add again (carefully!)
vercel env add GOOGLE_PRIVATE_KEY
```

### Webhook Secret Mismatch

**Error**: 403 Forbidden

**Solution**:
```bash
# Remove old webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Set again with correct secret
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=<WEBHOOK_URL>&secret_token=<SECRET>"
```

---

## Production Deployment

### Custom Domain (Optional)

1. Go to Vercel dashboard
2. Project Settings → Domains
3. Add your domain: `bot.yourdomain.com`
4. Update webhook:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://bot.yourdomain.com/api/telegram"
```

### Monitoring

**Vercel Analytics**:
- Automatic in dashboard
- View requests, errors, performance

**Telegram Webhook Info**:
```bash
# Check regularly
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

**Google Sheets Quota**:
- Free tier: 100 requests per 100 seconds
- Monitor in Google Cloud Console

---

## Update Deployment

```bash
# Make changes to code
git add .
git commit -m "Update bot"

# Deploy update
vercel --prod

# Webhook URL stays the same, no need to reset
```

---

## Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```

---

## Environment Variables Checklist

Before deploying, verify all variables are set:

```bash
# Check all env vars
vercel env ls

# Should show:
# ✅ TELEGRAM_BOT_TOKEN
# ✅ TELEGRAM_WEBHOOK_SECRET (optional)
# ✅ GOOGLE_SHEETS_SPREADSHEET_ID
# ✅ GOOGLE_SERVICE_ACCOUNT_EMAIL
# ✅ GOOGLE_PRIVATE_KEY
# ✅ LOW_STOCK_THRESHOLD
```

---

## Complete Deployment Script

Save as `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying Telegram Business Bot to Vercel"
echo "============================================="

# Build
echo "📦 Building..."
npm run build

# Deploy
echo "🌐 Deploying to Vercel..."
vercel --prod

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --prod | grep -oP 'https://[^\s]+' | head -1)

echo "✅ Deployed to: $DEPLOYMENT_URL"
echo "📍 Webhook URL: $DEPLOYMENT_URL/api/telegram"

# Optionally set webhook
read -p "Set Telegram webhook now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    read -p "Enter BOT_TOKEN: " BOT_TOKEN
    read -p "Enter WEBHOOK_SECRET (optional, press enter to skip): " WEBHOOK_SECRET
    
    if [ -z "$WEBHOOK_SECRET" ]
    then
        curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
          -d "url=${DEPLOYMENT_URL}/api/telegram"
    else
        curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
          -d "url=${DEPLOYMENT_URL}/api/telegram&secret_token=${WEBHOOK_SECRET}"
    fi
fi

echo "✅ Deployment complete!"
```

---

## Security Best Practices

1. ✅ **Use webhook secret** - Prevents unauthorized requests
2. ✅ **Keep private key secret** - Never commit to git
3. ✅ **Use environment variables** - Not hardcoded values
4. ✅ **Monitor logs** - Watch for suspicious activity
5. ✅ **Regular backups** - Export Google Sheets periodically

---

## Support

**Issues?**
- Check Vercel logs: `vercel logs`
- Check webhook info: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Review `QUICKSTART.md` for setup steps

**Questions?**
- Vercel docs: https://vercel.com/docs
- Telegram Bot API: https://core.telegram.org/bots/api

---

**Your bot is now live on Vercel!** 🎉

NextSteps:
1. Test all features
2. Monitor logs for errors
3. Add users to Users sheet
4. Start managing your business!
