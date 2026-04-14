# Email Webhook Tracking - Quick Reference

## 🚀 Deploy Checklist

```bash
# 1. Run database migration
npx supabase migration up

# 2. Deploy edge function
npx supabase functions deploy handle-email-webhooks

# 3. Check deployment
npx supabase functions list
npx supabase functions get-logs handle-email-webhooks --tail

# 4. Test development version (optional)
npm run dev
# Navigate to Admin > Webhook Events
```

## 📋 Provider Setup (5 minutes each)

### Resend
1. Login to https://resend.com/webhooks
2. Click "Create Webhook"
3. Paste webhook URL:
   ```
   https://[PROJECT-ID].supabase.co/functions/v1/handle-email-webhooks
   ```
4. Select events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`
5. Copy signing secret
6. Save to Admin Dashboard under Configuration tab

### SendGrid  
1. Login to https://app.sendgrid.com/settings/mail_send
2. Click "Event Webhook" → Enable
3. Paste webhook URL (same as above)
4. Select events: `processed`, `dropped`, `delivered`, `bounce`, `complaint`, `open`, `click`
5. Copy verification key
6. Save to Admin Dashboard under Configuration tab

---

## 📊 Admin Dashboard Quick Guide

### Webhook Events Tab
```
Filter by:
- event_type: sent, delivered, bounced, complained, opened, clicked
- provider: resend, sendgrid

Columns:
- Event [Badge color codes: green=delivered, red=bounced]
- Email [sortable, filterable]
- Provider [Resend/SendGrid badge]
- Status [bounce_type + error_message if applicable]
- Timestamp [local timezone]
```

**Common Actions:**
- Find a bounced email: Filter by event_type = "bounced"
- Check provider status: Filter by provider
- Monitor latest events: Table sorted by created_at DESC

### Metrics Tab
```
Key Metrics Cards:
- Delivery Rate: % of sent emails delivered (target: >95%)
- Bounce Rate: % of sent emails bounced (target: <2%)  
- Open Rate: % of delivered emails opened (target: 15-25%)
- Blacklist Size: Total emails auto-blacklisted

Charts:
- 30-day trend: See delivery patterns over time
- Event distribution: Pie chart of all events
```

**Common Actions:**
- Check health: Delivery Rate card
- Monitor bounce trend: Look for spike in bounce chart
- Track engagement: Watch open rate trend

### Blacklist Tab
```
Actions:
1. Add manually: Input email + "Tambah ke Blacklist" button
2. Remove: Click trash icon on any row
3. Filter: Use browser search (Ctrl+F)

Columns show:
- Email [searchable]
- Reason [hard_bounce, complaint, manual]
- Type [permanent/transient]
- Date added
```

**Common Actions:**
- Bulk add: Copy list of emails, add one by one
- Remove false positives: If email now valid, click trash
- Review growth: Check if blacklist growing too fast (bounce problem)

### Configuration Tab
```
Shows:
- Provider [Resend, SendGrid]
- Webhook URL [Copy button for easy setup]
- Active status [green = active, gray = inactive]
- Last test [date + success/failed]
```

**Common Actions:**
- Setup provider: Copy URL from Configuration tab
- Verify connectivity: Provider dashboard should show "last test: success"
- Troubleshoot: Log function errors with `npx supabase functions get-logs`

---

## 🧪 Testing

### Test Webhook Manually
```bash
# Test with Resend format
curl -X POST https://[PROJECT].supabase.co/functions/v1/handle-email-webhooks \
  -H 'Content-Type: application/json' \
  -H 'x-resend-signature: test' \
  -d '{
    "type": "email.bounced",
    "id": "test-123",
    "email": "test@example.com",
    "bounce_type": "permanent",
    "error_message": "Mailbox does not exist"
  }'

# Should return:
# {"success": true, "events": [...]}
```

### Test Email Sending
```bash
# In send-email function, test blacklist check
curl -X POST https://[PROJECT].supabase.co/functions/v1/send-email \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "blacklisted@example.com",
    "template_type": "welcome_user",
    "variables": {"full_name": "Test User"}
  }'

# Should return 400:
# {"error": "Email address is blacklisted", "logged": true}
```

### View Provider Webhooks
```bash
# Resend: https://resend.com/webhooks → View recent deliveries
# SendGrid: https://app.sendgrid.com/settings/mail_send → View logs

# Check timestamp: "last_action" time should match recent email sends
```

---

## 🔧 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| **Webhooks not received** | 1. Verify URL in provider settings<br/>2. Check function logs: `npx supabase functions get-logs`<br/>3. Resend/SendGrid need 2-3 seconds to send webhooks |
| **Bounces not auto-blacklisting** | 1. Check bounce_type = "permanent" in event<br/>2. Verify trigger exists: `SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_add_bounce_to_blacklist'`<br/>3. Check blacklist table: `SELECT COUNT(*) FROM email_blacklist;` |
| **Admin dashboard empty** | 1. Send test emails first<br/>2. Wait for webhook events to arrive<br/>3. Refresh dashboard (Ctrl+F5)<br/>4. Check database directly: `SELECT COUNT(*) FROM email_webhook_events;` |
| **Signature verification failing** | 1. Copy webhook secret exactly (no spaces)<br/>2. Confirm Resend uses x-resend-signature header<br/>3. Confirm SendGrid uses x-sendgrid-signature header<br/>4. Check logs: "Invalid signature" error |
| **High bounce rate** | 1. Check bounce_subtype pattern<br/>2. If "Mailbox Full" - retry later<br/>3. If "Invalid Address" - clean list<br/>4. Review bounce reasons in webhook events |

---

## 📈 Monitoring Commands

```bash
# Check webhook function health
npx supabase functions get-logs handle-email-webhooks --limit=50

# Count webhook events received
npx supabase query --db < << 'EOF'
SELECT 
  event_type, 
  COUNT(*) as count,
  MAX(created_at) as last_received
FROM email_webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;
EOF

# Find most recent bounces
npx supabase query --db << 'EOF'
SELECT 
  recipient_email,
  bounce_type,
  bounce_subtype,
  error_message,
  created_at
FROM email_webhook_events
WHERE event_type = 'bounced'
ORDER BY created_at DESC
LIMIT 20;
EOF

# Check blacklist growth  
npx supabase query --db << 'EOF'
SELECT 
  DATE(created_at) as day,
  COUNT(*) as new_blacklist_entries
FROM email_blacklist
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
EOF

# Verify metrics update
npx supabase query --db << 'EOF'
SELECT 
  metric_date,
  total_sent,
  total_delivered,
  delivery_rate,
  bounce_rate
FROM email_delivery_metrics
ORDER BY metric_date DESC
LIMIT 10;
EOF
```

---

## 🛡️ Security Checklist

```
☐ Webhook secrets are securely stored in email_webhook_config
☐ HMAC-SHA256 signatures verified on every webhook
☐ RLS policies restrict blacklist view to admins
☐ Email logs only show events for user's own emails
☐ No webhook secrets stored in frontend code
☐ Edge function uses service role for database access
☐ Webhooks only processed from provider IPs (optional)
☐ Signed webhook events cannot be tampered with
☐ Rate limiting configured on edge function (optional)
```

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `migrations/20260414000000_email_webhook_tracking.sql` | Database schema |
| `functions/handle-email-webhooks/index.ts` | Webhook processor |
| `functions/send-email/index.ts` | Blacklist check added here |
| `pages/admin/EmailWebhookTracking.tsx` | Dashboard UI |
| `pages/admin/AdminLayout.tsx` | Navigation menu |
| `App.tsx` | Route `/admin/email-webhook-tracking` |
| `WEBHOOK_TRACKING_GUIDE.md` | Full documentation |
| `WEBHOOK_ARCHITECTURE.md` | System design |

---

## 💡 Pro Tips

### 1. Monitor Bounce Patterns
```sql
-- Query to find bounce patterns
SELECT 
  bounce_subtype,
  COUNT(*) as count
FROM email_webhook_events 
WHERE event_type = 'bounced'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY bounce_subtype
ORDER BY count DESC;
```

### 2. Check Sending Performance
```sql
-- Emails sent vs delivered
SELECT 
  DATE(created_at) as day,
  COUNT(*) FILTER (WHERE event_type='sent') as sent,
  COUNT(*) FILTER (WHERE event_type='delivered') as delivered,
  COUNT(*) FILTER (WHERE event_type='bounced') as bounced
FROM email_webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day;
```

### 3. Auto-Recovery for False Positives
```sql
-- If need to remove from blacklist (careful!)
DELETE FROM email_blacklist 
WHERE email = 'user@example.com'
RETURNING *;
```

### 4. Archive Old Webhook Events
```sql
-- Move events older than 90 days (optional)
-- First create archive table, then:
INSERT INTO email_webhook_events_archive 
SELECT * FROM email_webhook_events 
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM email_webhook_events 
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## ❓ FAQ

**Q: Why isn't my email blacklisting automatically?**  
A: Only hard bounces (bounce_type = "permanent") auto-blacklist. Soft bounces (full mailbox, temp server issues) are not blacklisted.

**Q: Can I remove emails from blacklist?**  
A: Yes! Click the trash icon in Blacklist tab. Email will receive messages again.

**Q: How often are metrics updated?**  
A: Metrics are calculated when webhook event received. Dashboard updates in real-time.

**Q: What if we switch email providers?**  
A: All webhook events are provider-agnostic. Switch providers in send-email config without losing history.

**Q: Can we batch-blacklist emails?**  
A: From database query yes. From dashboard - add one at a time (or import via SQL).

**Q: How long are webhook events kept?**  
A: Indefinitely by default. Archive events > 90 days for performance.

**Q: Is there an API to check if email is blacklisted?**  
A: Query directly: `SELECT EXISTS(SELECT 1 FROM email_blacklist WHERE email = ?)`

---

## 📞 Support Workflow

**Step 1: Check Logs**
```bash
npx supabase functions get-logs handle-email-webhooks --tail
```

**Step 2: Verify Database**
```bash
# Check webhook events exist
SELECT COUNT(*) FROM email_webhook_events WHERE created_at > NOW() - INTERVAL '1 hour'
```

**Step 3: Check Provider**
```
- Resend: https://resend.com/webhooks
- SendGrid: https://app.sendgrid.com/settings/mail_send
```

**Step 4: Verify Configuration**
```bash
# Confirm secrets stored
SELECT provider, webhook_url, is_active FROM email_webhook_config;
```

---

**Last Updated:** April 14, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
