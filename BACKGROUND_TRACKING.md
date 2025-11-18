# TowRadar Background Incident Tracking Setup

This guide explains how to set up automated incident tracking that runs independently of the website being open.

## Option 1: Vercel Cron Jobs (Recommended for Production)

When deployed to Vercel, the `vercel.json` configuration automatically sets up cron jobs:

- **Incident Ingestion**: Runs every 15 minutes (`*/15 * * * *`)
- **Notifications**: Runs every 15 minutes (`*/15 * * * *`)

These will call:
- `/api/ingest` - Fetches new incidents from NC DOT
- `/api/notify` - Sends alerts to companies for new incidents

**Setup:**
1. Deploy to Vercel
2. Set environment variable `CRON_SECRET` in Vercel dashboard
3. Cron jobs will automatically start running

## Option 2: External Cron Service (EasyCron, cron-job.org, etc.)

Set up two recurring jobs:

### Ingest Job (Every 15 minutes)
```bash
curl -X POST https://your-domain.com/api/ingest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Notify Job (Every 15 minutes)
```bash
curl -X POST https://your-domain.com/api/notify \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Option 3: Server Cron (Linux/Unix)

Add to crontab (`crontab -e`):

```cron
# TowRadar - Ingest incidents every 15 minutes
*/15 * * * * curl -X POST https://your-domain.com/api/ingest -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/towradar-ingest.log 2>&1

# TowRadar - Send notifications every 15 minutes
*/15 * * * * curl -X POST https://your-domain.com/api/notify -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/towradar-notify.log 2>&1
```

## Option 4: Windows Task Scheduler

Create a PowerShell script `ingest-incidents.ps1`:

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_CRON_SECRET"
}

try {
    $response = Invoke-RestMethod -Uri "https://your-domain.com/api/ingest" -Method Post -Headers $headers
    Write-Output "$(Get-Date): Ingest successful - $($response | ConvertTo-Json)"
} catch {
    Write-Error "$(Get-Date): Ingest failed - $_"
}
```

Then schedule it in Task Scheduler to run every 15 minutes.

## Testing Locally

Test the endpoints manually:

```bash
# Test ingestion
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer your-cron-secret-here"

# Test notifications
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer your-cron-secret-here"
```

## Environment Variables Required

Make sure these are set in your environment (`.env.local` or hosting platform):

```env
CRON_SECRET=your-strong-cron-secret-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Monitoring

Check logs to verify cron jobs are running:
- Look for "NC TIMS Mecklenburg returned: X items" in logs
- Monitor the `incidents` table in Supabase
- Check `company_incident_notifications` table for sent alerts

## Troubleshooting

**Jobs not running:**
- Verify `CRON_SECRET` is set correctly
- Check authorization header matches secret
- Ensure endpoints return 200 status

**No incidents appearing:**
- Check NC DOT API is responding
- Verify `fetchCharlotteIncidents()` returns data
- Check Supabase connection and table permissions

**Alerts not sending:**
- Verify companies exist in database
- Check company `radius_km` covers incident locations
- Ensure email/SMS credentials are configured
