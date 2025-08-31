# 🔌 API Documentation - Kiongozi LMS Platform

This comprehensive API documentation covers all endpoints, authentication, and integration details for the Kiongozi Learning Management System.

## 🚀 Quick Start

### Base URL
- **Production**: `https://your-domain.com/api/v1`
- **Development**: `http://localhost:3001/api/v1`

### Authentication
All API requests require authentication via JWT tokens in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## 📋 API Overview

### Available Endpoints
- **Authentication**: `/auth/*` - User authentication and tokens
- **Chat**: `/chat/*` - Chat conversations and messages
- **Notifications**: `/notifications/*` - Real-time notifications
- **Analytics**: `/analytics/*` - Platform analytics and metrics
- **Security**: `/admin/security/*` - Security management (Admin only)
- **Health**: `/health` - System health checks

### Response Format
All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional message",
  "pagination": { /* pagination info if applicable */ }
}
```

### Error Format
```json
{
  "error": "Error description",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

---

## 🔐 Authentication API

### POST `/auth/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### POST `/auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

### POST `/auth/refresh`
Refresh JWT token.

**Request:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

### POST `/auth/logout`
Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

---

## 💬 Chat API

### GET `/chat/sessions`
Get user's chat sessions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of sessions to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "title": "Chat Title",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T01:00:00Z",
      "message_count": 10
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total": 100
  }
}
```

### POST `/chat/sessions`
Create a new chat session.

**Request:**
```json
{
  "title": "New Chat Session"
}
```

### GET `/chat/sessions/:sessionId/messages`
Get messages for a specific chat session.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "message-uuid",
      "role": "user",
      "content": "Hello!",
      "created_at": "2024-01-01T00:00:00Z",
      "tokens_used": 5
    },
    {
      "id": "message-uuid-2",
      "role": "assistant",
      "content": "Hello! How can I help you?",
      "created_at": "2024-01-01T00:00:01Z",
      "tokens_used": 15,
      "response_time": 1.2
    }
  ]
}
```

### POST `/chat/sessions/:sessionId/messages`
Send a message in a chat session.

**Request:**
```json
{
  "content": "Hello, how are you?",
  "role": "user"
}
```

### PUT `/chat/messages/:messageId/feedback`
Provide feedback on an AI response.

**Request:**
```json
{
  "rating": 5,
  "feedback": "Great response!"
}
```

---

## 🔔 Notifications API

### GET `/notifications`
Get user notifications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of notifications (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `unread_only` (optional): Only unread notifications (default: false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notification-uuid",
      "title": "New Security Alert",
      "message": "Suspicious activity detected",
      "type": "security",
      "priority": "high",
      "read": false,
      "created_at": "2024-01-01T00:00:00Z",
      "data": {
        "ip": "192.168.1.1",
        "action": "blocked"
      }
    }
  ]
}
```

### PUT `/notifications/:id/read`
Mark a notification as read.

### PUT `/notifications/read-all`
Mark all notifications as read.

### GET `/notifications/counts`
Get notification counts.

**Response:**
```json
{
  "success": true,
  "data": {
    "unread": 5,
    "total": 100
  }
}
```

### POST `/notifications` (Admin Only)
Create a notification.

**Request:**
```json
{
  "user_id": "target-user-uuid",
  "title": "System Maintenance",
  "message": "Scheduled maintenance at 2 AM",
  "type": "info",
  "priority": "medium"
}
```

---

## 📊 Analytics API

### GET `/analytics/user-engagement`
Get user engagement metrics.

**Headers:** `Authorization: Bearer <token>` (Admin required)

**Query Parameters:**
- `timeframe`: `24h`, `7d`, `30d` (default: `7d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "dailyEngagement": [
      {
        "date": "2024-01-01",
        "activeUsers": 150,
        "sessions": 200
      }
    ],
    "summary": {
      "totalUsers": 1000,
      "activeUsers": 150,
      "retentionRate": 75.5,
      "timeframe": "7d"
    }
  }
}
```

### GET `/analytics/chat-metrics`
Get chat system metrics.

**Query Parameters:**
- `timeframe`: `24h`, `7d`, `30d` (default: `7d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "dailyMetrics": [
      {
        "date": "2024-01-01",
        "sessions": 50,
        "totalMessages": 200,
        "userMessages": 100,
        "aiResponses": 100,
        "tokensUsed": 5000
      }
    ],
    "summary": {
      "totalSessions": 350,
      "totalMessages": 1400,
      "avgSessionDuration": 15,
      "totalTokens": 35000
    },
    "hourlyActivity": [10, 15, 20, ...] // 24 values
  }
}
```

### GET `/analytics/ai-performance`
Get AI performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalResponses": 500,
      "avgResponseTime": 1.2,
      "avgTokensPerResponse": 75,
      "avgRating": 4.3,
      "totalFeedback": 100
    },
    "ratingDistribution": {
      "positive": 80,
      "neutral": 15,
      "negative": 5
    },
    "dailyPerformance": [
      {
        "date": "2024-01-01",
        "responses": 50,
        "avgResponseTime": 1.1,
        "avgTokens": 70
      }
    ]
  }
}
```

### GET `/analytics/system-health`
Get system health metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "uptime": 99.9,
      "totalErrors": 5,
      "totalWarnings": 20,
      "securityIncidents": 2
    },
    "errorsByHour": [
      {
        "time": "2024-01-01T00:00",
        "errors": 0,
        "warnings": 2
      }
    ],
    "topErrors": [
      {
        "message": "Database connection timeout",
        "count": 3
      }
    ],
    "systemStatus": "healthy"
  }
}
```

---

## 🛡️ Security API (Admin Only)

### GET `/admin/security/overview`
Get security overview and statistics.

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "security": {
      "blockedIPs": ["192.168.1.1", "10.0.0.1"],
      "recentAttacks": 15,
      "suspiciousPatterns": 8,
      "blockedUserAgents": 3
    },
    "rateLimiting": {
      "chat": {
        "totalEntries": 100,
        "blockedClients": 2,
        "suspiciousClients": 5
      },
      "api": { /* similar structure */ },
      "auth": { /* similar structure */ },
      "admin": { /* similar structure */ }
    },
    "recentLogs": [
      {
        "id": "log-uuid",
        "level": "warning",
        "message": "Rate limit exceeded",
        "created_at": "2024-01-01T00:00:00Z",
        "details": {
          "ip": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        }
      }
    ]
  }
}
```

### GET `/admin/security/logs`
Get security logs with filtering.

**Query Parameters:**
- `level`: `info`, `warning`, `error`
- `startDate`: ISO date string
- `endDate`: ISO date string
- `ip`: Filter by IP address
- `userId`: Filter by user ID
- `limit`: Number of logs (default: 100)
- `offset`: Pagination offset

### POST `/admin/security/block-ip`
Block an IP address.

**Request:**
```json
{
  "ip": "192.168.1.1",
  "reason": "Repeated failed login attempts"
}
```

### POST `/admin/security/unblock-ip`
Unblock an IP address.

**Request:**
```json
{
  "ip": "192.168.1.1"
}
```

### POST `/admin/security/unblock-rate-limit`
Clear rate limit for user/IP.

**Request:**
```json
{
  "identifier": "user-id-or-ip",
  "type": "all" // or "chat", "api", "auth", "admin"
}
```

### GET `/admin/security/threats`
Get threat intelligence summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalThreats": 25,
    "uniqueIPs": 8,
    "topThreats": [
      ["Rate Limit Violations", 15],
      ["Suspicious Content", 8],
      ["Blocked IPs", 2]
    ],
    "hourlyDistribution": [0, 1, 2, 0, ...] // 24 values
  }
}
```

---

## 🏥 Health API

### GET `/health`
Check system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy"
  },
  "uptime": 86400
}
```

---

## 🔌 WebSocket API

### Connection
Connect to real-time notifications:

```javascript
const socket = io('wss://your-domain.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

**Client → Server:**
```javascript
// Ping for connection health
socket.emit('ping');

// Acknowledge notification
socket.emit('notification_ack', {
  notificationId: 'notification-uuid'
});

// Subscribe to admin events (admin only)
socket.emit('subscribe_admin_events');

// Subscribe to security events (admin only)
socket.emit('subscribe_security_events');
```

**Server → Client:**
```javascript
// Connection confirmation
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Pong response
socket.on('pong', () => {
  console.log('Connection alive');
});

// New notification
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Security alert (admin only)
socket.on('security_alert', (alert) => {
  console.log('Security alert:', alert);
});

// Admin event (admin only)
socket.on('admin_event', (event) => {
  console.log('Admin event:', event);
});

// System update
socket.on('system_update', (update) => {
  console.log('System update:', update);
});
```

---

## 📝 Rate Limiting

### Rate Limits by Endpoint
- **Authentication**: 5 requests per 15 minutes per IP
- **Chat**: 20 messages per minute per user
- **API**: 100 requests per minute per user
- **Admin**: 50 requests per minute per admin

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-01T00:01:00Z
```

### Rate Limit Response
```http
HTTP/1.1 429 Too Many Requests
{
  "error": "Too many requests",
  "retryAfter": 60,
  "limit": 100,
  "windowMs": 60000
}
```

---

## 🔒 Security

### Authentication
- **JWT tokens** with configurable expiration
- **Refresh token** mechanism for extended sessions
- **Role-based access** control (user, admin)

### Security Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
X-Requested-With: XMLHttpRequest
```

### CORS Configuration
- **Allowed origins** configurable via environment
- **Credentials** supported for authenticated requests
- **Preflight** handling for complex requests

### Input Validation
- **SQL injection** protection
- **XSS prevention** with content sanitization
- **CSRF protection** with token validation
- **Request size limits** (10MB default)

---

## 🚀 SDK Examples

### JavaScript/Node.js
```javascript
const KiongoziAPI = require('./kiongozi-sdk');

const api = new KiongoziAPI({
  baseURL: 'https://your-domain.com/api/v1',
  token: 'your-jwt-token'
});

// Get chat sessions
const sessions = await api.chat.getSessions();

// Send message
const response = await api.chat.sendMessage(sessionId, {
  content: 'Hello!',
  role: 'user'
});

// Get analytics
const analytics = await api.analytics.getUserEngagement('7d');
```

### Python
```python
import requests

class KiongoziAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_sessions(self):
        response = requests.get(
            f'{self.base_url}/chat/sessions',
            headers=self.headers
        )
        return response.json()

# Usage
api = KiongoziAPI('https://your-domain.com/api/v1', 'your-token')
sessions = api.get_sessions()
```

---

## 🐛 Error Handling

### Common Error Codes
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Error Response Examples
```json
// Validation Error
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password too short"
  },
  "code": "VALIDATION_ERROR"
}

// Authentication Error
{
  "error": "Invalid token",
  "details": "JWT token has expired",
  "code": "AUTH_ERROR"
}

// Rate Limit Error
{
  "error": "Too many requests",
  "details": "Rate limit exceeded for endpoint",
  "code": "RATE_LIMIT_ERROR",
  "retryAfter": 60
}
```

---

## 📈 Performance

### Response Times
- **Authentication**: < 200ms
- **Chat messages**: < 500ms
- **Analytics queries**: < 1s
- **File uploads**: < 5s

### Caching
- **Static assets**: CDN cached
- **API responses**: Redis cached where appropriate
- **Database queries**: Optimized with indexes

### Pagination
Most list endpoints support pagination:
```json
{
  "data": [...],
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total": 1000,
    "hasMore": true
  }
}
```

---

## 🔧 Development

### Environment Variables
```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret

# Optional
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

**API Version**: v1  
**Last Updated**: Current Date  
**Support**: Check GitHub Issues for support

*This documentation is continuously updated with new features and improvements.*