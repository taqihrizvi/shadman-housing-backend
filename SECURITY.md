# Security Implementation Guide

## Overview
This document outlines the security measures implemented in the Shadman Housing Management System.

## ✅ Implemented Security Features

### 1. Authentication & Authorization
- **JWT Tokens**: 1-hour expiration for access tokens
- **Refresh Tokens**: 7-day expiration for refresh tokens
- **Password Hashing**: bcrypt with 12 rounds
- **Role-Based Access Control**: ADMIN and MANAGER roles
- **Active User Check**: Deactivated accounts cannot login

### 2. Rate Limiting
- **Authentication Endpoints**: 5 requests per 15 minutes
- **API Endpoints**: 100 requests per 15 minutes
- **File Uploads**: 10 uploads per hour

### 3. Input Validation & Sanitization
- **Joi Validation**: Comprehensive validation for all input
- **NoSQL Injection Prevention**: express-mongo-sanitize
- **File Upload Restrictions**: 
  - Only images (JPEG, PNG, GIF)
  - 2MB file size limit
  - Random filename generation

### 4. CORS Configuration
- **Restricted Origins**: Only http://localhost:8080 allowed
- **Credentials**: Enabled for cookie/session support
- **Methods**: GET, POST, PUT, DELETE, PATCH
- **Headers**: Content-Type, Authorization

### 5. Security Headers (Helmet.js)
- **Content Security Policy**: Configured for safe resource loading
- **HSTS**: 1-year max-age with includeSubDomains
- **Cross-Origin Resource Policy**: cross-origin
- **XSS Protection**: Enabled
- **Frame Options**: DENY

### 6. Security Logging
- **Failed Login Attempts**: IP, user-agent, timestamp logged
- **Successful Logins**: User, IP, timestamp logged
- **Approval Actions**: User, role, action, resource logged
- **Injection Attempts**: Sanitized keys logged

### 7. HTTPS Enforcement
- **Production Mode**: Enforces HTTPS for sensitive endpoints
- **Development Mode**: Allows HTTP for local testing

## 🔐 Environment Variables

### Required Variables
```env
# JWT Secrets (MUST be strong random strings)
JWT_SECRET=<64-character random string>
JWT_REFRESH_SECRET=<64-character random string>

# Database (Change password in production)
DATABASE_URL="postgresql://user:password@host:port/database"

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080
```

### Generate Strong Secrets
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📋 Security Checklist for Production

### Before Deployment
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (64+ characters)
- [ ] Update DATABASE_URL with production credentials
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL certificates
- [ ] Update FRONTEND_URL to production domain
- [ ] Review and restrict CORS origins
- [ ] Enable firewall rules
- [ ] Set up database backups
- [ ] Configure monitoring and alerts

### Database Security
- [ ] Use strong database passwords
- [ ] Restrict database access to application server only
- [ ] Enable SSL for database connections
- [ ] Regular security patches and updates
- [ ] Implement backup encryption

### Application Security
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Use security scanning tools
- [ ] Implement rate limiting in production
- [ ] Enable request logging
- [ ] Set up intrusion detection
- [ ] Configure CSP headers properly

## 🛡️ API Security

### Protected Endpoints
All `/api/*` routes require authentication except:
- POST /api/auth/login
- POST /api/auth/refresh

### Rate Limits
| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| File Uploads | 10 uploads | 1 hour |

## 🔍 Validation Rules

### User Registration
- **Username**: 3-30 alphanumeric characters
- **Email**: Valid email format
- **Password**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Full Name**: 3-100 characters

### Financial Data
- **Amounts**: Positive numbers, max 999,999,999
- **Dates**: Valid date format, payment dates cannot be future
- **Payment Methods**: CASH, BANK_TRANSFER, CHEQUE only
- **Notes**: Maximum 500 characters

## 🚨 Incident Response

### Failed Login Attempts
- Logged with IP and user-agent
- Automatic rate limiting after 5 attempts
- 15-minute lockout period

### Suspicious Activity
- NoSQL injection attempts logged
- Multiple failed validations logged
- Unusual API patterns detected

## 📊 Monitoring Recommendations

### Log Analysis
- Review failed authentication attempts daily
- Monitor rate limit hits
- Track approval actions
- Analyze error patterns

### Alerts
- Multiple failed logins from same IP
- Rate limit threshold reached
- Database connection errors
- File upload errors

## 🔄 Token Management

### Access Token
- **Duration**: 1 hour
- **Usage**: API authentication
- **Storage**: Frontend memory/state
- **Refresh**: Use refresh token when expired

### Refresh Token
- **Duration**: 7 days
- **Usage**: Obtain new access token
- **Storage**: Secure HTTP-only cookie (recommended)
- **Rotation**: Generate new on refresh

### Token Refresh Flow
```
1. Access token expires (401 error)
2. Frontend calls /api/auth/refresh with refresh token
3. Backend validates refresh token
4. Returns new access token
5. Frontend retries original request
```

## 🔧 Maintenance

### Regular Tasks
- [ ] Update dependencies monthly (`npm update`)
- [ ] Run security audits (`npm audit`)
- [ ] Review access logs weekly
- [ ] Update SSL certificates before expiry
- [ ] Rotate JWT secrets quarterly
- [ ] Review user access permissions
- [ ] Database security patches
- [ ] Backup testing

### Quarterly Reviews
- Security policy updates
- Vulnerability assessments
- Penetration testing
- Access control audit
- Compliance verification

## 📚 Additional Resources

### Security Tools
- **npm audit**: Check for known vulnerabilities
- **Snyk**: Continuous security monitoring
- **OWASP ZAP**: Web application security testing
- **SSL Labs**: SSL/TLS configuration testing

### Best Practices
- Follow OWASP Top 10 guidelines
- Implement principle of least privilege
- Keep all dependencies updated
- Use security linters (ESLint security plugin)
- Conduct regular security training

## 🆘 Support

For security concerns or to report vulnerabilities, contact:
- Email: security@example.com
- Response time: 24-48 hours for critical issues

---

**Last Updated**: January 2026  
**Version**: 1.0.0
