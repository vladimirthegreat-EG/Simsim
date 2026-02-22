# Vercel Deployment Setup - SIMSIM Caliber V2

## Environment Variables for Vercel

Add these environment variables in your Vercel project settings:

### 1. Database Connection (Supabase)

**DATABASE_URL** (Production, Preview, Development)
```
postgresql://postgres.ychwvtxvbkkbsietytci:Flex@labs2002@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**DIRECT_URL** (Production, Preview, Development)
```
postgresql://postgres.ychwvtxvbkkbsietytci:Flex@labs2002@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

### 2. Supabase Client (Frontend)

**NEXT_PUBLIC_SUPABASE_URL** (Production, Preview, Development)
```
https://ychwvtxvbkkbsietytci.supabase.co
```

**NEXT_PUBLIC_SUPABASE_ANON_KEY** (Production, Preview, Development)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaHd2dHh2YmtrYnNpZXR5dGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTQ5MzEsImV4cCI6MjA4Njk5MDkzMX0.eO7FbdKGYEgKnbxXJlszTvfe5TZ4_-EdqYjuY66PgWs
```

---

## Steps to Deploy:

### Option 1: Via Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project: SIMSIM-Caliber-V2

2. **Add Environment Variables**
   - Go to **Settings** → **Environment Variables**
   - Add all 4 variables listed above
   - Select all environments: Production, Preview, Development
   - Click **Save**

3. **Deploy**
   - Push to GitHub main branch, or
   - Click **Deployments** → **Redeploy**

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Link to your project
cd ~/Desktop/Simsim
vercel link

# Add environment variables
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

vercel env add DIRECT_URL production
vercel env add DIRECT_URL preview
vercel env add DIRECT_URL development

vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

# Deploy
vercel --prod
```

---

## Database Schema

The database schema has already been pushed to Supabase with these tables:

✅ **Facilitator** - Game facilitators/admins
✅ **Game** - Game sessions with join codes
✅ **Team** - Player teams
✅ **Round** - Game rounds
✅ **TeamDecision** - Player decisions
✅ **RoundResult** - Round results and metrics
✅ **Achievement** - Available achievements
✅ **TeamAchievement** - Earned achievements
✅ **AchievementProgress** - Achievement progress tracking

---

## Verify Deployment

1. **Check Database Connection**
   - Vercel → Deployments → Latest → View Logs
   - Look for Prisma connection success

2. **Test the App**
   - Visit your Vercel URL
   - Try creating a game session
   - Check Supabase Table Editor to verify data

---

## Troubleshooting

### Build Errors
- Check Vercel build logs
- Ensure all environment variables are set
- Verify database connection strings

### Database Connection Issues
- Confirm password is correct
- Check that DATABASE_URL has `?pgbouncer=true`
- Ensure region is `eu-central-1`

### Prisma Errors
- The build script automatically runs: `prisma generate && prisma db push`
- If needed, manually run: `npx prisma db push` locally first
