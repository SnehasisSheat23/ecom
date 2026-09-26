# Hostinger Deployment Guide for Abdullah Bakheet Storefront

## 🚀 Deployment Steps on Hostinger

### Option A: Hostinger VPS / Cloud Server (Recommended)
1. **Upload & Extract**:
   Upload `frontend_hostinger.zip` to your server directory (e.g., `/var/www/storefront` or `/home/user/storefront`) and extract it:
   ```bash
   unzip frontend_hostinger.zip -d storefront
   cd storefront
   ```

2. **Configure Production Environment**:
   Edit `.env.production` (or `.env`):
   ```env
   NEXT_PUBLIC_API_URL="https://your-live-backend-api-url.com"
   NEXT_PUBLIC_TENANT_ID="abdullah-bakheet"
   ```

3. **Install Dependencies & Build**:
   ```bash
   npm install
   npm run build
   ```

4. **Start with PM2 (Auto-restarts on reboot)**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

5. **Nginx Reverse Proxy (Optional, to point domain to port 3000)**:
   ```nginx
   server {
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### Option B: Hostinger hPanel Node.js Application
1. Go to **Hostinger hPanel** -> **Advanced** -> **Node.js**.
2. Create Node.js app:
   - **Node.js version**: `20.x` or `22.x`
   - **Application root**: `storefront` (or `public_html`)
   - **Application startup file**: `node_modules/next/dist/bin/next`
   - **Custom start command**: `start`
3. Upload `frontend_hostinger.zip` into the application root via File Manager.
4. Extract files.
5. In hPanel terminal or SSH:
   ```bash
   npm install
   npm run build
   ```
6. Click **Restart** in the hPanel Node.js dashboard.
