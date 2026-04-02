# Supabase Email Configuration Guide

## Password Reset Email Issues

If password reset emails are not being sent, check the following Supabase configuration:

### 1. Redirect URL Whitelist

**CRITICAL**: Supabase requires redirect URLs to be whitelisted in the dashboard.

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add the following URLs:
   - `http://localhost:3000/reset-password` (for local development)
   - `https://vat-app-test.vercel.app/reset-password` (for production)
   - Or use a wildcard: `https://*.vercel.app/reset-password`

**Without whitelisting these URLs, password reset emails will fail silently!**

### 2. Email Service Configuration

Supabase uses its built-in email service by default, but you can configure custom SMTP:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Either:
   - **Use Supabase's built-in email service** (default, but limited)
   - **Configure custom SMTP** (recommended for production):
     - SMTP Host (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`)
     - SMTP Port (usually 587 for TLS)
     - SMTP User (your email service username)
     - SMTP Password (your email service password)
     - Sender Email (the "from" address)
     - Sender Name (optional)

### 3. Email Templates

1. Go to **Authentication** → **Email Templates**
2. Check that the **Reset Password** template is configured
3. The template should include:
   - Subject line
   - Email body with `{{ .ConfirmationURL }}` for the reset link

### 4. Rate Limiting

Supabase has rate limits on password reset emails:
- Default: 1 email per hour per email address
- Check **Authentication** → **Rate Limits** if users report not receiving emails

### 5. Email Delivery Issues

If emails are sent but not received:

1. **Check spam/junk folder** - Supabase emails sometimes end up there
2. **Check Supabase logs**:
   - Go to **Logs** → **Auth Logs**
   - Look for email sending errors
3. **Verify email address** - Make sure the email exists in your `users` table
4. **Check SMTP credentials** - If using custom SMTP, verify credentials are correct

### 6. Testing

To test password reset:

1. Use a real email address that exists in your `users` table
2. Check browser console for any errors
3. Check Supabase Auth logs for email sending status
4. Wait a few minutes and check spam folder

### Common Error Messages

- **"redirect_to URL is not allowed"**: Redirect URL not whitelisted (see #1)
- **"Email rate limit exceeded"**: Too many requests (wait 1 hour)
- **"Email sending failed"**: SMTP configuration issue (see #2)
- **Silent failure (no error, no email)**: Usually redirect URL not whitelisted

### Quick Fix Checklist

- [ ] Redirect URLs whitelisted in Supabase dashboard
- [ ] SMTP configured (or using Supabase default service)
- [ ] Email templates configured
- [ ] Testing with valid email from `users` table
- [ ] Checking spam folder
- [ ] Reviewing Supabase Auth logs

