# MijnStem Feature Setup Guide

This guide will help you set up the MijnStem feature which requires database tables and storage buckets to be configured in Supabase.

## Prerequisites

- Access to your Supabase project dashboard
- Admin permissions to run SQL commands

## Setup Steps

### Step 1: Create Storage Bucket (Automatic)

The storage bucket can be created automatically by visiting:
```
https://your-app-url.com/api/mijn-stem/setup
```

Or run this in your browser console while on your app:
```javascript
fetch('/api/mijn-stem/setup', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### Step 2: Create Database Table (Manual)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL script from `supabase/migrations/create_mijn_stem_table.sql`
5. Click **Run** or press `Ctrl+Enter`

**Or copy this SQL directly:**

```sql
-- Create the mijn_stem_documents table
CREATE TABLE IF NOT EXISTS mijn_stem_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'error')),
  writing_style JSONB,
  error_message TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_user_id ON mijn_stem_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_status ON mijn_stem_documents(status);
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_created_at ON mijn_stem_documents(created_at DESC);

-- Enable Row Level Security
ALTER TABLE mijn_stem_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to manage their own documents
DROP POLICY IF EXISTS "Users can manage their own documents" ON mijn_stem_documents;
CREATE POLICY "Users can manage their own documents" ON mijn_stem_documents
  FOR ALL USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_mijn_stem_documents_updated_at ON mijn_stem_documents;
CREATE TRIGGER update_mijn_stem_documents_updated_at
    BEFORE UPDATE ON mijn_stem_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Step 3: Verify Setup

After running the SQL script, verify everything is set up correctly:

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor**
3. You should see a new table called `mijn_stem_documents`
4. Navigate to **Storage**
5. You should see a bucket called `documents`

### Step 4: Test Upload

1. Go to your app's Settings page
2. Click on the "Mijn Stem" tab
3. Try uploading a PDF or TXT file
4. You should see the file appear in the uploaded documents list

## Troubleshooting

### "Database table not found" error

- Make sure you ran the SQL script in Step 2
- Check the Supabase dashboard to verify the table exists
- Check the Supabase logs for any SQL execution errors

### "Storage bucket not found" error

- Run the setup endpoint: `/api/mijn-stem/setup` (POST request)
- Or manually create a bucket named `documents` in Supabase Storage with these settings:
  - Name: `documents`
  - Public: No (private)
  - Allowed MIME types: `application/pdf`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - File size limit: 10MB (10485760 bytes)

### "Permission denied" errors

- Ensure Row Level Security (RLS) policies are set up correctly
- Check that the user is authenticated before trying to upload

### Upload works but analysis fails

- Check OpenAI API key is set in environment variables: `OPENAI_API_KEY`
- Verify the API endpoint `/api/mijn-stem/analyze` is accessible
- Check application logs for OpenAI API errors

## Architecture

The MijnStem feature consists of:

1. **Database Table**: `mijn_stem_documents` - stores document metadata and writing style analysis
2. **Storage Bucket**: `documents` - stores the actual uploaded files
3. **API Endpoints**:
   - `/api/mijn-stem/setup` - Setup infrastructure (POST/GET)
   - `/api/mijn-stem/upload` - Upload documents (POST), List documents (GET)
   - `/api/mijn-stem/analyze` - Analyze document writing style (POST)
   - `/api/mijn-stem/delete` - Delete documents (DELETE)
   - `/api/mijn-stem/style` - Get user's master writing style (GET)
   - `/api/mijn-stem/rewrite` - Rewrite text in user's style (POST)

## Security

- All documents are private and only accessible by the user who uploaded them
- Row Level Security (RLS) ensures users can only access their own documents
- Files are stored with user-specific paths: `mijn-stem/{userId}/{timestamp}-{filename}`
- Service role key is used server-side for admin operations

## Support

If you continue to experience issues:
1. Check the Vercel deployment logs
2. Check the Supabase logs (Dashboard > Logs)
3. Enable verbose logging in the upload component
4. Contact support with error details
