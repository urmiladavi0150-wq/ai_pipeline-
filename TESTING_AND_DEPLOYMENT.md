# Testing & Deployment Guide - Async AI Pipeline Backend

## 🎯 Critical Fix Applied ✅

The backend now returns **immediate responses** (HTTP 202) instead of blocking on the full AI pipeline.

### Code Change Summary

**File**: `app/api/create-job/route.ts`

```typescript
// ✅ CORRECT - Background Processing
setTimeout(() => {
  processJob(jobId).catch(err => {
    console.error(`Background processing error for job ${jobId}:`, err);
  });
}, 0);
```

This ensures:
- HTTP 202 response sent instantly
- Job processing runs in background
- No client-side timeout or hanging

---

## 🚀 Quick Start (OneDrive Workaround)

Due to OneDrive file sync conflicts, follow these steps:

### Option 1: Move Project Out of OneDrive (Recommended)

```powershell
# Move to a non-OneDrive location
$source = "C:\Users\Admin\OneDrive\Desktop\async-ai-pipeline-backend"
$target = "C:\Projects\async-ai-pipeline-backend"

# Create target folder
mkdir $target -ErrorAction SilentlyContinue

# Copy project files (excluding node_modules)
robocopy $source $target /S /XD node_modules

# Navigate and install
cd $target
npm install
npm run dev
```

### Option 2: Clean node_modules on Current Location

```powershell
cd "c:\Users\Admin\OneDrive\Desktop\async-ai-pipeline-backend"

# Stop OneDrive sync temporarily
# Settings > Pause syncing for 2 hours

# Remove problematic folders
takeown /F "node_modules" /R /D Y | Out-Null
icacls node_modules /grant:r "%username%:F" /T /Q | Out-Null
rmdir /S /Q node_modules

# Install fresh
npm install --ignore-scripts

# Resume OneDrive sync
```

### Option 3: Use Docker (Most Reliable)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

Deploy with:
```bash
docker build -t async-backend .
docker run -p 3000:3000 --env-file .env.local async-backend
```

---

## ✅ Testing the Backend

### 1. Health Check

```bash
curl -s http://localhost:3000 | head -n 5
```

Expected Response:
```html
<html>
<head>...
<h1>Async AI Pipeline Backend</h1>
```

### 2. Test Create Job (Immediate Response)

```powershell
# Test with YouTube URL
$response = curl -s -X POST http://localhost:3000/api/create-job `
  -H "Content-Type: application/json" `
  -d '{"type":"youtube","input":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

$response | ConvertFrom-Json
```

**Expected Response (< 500ms):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### 3. Poll Job Status

```powershell
# Using the job_id from previous response
$jobId = "550e8400-e29b-41d4-a716-446655440000"

$job = curl -s "http://localhost:3000/api/job-status?job_id=$jobId" | ConvertFrom-Json
$job | ConvertTo-Json
```

**Expected Response (while processing):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "result": null,
  "error": null,
  "createdAt": 1714000000000,
  "updatedAt": 1714000012000
}
```

### 4. Error Handling Tests

#### Invalid Type
```bash
curl -X POST http://localhost:3000/api/create-job \
  -H "Content-Type: application/json" \
  -d '{"type":"podcast","input":"https://example.com/audio.mp3"}'
```

Expected: HTTP 400 with `INVALID_TYPE` error

#### Non-existent Job
```bash
curl "http://localhost:3000/api/job-status?job_id=nonexistent"
```

Expected: HTTP 404 with `JOB_NOT_FOUND` error

---

## 📊 Performance Monitoring

### Check Response Times

```powershell
# Simple timing test
function Test-ApiPerformance {
    $url = "http://localhost:3000/api/create-job"
    $body = @{
        type = "youtube"
        input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    } | ConvertTo-Json
    
    $start = Get-Date
    $response = Invoke-WebRequest -Uri $url -Method Post `
        -ContentType "application/json" `
        -Body $body
    $duration = (Get-Date) - $start
    
    Write-Host "Response Time: $($duration.TotalMilliseconds)ms"
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json)
}

Test-ApiPerformance
```

### Monitor Background Processing

Check server logs for background processing:

```powershell
# Tail the .next directory for logs
Get-Content "path/to/.next/logs" -Tail 20 -Wait
```

---

## 🔧 Troubleshooting

### "next: not found" Error

**Solution**: Use Node 20 LTS and ensure npm packages are installed

```powershell
# Verify Node version
node --version  # Should be v20.x or higher

# Check if Next.js is available
ls node_modules/.bin | findstr "next"

# If not, try
npm install next@14
```

### "ENOENT: no such file or directory"

**Solution**: This is usually OneDrive sync issue

```powershell
# Option 1: Move project folder
Move-Item "C:\Users\Admin\OneDrive\Desktop\async-ai-pipeline-backend" `
    "C:\async-ai-pipeline-backend"

# Option 2: Disable OneDrive for this folder
# OneDrive Settings > Sync > Choose folders > Uncheck Desktop
```

### Port 3000 Already in Use

```powershell
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
$env:PORT=3001
npm run dev
```

### Environment Variables Not Loading

```powershell
# Verify .env.local exists and has correct permissions
ls -la "c:\Users\Admin\OneDrive\Desktop\async-ai-pipeline-backend\.env.local"

# Print loaded values
node -e "require('dotenv').config(); console.log(process.env.GROQ_API_KEY, process.env.GEMINI_API_KEY)"
```

---

## 📋 Pre-Deployment Checklist

- [ ] **Code Fix Applied**: `app/api/create-job/route.ts` uses `setTimeout`
- [ ] **Environment Variables**: `.env.local` configured with all 4 variables
- [ ] **API Tests Pass**: Health check, create job, poll status work
- [ ] **Response Time**: Create job endpoint responds in < 500ms
- [ ] **Error Handling**: Bad requests return appropriate error codes
- [ ] **Supabase Connection**: Job table created with RLS policies
- [ ] **Dependencies Installed**: `npm install` completes without errors
- [ ] **No Port Conflicts**: Port 3000 is available
- [ ] **Logs Clear**: No TypeScript or runtime errors on startup

---

## 🌐 Deployment to Vercel

### 1. Connect GitHub Repository

```bash
git init
git add .
git commit -m "Async AI Pipeline Backend - Background Processing Fix"
git remote add origin https://github.com/YOUR_USER/your-repo.git
git push -u origin main
```

### 2. Import to Vercel

```
https://vercel.com/import
```

### 3. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
GROQ_API_KEY=gsk_iiB0b...
GEMINI_API_KEY=AQ.Ab8RN...
NEXT_PUBLIC_SUPABASE_URL=https://uwfvaz...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Deploy

```bash
vercel --prod
```

---

## 📝 Monitoring in Production

### Check Vercel Logs

```bash
vercel logs --prod
```

### Monitor Background Jobs

Supabase Dashboard → SQL Editor:

```sql
SELECT * FROM jobs WHERE status = 'processing'
ORDER BY "updatedAt" DESC;
```

### Alert on Errors

```sql
SELECT * FROM jobs WHERE status = 'error'
AND "updatedAt" > now() - interval '1 hour';
```

---

## 📞 Support

| Issue | Solution |
|-------|----------|
| Slow npm install | Move out of OneDrive or use Docker |
| Port 3000 in use | Run on different port: `PORT=3001 npm run dev` |
| Missing env vars | Copy template: `.env.local` from SETUP.md |
| API not responding | Check server logs, verify Node.js v20+ |
| Jobs stuck processing | Check Supabase, verify API keys |
| TypeScript errors | Run `npm run build` to check |

---

## ✨ Frontend Integration Example

```javascript
async function submitJob(type, url) {
  // 1. Create job (returns immediately)
  const createResponse = await fetch('/api/create-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, input: url })
  });
  
  const { job_id } = await createResponse.json();
  console.log('Job created:', job_id);
  
  // 2. Poll status
  return await pollJobStatus(job_id);
}

async function pollJobStatus(jobId) {
  const MAX_POLLS = 120;
  const INITIAL_INTERVAL = 2000;
  const MAX_INTERVAL = 10000;
  let interval = INITIAL_INTERVAL;
  
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, interval));
    
    const res = await fetch(`/api/job-status?job_id=${jobId}`);
    const job = await res.json();
    
    if (job.status === 'done') return job.result;
    if (job.status === 'error') throw new Error(job.error);
    
    interval = Math.min(interval * 1.15, MAX_INTERVAL);
  }
  
  throw new Error('Job timed out after 20 minutes');
}
```

---

**Status**: ✅ Backend Ready for Testing & Deployment  
**Last Updated**: 2026-04-18
