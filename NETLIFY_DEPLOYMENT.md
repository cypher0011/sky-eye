# 🚀 Netlify Deployment Guide

## ❌ White Screen Problem - FIXED!

The white screen on Netlify is caused by:
1. **Missing SPA redirects** - React Router needs all routes to go to index.html
2. **Environment variables not set** - Mapbox token missing
3. **Build configuration issues** - Wrong build settings

## ✅ Files Created to Fix It

### 1. **netlify.toml** (Build Configuration)
```toml
[build]
  command = "npm run build"
  publish = "dist"
  environment = { NODE_VERSION = "18" }

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. **public/_redirects** (SPA Fallback)
```
/*    /index.html   200
```

### 3. **vite.config.ts** (Updated Build Config)
- Added proper base path
- Optimized chunk splitting
- Disabled sourcemaps for faster builds

---

## 🎯 Step-by-Step Deployment

### Step 1: Commit New Files
```bash
cd /Users/cute/Documents/sky-eye

git add netlify.toml
git add public/_redirects
git add vite.config.ts
git commit -m "Add Netlify configuration for deployment"
git push
```

### Step 2: Configure Netlify

#### If Deploying for First Time:
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Netlify will auto-detect settings from `netlify.toml`

#### Build Settings (Auto-detected):
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18

### Step 3: Add Environment Variables

**CRITICAL! This is why you see white screen!**

1. In Netlify dashboard, go to: **Site settings** → **Environment variables**
2. Click **Add a variable**
3. Add this:
   - **Key**: `VITE_MAPBOX_TOKEN`
   - **Value**: `pk.eyJ1IjoiaGdmZmNjZmQiLCJhIjoiY21qMWc5M3ptMGY0bDNkcjcyZDN3ZWUzdyJ9.PG6qZMQnm_u6waCVXY5DHA`
   - **Scopes**: ✓ All scopes

4. Click **Save**

### Step 4: Trigger Redeploy

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for build to complete (~2-3 minutes)

---

## 🐛 Troubleshooting

### Still White Screen After Deploy?

#### 1. Check Build Logs
- Go to **Deploys** tab
- Click on latest deploy
- Check build logs for errors

**Common errors:**
```bash
# Missing dependencies
npm ERR! missing: package-name

# Solution: Make sure package.json is committed
```

#### 2. Check Browser Console
- Open deployed site
- Press F12 → Console tab
- Look for errors

**Common errors:**
```
Failed to load resource: 404
# Means files aren't being found

Uncaught ReferenceError: import.meta is undefined
# Means environment variables not set
```

#### 3. Verify Environment Variables
- Go to Site settings → Environment variables
- Make sure `VITE_MAPBOX_TOKEN` is there
- If you added it AFTER deployment, redeploy!

#### 4. Check _redirects File
```bash
# Make sure it exists in dist after build
cat dist/_redirects

# Should show:
# /*    /index.html   200
```

#### 5. Clear Netlify Cache
```bash
# In Netlify dashboard
Deploys → Trigger deploy → Clear cache and deploy site
```

---

## 🔍 Verify Deployment Works

### What You Should See:

1. **Site loads** - No white screen!
2. **Login page** appears
3. **Console shows** (F12):
   ```
   Loading tile: 16 39562 26798
   ✅ Tile loaded successfully
   ```
4. **All routes work** - Refresh any page, no 404

### Test Checklist:

- [ ] Home page loads
- [ ] Can login (admin@skyeye.com / admin123)
- [ ] Dashboard appears
- [ ] 3D satellite map shows imagery (not white)
- [ ] 2D map displays
- [ ] Can generate scenarios
- [ ] Drones appear and move
- [ ] LiveFeed works
- [ ] Can refresh page without 404

---

## 📊 Expected Build Output

```bash
vite v5.1.4 building for production...
✓ 2891 modules transformed.
dist/index.html                    0.58 kB │ gzip:  0.34 kB
dist/assets/index-xxx.css        123.45 kB │ gzip: 12.34 kB
dist/assets/react-vendor-xxx.js  234.56 kB │ gzip: 78.90 kB
dist/assets/three-vendor-xxx.js  345.67 kB │ gzip: 89.01 kB
dist/assets/map-vendor-xxx.js    123.45 kB │ gzip: 34.56 kB
dist/assets/index-xxx.js         456.78 kB │ gzip: 123.45 kB
✓ built in 45.67s
```

---

## 🚀 Quick Fix Commands

### If you need to redeploy:
```bash
# 1. Make sure all files are committed
git status

# 2. Commit any changes
git add .
git commit -m "Fix Netlify deployment"
git push

# 3. Netlify will auto-deploy on push
```

### Local test before deploying:
```bash
# Build locally to test
npm run build

# Preview the build
npm run preview

# Open http://localhost:4173
# Should work exactly like production
```

---

## ⚙️ Environment Variables Needed

Add these in Netlify dashboard:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_MAPBOX_TOKEN` | Your Mapbox token | ✅ Yes |

**Where to add:**
1. Netlify Dashboard
2. Site settings
3. Environment variables
4. Add variable

**IMPORTANT:** After adding environment variables, you MUST redeploy!

---

## 📝 Common Issues & Solutions

### Issue 1: White Screen
**Cause:** Environment variables not set
**Solution:** Add `VITE_MAPBOX_TOKEN` in Netlify settings, then redeploy

### Issue 2: 404 on Refresh
**Cause:** SPA redirects not working
**Solution:** Make sure `public/_redirects` exists and is committed

### Issue 3: Build Fails
**Cause:** TypeScript errors or missing dependencies
**Solution:**
```bash
# Fix locally first
npm install
npm run build

# If it works locally, commit and push
git add .
git commit -m "Fix build errors"
git push
```

### Issue 4: Blank Map (White Tiles)
**Cause:** Mapbox token not loaded
**Solution:** Check environment variable is set, then redeploy

### Issue 5: Slow Load
**Cause:** Large bundle size
**Solution:** Already optimized with chunk splitting in vite.config.ts

---

## ✅ Deployment Checklist

Before deploying, make sure:

- [ ] `netlify.toml` exists in root
- [ ] `public/_redirects` exists
- [ ] `vite.config.ts` updated
- [ ] All files committed to git
- [ ] Pushed to GitHub/GitLab
- [ ] Environment variable `VITE_MAPBOX_TOKEN` set in Netlify
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Node version: 18

---

## 🎉 Success Indicators

**You'll know it worked when:**

1. ✅ Build completes without errors
2. ✅ Site loads (no white screen)
3. ✅ Login page appears
4. ✅ Can navigate all routes
5. ✅ Satellite map loads with imagery
6. ✅ Drones move realistically
7. ✅ Console shows successful tile loads
8. ✅ No 404 errors on refresh

---

## 🔗 Useful Links

- **Netlify Dashboard**: https://app.netlify.com
- **Netlify Docs**: https://docs.netlify.com
- **Vite Deployment Guide**: https://vitejs.dev/guide/static-deploy.html
- **Environment Variables**: https://docs.netlify.com/environment-variables/overview/

---

## 📞 Quick Support

**If still having issues:**

1. Check build logs in Netlify
2. Check browser console (F12)
3. Verify environment variables are set
4. Try "Clear cache and deploy site"
5. Make sure all files are pushed to git

---

**The white screen should be fixed now! Push your changes and redeploy! 🚀✨**
