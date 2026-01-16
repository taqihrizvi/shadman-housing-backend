# Admin Setup Guide

## Issue: Login Fails with "Invalid credentials"

If you're experiencing login failures even with correct credentials, the admin user might be missing from the database.

### Quick Fix

Run this command to create/verify admin user:

```bash
cd backend
node -e "import('./scripts/createAdmin.js')"
```

### Verify Admin Password

To check if admin password is correct:

```bash
node -e "import('./scripts/checkAdminPassword.js')"
```

### Admin Credentials

- **Email:** `admin@shadmanhousing.com`
- **Password:** `admin123`

### When to Run createAdmin.js

You need to run the admin creation script after:

1. **Fresh database setup** - When you create a new database
2. **After migrations** - Some migrations might clear data (though User table should be preserved)
3. **Database reset** - After running `npx prisma migrate reset`
4. **Login fails** - If you can't login with admin credentials

### Common Scenarios

#### Scenario 1: After Migration
```bash
npx prisma migrate dev
node -e "import('./scripts/createAdmin.js')"
```

#### Scenario 2: Fresh Database
```bash
npx prisma migrate deploy
node -e "import('./scripts/createAdmin.js')"
```

#### Scenario 3: Database Reset
```bash
npx prisma migrate reset
node -e "import('./scripts/createAdmin.js')"
```

### Troubleshooting

If login still fails after creating admin:

1. **Check if user exists:**
   ```bash
   node -e "import('./scripts/checkAdminPassword.js')"
   ```

2. **Update admin password:**
   ```bash
   node -e "import('./scripts/updateAdminPassword.js')"
   ```

3. **Check server logs** for detailed error messages

4. **Verify environment variables** - Make sure `JWT_SECRET` is set in `.env`

### Script Descriptions

- `createAdmin.js` - Creates admin user (skips if already exists)
- `checkAdminPassword.js` - Verifies admin password matches "admin123"
- `updateAdminPassword.js` - Resets admin password to "admin123"
- `createManager.js` - Creates a manager user for testing

### Security Note

⚠️ **IMPORTANT:** Change the default admin password after first login in production!

The default password "admin123" should only be used for:
- Development
- Testing
- Initial setup

In production, immediately change it to a strong, unique password.
