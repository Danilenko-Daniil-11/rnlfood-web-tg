# 🚀 RNL FOOD - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the RNL FOOD service to Render.

## 📋 Prerequisites

- Render account ([sign up here](https://render.com))
- Neon PostgreSQL database ([create here](https://neon.tech))
- Telegram Bot Token (optional, [create with @BotFather](https://t.me/botfather))

## 🗄️ Database Setup

### 1. Create Neon Database

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string from the dashboard

### 2. Database Schema

Run the SQL schema from `s.sql` in your Neon database:

```sql
-- Copy and paste the contents of s.sql into your Neon SQL editor
```

## 🔧 Environment Configuration

### 1. Generate Secure Secrets

```bash
# Generate JWT Secret (32+ characters)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Environment Variables in Render

Set these environment variables in your Render dashboard under "Environment":

| Variable | Example Value | Description | Required |
|----------|---------------|-------------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Neon PostgreSQL connection string | ✅ Required |
| `JWT_SECRET` | `your_generated_secure_secret_here` | JWT signing secret (32+ chars) | ✅ Required |
| `BOT_TOKEN` | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` | Telegram bot token | ❌ Optional |
| `CACHE_TTL` | `300` | Cache TTL in seconds (default: 300) | ❌ Optional |
| `DB_MAX_CONNECTIONS` | `10` | Database connection pool size (default: 10) | ❌ Optional |
| `LOG_LEVEL` | `info` | Logging level (default: info) | ❌ Optional |

## 🚀 Deployment Steps

### 1. Connect Repository

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and click "New +"
3. Select "Web Service"
4. Connect your GitHub repository

### 2. Configure Service

```yaml
# Service Configuration
Name: rnl-food-web
Runtime: Node
Build Command: npm install
Start Command: npm start
```

### 3. Set Environment Variables

Add all required environment variables in the Render dashboard.

### 4. Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Your app will be available at `https://your-service-name.onrender.com`

## 🔍 Health Checks

### Endpoints

- `GET /health` - General health check
- `GET /api/health` - API health check

### Monitoring

Render provides built-in monitoring. Check:
- Logs in Render dashboard
- Health check status
- Response times

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check if DATABASE_URL is correct
# Ensure SSL is enabled for Neon
```

#### Build Failures
```bash
# Check Node.js version (>=18.0.0)
# Verify package.json dependencies
# Check build logs in Render
```

#### Runtime Errors
```bash
# Check environment variables
# Verify JWT_SECRET is set
# Check database connectivity
```

### Logs

View logs in Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Check for errors

## 🔄 Updates

### Automatic Deployments

Render automatically deploys when you push to your main branch.

### Manual Deployment

1. Push changes to GitHub
2. Go to Render dashboard
3. Click "Manual Deploy" → "Deploy latest commit"

## 📊 Performance Optimization

### Current Optimizations

- ✅ Response compression
- ✅ Database connection pooling
- ✅ API response caching
- ✅ Rate limiting
- ✅ Security headers
- ✅ Graceful shutdown

### Monitoring Performance

```bash
# Check response times in Render metrics
# Monitor database connections
# Review cache hit rates
```

## 🔒 Security

### Implemented Security Measures

- Helmet.js security headers
- Rate limiting on all endpoints
- HTTP-only cookies
- Input validation
- SQL injection prevention
- XSS protection

### Additional Recommendations

- Regular dependency updates
- Monitor for security vulnerabilities
- Use HTTPS only
- Implement proper CORS policies

## 📞 Support

For issues:
1. Check Render logs
2. Verify environment variables
3. Test database connectivity
4. Check GitHub repository for updates

## 🎯 Production Checklist

- [ ] Database schema deployed
- [ ] Environment variables set
- [ ] Health checks passing
- [ ] SSL certificate active
- [ ] Domain configured (optional)
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place

## 📈 Scaling

### Vertical Scaling
- Increase Render service plan for more RAM/CPU

### Horizontal Scaling
- Consider load balancer for multiple instances
- Implement Redis for shared caching
- Use database read replicas

---

**Made by:** Danylenko Daniil & Dmitriev Kolya
**Version:** 1.0.0
