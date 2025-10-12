# Mijn Stem Database Setup

The "Mijn Stem" feature requires a database table to store document metadata and analysis results. Follow these steps to set up the required table in your Supabase database.

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the "SQL Editor" tab

2. **Run the Migration Script**
   - Copy the contents of `create_mijn_stem_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

3. **Verify Table Creation**
   - Go to "Table Editor" tab
   - You should see the `mijn_stem_documents` table

### Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Create a new migration
supabase migration new create_mijn_stem_documents_table

# Copy the SQL content to the generated migration file
# Then push to your database
supabase db push
```

## Table Structure

The `mijn_stem_documents` table includes:

- **id**: Unique identifier (UUID)
- **user_id**: Reference to auth.users (with cascade delete)
- **filename**: Original filename
- **storage_path**: Path in Supabase Storage
- **file_size**: File size in bytes
- **file_type**: MIME type of the file
- **status**: Processing status (uploaded, processing, analyzed, error)
- **writing_style**: JSONB field storing AI analysis results
- **error_message**: Error details if analysis fails
- **analyzed_at**: Timestamp when analysis completed
- **created_at/updated_at**: Automatic timestamps

## Security Features

- **Row Level Security (RLS)** enabled
- **Policy**: Users can only access their own documents
- **Indexes** for optimal query performance
- **Automatic timestamp updates**

## Storage Setup

Make sure your Supabase Storage bucket `documents` exists and has the correct permissions:

1. Go to Storage in your Supabase dashboard
2. Create bucket `documents` if it doesn't exist
3. Set up appropriate storage policies

## Testing

After setup, test the feature by:

1. Going to Settings → Mijn Stem
2. Uploading a PDF or TXT file
3. Verifying the document appears in the list
4. Checking that analysis completes successfully

## Troubleshooting

If you encounter issues:

1. **"Table doesn't exist"**: Run the SQL migration script
2. **"Permission denied"**: Check RLS policies and user permissions
3. **"Storage error"**: Verify storage bucket exists and is accessible
4. **"Analysis fails"**: Check OpenAI API key configuration

## Support

If you need help with the setup, check:
- Supabase documentation for RLS and Storage
- OpenAI API documentation for analysis features
- Project logs for detailed error messages
