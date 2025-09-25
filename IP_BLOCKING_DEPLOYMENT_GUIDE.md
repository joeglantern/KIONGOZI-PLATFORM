# 🛡️ IP Blocking Deployment Guide

## Overview
This guide explains how to deploy the IP blocking system with proper security configurations.

## ⚠️ IMPORTANT: Get Your Admin IP First

Before deploying, **find your admin IP address** to avoid locking yourself out:

```bash
# Check your current public IP
curl https://ipinfo.io/ip
# or
curl https://api.ipify.org
```

**Save this IP - you'll need it for EMERGENCY_BYPASS_IPS!**

## 🔧 Environment Configuration

### For Development (.env):
```bash
# Security Configuration - DEVELOPMENT
ENABLE_IP_BLOCKING=true
EMERGENCY_BYPASS_IPS=127.0.0.1,::1,YOUR_ADMIN_IP_HERE
AUTO_BLOCK_AFTER_VIOLATIONS=3
ENABLE_USER_AGENT_BLOCKING=true
ENABLE_CONTENT_FILTERING=true
```

### For Production (Render/Deploy platform):
Set these environment variables in your deployment platform:

```bash
# Required Production Variables
ENABLE_IP_BLOCKING=true
EMERGENCY_BYPASS_IPS=your.admin.ip.1,your.admin.ip.2,office.ip.address

# Optional Security Tuning
AUTO_BLOCK_AFTER_VIOLATIONS=2          # Stricter in production
ENABLE_USER_AGENT_BLOCKING=true        # Block suspicious bots
ENABLE_CONTENT_FILTERING=true          # Block malicious content
SUSPICIOUS_PATTERNS_THRESHOLD=2        # Lower threshold for production
```

## 🚀 How IP Blocking Works

### 1. **Request Processing Flow:**
```
User Request → Security Middleware → Check IP → Allow/Block
```

### 2. **Blocking Triggers:**
- **Manual Admin Block**: Via security dashboard
- **Automatic Block**: After 2-3 suspicious content violations
- **User Agent Block**: Bots, crawlers, suspicious tools

### 3. **Safety Features:**
- **Emergency Bypass**: Configured admin IPs can never be blocked
- **Localhost Bypass**: Development IPs (127.0.0.1) always allowed
- **Configurable Thresholds**: Adjustable violation limits

### 4. **What Gets Blocked:**
- **Chatbot Access**: Blocked IPs get 403 error
- **API Endpoints**: All secured endpoints return "IP address blocked"
- **Admin Access**: Blocked from admin dashboard (unless in emergency bypass list)

## 🛡️ Security Best Practices

### 1. **Emergency Access:**
Always set `EMERGENCY_BYPASS_IPS` with your admin/office IPs:
```bash
# Good - Multiple admin IPs
EMERGENCY_BYPASS_IPS=203.0.113.1,203.0.113.2,192.168.1.100

# Bad - No emergency access (you could lock yourself out!)
EMERGENCY_BYPASS_IPS=
```

### 2. **Production Settings:**
```bash
# Stricter thresholds for production
AUTO_BLOCK_AFTER_VIOLATIONS=2
SUSPICIOUS_PATTERNS_THRESHOLD=2

# All security features enabled
ENABLE_IP_BLOCKING=true
ENABLE_USER_AGENT_BLOCKING=true
ENABLE_CONTENT_FILTERING=true
```

### 3. **Monitoring:**
- Check security logs in admin dashboard
- Monitor blocked IP count
- Review threat intelligence regularly

## 🔍 Testing IP Blocking

### 1. **Block Your Test IP:**
1. Go to admin dashboard → Security → Management
2. Block a test IP (not your main IP!)
3. Try accessing chatbot from that IP
4. Should get "Access denied" or 403 error

### 2. **Verify Emergency Bypass:**
1. Add your IP to `EMERGENCY_BYPASS_IPS`
2. Block your IP via dashboard
3. You should still have access (bypass working)

### 3. **Test Automatic Blocking:**
1. Send 3+ suspicious requests (try SQL injection patterns)
2. IP should be auto-blocked
3. Check security logs for "AUTO_BLOCK" events

## 🚨 Troubleshooting

### Problem: "IP blocking not working"
**Solution:**
1. Check `ENABLE_IP_BLOCKING=true` is set
2. Verify environment variables are loaded
3. Check API server logs for security events

### Problem: "Locked out of admin"
**Solution:**
1. Add your IP to `EMERGENCY_BYPASS_IPS`
2. Redeploy the application
3. Or temporarily set `ENABLE_IP_BLOCKING=false`

### Problem: "Legitimate users blocked"
**Solution:**
1. Check security logs for false positives
2. Adjust `AUTO_BLOCK_AFTER_VIOLATIONS` threshold
3. Review and update suspicious patterns

## 📊 Monitoring Dashboard

The admin security dashboard shows:
- **Overview**: Blocked IPs count, recent attacks
- **Threats**: Attack patterns, threat intelligence
- **Logs**: Security events, blocked attempts
- **Management**: Block/unblock IP addresses

## 🔄 Deployment Steps

### 1. **Set Environment Variables:**
```bash
# On Render.com or similar platform
ENABLE_IP_BLOCKING=true
EMERGENCY_BYPASS_IPS=your.admin.ip
```

### 2. **Build and Deploy:**
```bash
cd api-server
npm run build
# Deploy to your platform
```

### 3. **Verify Deployment:**
```bash
# Test security endpoint
curl https://your-api.onrender.com/api/v1/admin/security/config
```

### 4. **Test Blocking:**
1. Block a test IP via dashboard
2. Verify it cannot access chatbot
3. Unblock when testing complete

## ✅ Final Checklist

- [ ] Set `ENABLE_IP_BLOCKING=true`
- [ ] Configure `EMERGENCY_BYPASS_IPS` with your admin IP
- [ ] Test blocking functionality
- [ ] Verify emergency bypass works
- [ ] Monitor security dashboard
- [ ] Check logs for any issues

**Now only blocked IPs will be denied access while all legitimate users can use the chatbot normally!** 🚀