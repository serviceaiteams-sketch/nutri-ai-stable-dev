# 🚀 NutriAI Oracle - Production Deployment Guide

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (optional)
- PM2 (for process management)
- SSL certificates (for HTTPS)
- Domain name (optional)

## 🏗️ Project Structure

```
nutriai-oracle/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── data/                   # SQLite database
├── uploads/                # User uploaded images
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose setup
├── ecosystem.config.js     # PM2 configuration
├── nginx.conf             # Nginx reverse proxy
└── DEPLOYMENT.md          # This file
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secure-jwt-secret-key-here
CLIENT_URL=https://yourdomain.com

# OpenAI API (for AI features)
OPENAI_API_KEY=your-openai-api-key

# Database (SQLite is used by default)
DATABASE_URL=./data/nutriai.db

# Optional: Redis for session storage
REDIS_URL=redis://localhost:6379
```

## 🐳 Docker Deployment (Recommended)

### 1. Build and Run with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Manual Docker Build

```bash
# Build image
docker build -t nutriai-oracle .

# Run container
docker run -d \
  --name nutriai-oracle \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  nutriai-oracle
```

## 📦 PM2 Deployment

### 1. Install PM2

```bash
npm install -g pm2
```

### 2. Start Application

```bash
# Start with ecosystem config
pm2 start ecosystem.config.js

# Or start manually
pm2 start server/index.js --name "nutriai-oracle"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 3. PM2 Commands

```bash
# View processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs nutriai-oracle

# Restart application
pm2 restart nutriai-oracle

# Stop application
pm2 stop nutriai-oracle
```

## 🌐 Nginx Reverse Proxy

### 1. Install Nginx

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. Configure Nginx

Copy the provided `nginx.conf` to `/etc/nginx/nginx.conf` or include it in your existing configuration.

### 3. SSL Certificates

```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com

# Or manually place certificates in /etc/nginx/ssl/
```

### 4. Test and Reload

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use strong, unique JWT secrets
- Rotate API keys regularly

### 2. Database Security
- SQLite database is file-based; ensure proper file permissions
- Consider migrating to PostgreSQL/MySQL for production
- Regular database backups

### 3. API Security
- Rate limiting is configured in nginx
- CORS is configured for production domains
- Input validation on all endpoints

### 4. File Uploads
- Image uploads are restricted to 10MB
- Only image files are allowed
- Files are stored in isolated uploads directory

## 📊 Monitoring and Health Checks

### 1. Health Endpoint

```bash
# Check application health
curl https://yourdomain.com/api/health

# Expected response
{
  "status": "OK",
  "message": "NutriAI Oracle Server is running",
  "timestamp": "2025-08-17T20:51:01.275Z",
  "version": "1.0.0"
}
```

### 2. Logs

```bash
# Application logs
pm2 logs nutriai-oracle

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs
docker-compose logs -f
```

### 3. Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h
```

## 🚨 Troubleshooting

### 1. Common Issues

**Port already in use:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

**Database connection errors:**
```bash
# Check database file permissions
ls -la data/nutriai.db

# Check database integrity
sqlite3 data/nutriai.db "PRAGMA integrity_check;"
```

**Build errors:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json
npm install
cd client && npm install
```

### 2. Debug Mode

```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npm start

# View detailed logs
pm2 logs nutriai-oracle --lines 100
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling

- Use load balancer (HAProxy, nginx)
- Multiple application instances
- Shared database (PostgreSQL/MySQL)
- Redis for session storage

### 2. Database Optimization

- Add database indexes
- Implement connection pooling
- Regular database maintenance
- Consider read replicas

### 3. Caching

- Redis for API response caching
- CDN for static assets
- Browser caching headers
- Image optimization

## 🔄 Updates and Maintenance

### 1. Application Updates

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install
cd client && npm install

# Build frontend
npm run build

# Restart application
pm2 restart nutriai-oracle
```

### 2. Database Migrations

```bash
# Check database version
sqlite3 data/nutriai.db "SELECT version FROM migrations ORDER BY id DESC LIMIT 1;"

# Run migrations (if any)
node server/config/database-migrations.js
```

### 3. Backup Strategy

```bash
# Database backup
cp data/nutriai.db backups/nutriai-$(date +%Y%m%d-%H%M%S).db

# Uploads backup
tar -czf backups/uploads-$(date +%Y%m%d-%H%M%S).tar.gz uploads/

# Automated backup script
0 2 * * * /path/to/backup-script.sh
```

## 📞 Support

For deployment issues:
1. Check logs: `pm2 logs` or `docker-compose logs`
2. Verify environment variables
3. Check file permissions
4. Ensure all ports are accessible
5. Verify SSL certificates (if using HTTPS)

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backed up
- [ ] File permissions set correctly
- [ ] Firewall rules configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Health checks passing
- [ ] Rate limiting configured
- [ ] Error logging enabled
- [ ] Performance monitoring active
- [ ] Security headers configured
- [ ] CORS settings updated for production domain
- [ ] File upload limits configured
- [ ] Database indexes optimized
- [ ] Log rotation configured
- [ ] Process management (PM2) configured
- [ ] Reverse proxy (nginx) configured
- [ ] Load balancer configured (if scaling)
- [ ] CDN configured (if using)
- [ ] Backup automation implemented
- [ ] Disaster recovery plan documented

---

**🚀 Your NutriAI Oracle application is now ready for production deployment!**
