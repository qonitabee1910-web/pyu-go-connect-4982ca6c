# Email Webhook Tracking - Setup & Management Guide

## Overview

The email webhook tracking system monitors email delivery events from Resend and SendGrid providers, automatically managing bounced/invalid emails, and providing detailed analytics on delivery performance.

## Features

### ✅ Core Features
- **Real-time Webhook Processing**: Automatically capture and process webhook events from email providers
- **Bounce Management**: Auto-blacklist hard-bounced emails to prevent sending to invalid addresses
- **Delivery Metrics**: Track delivery rates, bounce rates, open rates, and complaint rates
- **Event Logging**: Complete audit trail of all email events with provider details
- **Blacklist Management**: Manual override to blacklist/whitelist emails
- **Provider Support**: Works with Resend and SendGrid out of the box
- **Signature Verification**: Cryptographically verify webhook authenticity

---

## Setup Instructions

### Step 1: Database Migration

The migration `20260414000000_email_webhook_tracking.sql` creates:

1. **email_webhook_events** - Stores all webhook events from providers
2. **email_blacklist** - Maintains list of bounced/invalid emails
3. **email_webhook_config** - Stores webhook URLs and secrets
4. **email_delivery_metrics** - Daily delivery statistics
5. **Database Functions & Triggers**:
   - `add_bounce_to_blacklist()` - Automatically blacklist hard bounces
   - `log_webhook_event_to_email_logs()` - Link webhook events to email logs
   - `update_email_delivery_metrics()` - Recalculate daily metrics

**To deploy:**
```bash
npx supabase migration up
```

### Step 2: Deploy Edge Function

The edge function `handle-email-webhooks` processes incoming webhooks.

**Deploy:**
```bash
npx supabase functions deploy handle-email-webhooks
```

**Function URL:** `https://<project-id>.supabase.co/functions/v1/handle-email-webhooks`

### Step 3: Configure Email Providers

#### Resend Setup

1. Go to [Resend Dashboard](https://resend.com/webhooks)
2. Click "Create Webhook"
3. **Webhook URL:**
   ```
   https://<project-id>.supabase.co/functions/v1/handle-email-webhooks
   ```
4. **Events to subscribe:**
   - Email Sent
   - Email Delivered
   - Email Bounced
   - Email Complained
   - Email Opened
   - Email Clicked

5. Copy the **Signing Secret**
6. Go to Admin Panel → Email Webhook Tracking → Configuration tab
7. Find Resend entry and save the signing secret

#### SendGrid Setup

1. Go to [SendGrid Settings → Mail Send](https://app.sendgrid.com/settings/mail_send)
2. Click "Event Webhook" in the left menu
3. Enable Event Webhook
4. **Webhook URL:**
   ```
   https://<project-id>.supabase.co/functions/v1/handle-email-webhooks
   ```
5. **Select Events:**
   - Processed
   - Dropped
   - Delivered
   - Bounce
   - Complaint
   - Open
   - Click

6. Click "Test Your Integration" to verify
7. Copy the **Verification Key**
8. Go to Admin Panel → Email Webhook Tracking → Configuration tab
9. Find SendGrid entry and save the verification key

---

## How It Works

### Event Flow

```
1. Email Provider (Resend/SendGrid)
             ↓
2. Webhook POST to handle-email-webhooks
             ↓
3. Verify Signature (HMAC-SHA256)
             ↓
4. Parse Event (extract type, email, bounce info)
             ↓
5. Store in email_webhook_events
             ↓
6. Update email_logs with status
             ↓
7. Auto-blacklist if hard bounce
             ↓
8. Update daily metrics
```

### Event Types

| Event | Meaning | Action |
|-------|---------|--------|
| `sent` | Email accepted by provider | Log event |
| `delivered` | Email delivered to recipient | Log event |
| `bounced` | Email bounced (hard or soft) | Log event, auto-blacklist if hard |
| `complained` | Recipient marked as spam | Log event, auto-blacklist |
| `opened` | Email opened by recipient | Log event (engagement tracking) |
| `clicked` | Link clicked in email | Log event (engagement tracking) |
| `deferred` | Temporary delivery delay | Log event, retry later |

### Bounce Types

#### Permanent (Hard Bounce)
- Recipient address doesn't exist
- Account disabled
- Domain doesn't accept mail
- **Action:** Auto-blacklist immediately

#### Transient (Soft Bounce)
- Mailbox full
- Server temporarily unavailable
- Mail server rejected message
- **Action:** Retry later, don't blacklist

---

## Admin Dashboard Usage

### Webhook Events Tab

**View all webhook events:**
- Filter by event type (sent, delivered, bounced, etc.)
- Filter by provider (Resend, SendGrid)
- See complete event details with timestamps
- Track provider-specific bounce codes and messages

**Use cases:**
- Debug delivery issues
- Find which emails failed
- Monitor engagement (opens/clicks)
- Verify webhook integration

### Metrics Tab

**Delivery Metrics Chart (30-day trend):**
- Sent vs Delivered vs Bounced/Complaints
- Track improvement over time
- Identify patterns

**Event Distribution (last 100 events):**
- Pie chart showing event breakdown
- Visual representation of overall health

**Key Metrics Cards:**
- **Delivery Rate**: % of sent emails delivered
- **Bounce Rate**: % of sent emails bounced
- **Open Rate**: % of delivered emails opened
- **Blacklisted Emails**: Total invalid addresses

### Blacklist Tab

**View blacklisted emails:**
- Sort by date added
- See reason (hard_bounce, complaint, manual)
- View bounce subtype details
- See related webhook event

**Manage blacklist:**
- Add emails manually: Type email + click "Tambah ke Blacklist"
- Remove emails: Click trash icon (email will receive emails again)
- Search by email: Use browser search or scroll

**Pro Tips:**
- Regularly review blacklist to remove false positives
- Export blacklist to prevent sending to invalid addresses
- Monitor bounce_subtype for delivery issues (e.g., "Mailbox Quota Exceeded")

### Configuration Tab

**Webhook URLs:**
- Display configured webhook endpoints
- Copy and paste URLs to email providers
- Shows last test date and status

**Provider Status:**
- Green badge = Active
- Gray badge = Inactive
- Last test result and timestamp

---

## Common Issues & Solutions

### Issue: Webhooks not being received

**Solution:**
1. Verify webhook URL is correct in provider settings
2. Check function deployment: `npx supabase functions list`
3. Review function logs: `npx supabase functions get-logs handle-email-webhooks`
4. Ensure public access: Function should not require authentication

### Issue: Hard bounces not auto-blacklisting

**Solution:**
1. Check webhook event has correct `bounce_type: "permanent"`
2. Verify `add_bounce_to_blacklist()` trigger is enabled
3. Check email_blacklist table for entries
4. Review function logs for errors

### Issue: Signature verification failing

**Solution:**
1. Verify webhook secret is correct (copy-paste, check spaces)
2. Resend uses different signature format than SendGrid
3. Test webhook from provider dashboard
4. Check function logs for specific error

### Issue: Delivery rate appears low

**Solution:**
1. Check email provider configuration is working
2. Verify templates are properly configured
3. Look for provider-specific errors in logs
4. Check if emails are being sent (verify in email_logs)

---

## Best Practices

### 1. Monitor Bounce Rate
- Healthy bounce rate: < 2%
- Monitor bounce_subtype for delivery issues
- Set alerts for bounce rate > 5%

### 2. Regular Blacklist Maintenance
- Review blacklist monthly for false positives
- Remove manually added entries after fixing issues
- Document reasons for manual blacklists

### 3. Signature Verification
- Always verify webhook signatures
- Never disable signature verification in production
- Rotate secrets periodically

### 4. Error Handling
- Check error_message field for delivery failures
- Log provider-specific codes (e.g., bounce codes)
- Use metadata field for additional debugging info

### 5. Performance Optimization
- Indexes on email_log_id, event_type, created_at ensure fast queries
- Metrics table aggregation keeps dashboard responsive
- Archive old webhook events (keep last 90 days)

---

## API Reference

### Handle Email Webhooks Function

**Endpoint:** `POST /functions/v1/handle-email-webhooks`

**Resend Webhook Format:**
```json
{
  "type": "email.sent|email.delivered|email.bounced|email.complained|email.opened|email.clicked",
  "id": "message-id",
  "email": "recipient@example.com",
  "bounce_type": "hard|soft",
  "error_message": "Mailbox does not exist"
}
```

**SendGrid Event Format:**
```json
{
  "event": "sent|delivered|bounce|complaint|open|click",
  "email": "recipient@example.com",
  "type": "permanent|transient",
  "reason": "Mailbox does not exist",
  "message_id": "event-id"
}
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "event_type": "delivered",
      "email": "user@example.com",
      "stored": true
    }
  ]
}
```

### Database Queries

**Get recent bounce events:**
```sql
SELECT * FROM email_webhook_events
WHERE event_type = 'bounced'
ORDER BY created_at DESC
LIMIT 50;
```

**Get bounce rate (last 7 days):**
```sql
SELECT 
  COUNT(*) FILTER (WHERE event_type = 'bounced') as bounces,
  COUNT(*) FILTER (WHERE event_type = 'sent') as sent,
  ROUND(
    (COUNT(*) FILTER (WHERE event_type = 'bounced')::numeric / 
     COUNT(*) FILTER (WHERE event_type = 'sent')) * 100, 2
  ) as bounce_rate
FROM email_webhook_events
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Find user's bounce history:**
```sql
SELECT 
  ewl.id,
  ewl.event_type,
  ewl.bounce_type,
  ewl.bounce_subtype,
  ewl.created_at
FROM email_logs el
JOIN email_webhook_events ewl ON el.id = ewl.email_log_id
WHERE el.recipient_id = 'user-uuid'
ORDER BY ewl.created_at DESC;
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Delivery Rate** (should be > 95%)
   - Alert if < 90% for 24 hours
   - Investigate causes (provider issues, invalid addresses)

2. **Bounce Rate** (should be < 2%)
   - Hard bounces indicate list quality issues
   - Soft bounces are temporary (retry later)

3. **Complaint Rate** (should be < 0.1%)
   - High complaints indicate content issues
   - May affect deliverability with provider

4. **Open Rate** (industry average 15-25%)
   - Indicates email content quality and engagement
   - Subject lines impact open rates

### Suggested Alert Rules

```
- IF bounce_rate > 5% FOR 6 HOURS → Notify ops
- IF delivery_rate < 90% FOR 1 HOUR → Critical alert
- IF complaint_rate > 0.5% FOR 24 HOURS → Review email content
- IF webhook_events NOT received FOR 30 MINUTES → Check provider status
```

---

## Troubleshooting & Support

### Enable Debug Logging

Add to edge function:
```typescript
console.log("Webhook event received:", event);
console.log("Signature verification:", isValid);
console.log("Blacklist check:", isBlacklisted);
```

View logs:
```bash
npx supabase functions get-logs handle-email-webhooks --tail
```

### Test Webhook Locally

Use provider dashboard "Test" button or curl:

```bash
curl -X POST https://PROJECT.supabase.co/functions/v1/handle-email-webhooks \
  -H "Content-Type: application/json" \
  -H "x-resend-signature: XXX" \
  -d '{
    "type": "email.bounced",
    "id": "123",
    "email": "test@example.com",
    "bounce_type": "permanent",
    "error_message": "Mailbox does not exist"
  }'
```

---

## Future Enhancements

1. **Webhook Retries**: Automatic retry logic for failed webhook deliveries
2. **Event Aggregation**: Batch process events for performance
3. **Custom Alerts**: Admin-configurable alerts for specific bounce types
4. **Integration with Email Provider APIs**: Direct API calls to verify delivery
5. **Machine Learning**: Predict bounce risk before sending
6. **Advanced Analytics**: Cohort analysis, A/B testing helpers

---

## Version History

- **v1.0** (2026-04-14): Initial release with Resend & SendGrid support, auto-blacklist, metrics
