# Deployment Guide

This guide covers deploying the EST XML Generator to various hosting platforms.

## Prerequisites

- Completed Supabase setup (see QUICKSTART.md)
- Environment variables configured
- Application tested locally

## Option 1: Vercel (Recommended)

### Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy"

## Option 2: Netlify

### Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize**
   ```bash
   netlify init
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Deploy via Netlify Dashboard

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add Environment Variables in Site Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click "Deploy site"

### Netlify Configuration File

Create `netlify.toml` in the project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Option 3: GitHub Pages

1. **Install gh-pages**
   ```bash
   npm install -D gh-pages
   ```

2. **Update package.json**
   Add to scripts:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

3. **Update vite.config.ts**
   Add base path:
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/',
     // ... rest of config
   })
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Configure GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from branch `gh-pages`

**Note**: You'll need to handle environment variables differently for GitHub Pages (consider using GitHub Secrets and Actions).

## Option 4: AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Configure:
   - **Build settings**: Auto-detected (Vite)
   - Add Environment Variables
5. Click "Save and deploy"

### amplify.yml

Create `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Option 5: Docker

### Dockerfile

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Build and Run

```bash
# Build image
docker build -t est-xml-generator .

# Run container
docker run -p 8080:80 est-xml-generator
```

## Environment Variables

All deployment platforms need these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGc...` |

**Important**: Never commit `.env` files to Git. Use your hosting platform's environment variable settings.

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test user registration and login
- [ ] Test file upload functionality
- [ ] Test XML generation
- [ ] Test Supabase storage uploads
- [ ] Test history page
- [ ] Verify admin vs employee permissions
- [ ] Check mobile responsiveness
- [ ] Test all routes and navigation

## Custom Domain Setup

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Netlify
1. Go to Site Settings → Domain management
2. Add custom domain
3. Configure DNS records

## SSL/HTTPS

All recommended platforms (Vercel, Netlify, AWS Amplify) provide automatic SSL certificates via Let's Encrypt.

## Monitoring and Analytics

Consider adding:
- **Sentry** for error tracking
- **Google Analytics** for usage analytics
- **Supabase Analytics** for database insights

## Troubleshooting

### Build Fails
- Check Node.js version (18+)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`

### Environment Variables Not Working
- Ensure variables start with `VITE_`
- Restart dev server after changing `.env`
- Redeploy after updating environment variables

### 404 on Refresh
- Ensure your hosting platform is configured for SPA routing
- Add redirect rules (see Netlify example above)

### Supabase Connection Issues
- Verify environment variables are correct
- Check Supabase project is active
- Verify CORS settings in Supabase if needed

## Performance Optimization

1. **Code Splitting**: Consider lazy loading routes
2. **Image Optimization**: Use WebP format for any images
3. **Caching**: Configure proper cache headers
4. **CDN**: Use a CDN for static assets (most platforms do this automatically)

## Security Best Practices

1. **Never expose** Supabase service role key (only use anon key)
2. **Enable RLS** on all Supabase tables (already done in migration)
3. **Use HTTPS** only (enforced by hosting platforms)
4. **Regular updates**: Keep dependencies updated
5. **Monitor** for security vulnerabilities: `npm audit`

---

**Need Help?** Check the platform-specific documentation or open an issue on GitHub.
