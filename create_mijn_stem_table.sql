-- Create the mijn_stem_documents table for storing user document uploads and analysis
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

-- Enable Row Level Security (RLS)
ALTER TABLE mijn_stem_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access their own documents
CREATE POLICY "Users can manage their own documents" ON mijn_stem_documents
    FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON mijn_stem_documents TO authenticated;
GRANT ALL ON mijn_stem_documents TO service_role;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_mijn_stem_documents_updated_at ON mijn_stem_documents;
CREATE TRIGGER update_mijn_stem_documents_updated_at
    BEFORE UPDATE ON mijn_stem_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
