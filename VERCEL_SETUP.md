# Vercel Deployment Setup

## ⚠️ REQUIRED: Configure Root Directory

**You must configure Vercel's Root Directory setting for this to work:**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **General**  
3. Find **Root Directory** setting
4. Click **Edit** and set it to `app`
5. Click **Save**

After setting the root directory, Vercel will automatically:
- Run `npm install` in the `app` directory
- Run `npm run build` in the `app` directory  
- Use `app/dist` as the output directory

Your `vercel.json` should be **inside the `app/` folder** (since that's your Root Directory) and only needs the rewrites for SPA routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Important**: When Root Directory is set to `app`, Vercel looks for `vercel.json` relative to that directory, so it must be at `app/vercel.json`, not at the repository root.

## Why This Is Required

Vercel doesn't reliably execute `cd` commands in build scripts. When you set Root Directory to `app`, Vercel treats that directory as the project root, eliminating the need for `cd` commands.

## Current Configuration (Fallback)

The current `vercel.json` uses a build script as a fallback, but **you still need to set Root Directory to `app`** in Vercel dashboard for this to work properly.
