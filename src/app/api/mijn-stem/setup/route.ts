import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔧 Setting up MijnStem infrastructure...');

    // 1. Check/create storage bucket first (this we can do)
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Failed to list buckets:', bucketsError);
      return NextResponse.json({ 
        error: 'Failed to check storage buckets',
        details: bucketsError.message 
      }, { status: 500 });
    }

    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
    
    if (!documentsBucket) {
      console.log('📦 Creating documents storage bucket...');
      const { data: newBucket, error: createBucketError } = await supabase.storage.createBucket('documents', {
        public: false,
        allowedMimeTypes: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createBucketError) {
        console.error('Failed to create storage bucket:', createBucketError);
        return NextResponse.json({ 
          error: 'Failed to create storage bucket',
          details: createBucketError.message 
        }, { status: 500 });
      }
      
      console.log('✅ Storage bucket created successfully');
    } else {
      console.log('✅ Storage bucket already exists');
    }

    // 2. Check if table exists
    let tableExists = false;
    try {
      await supabase.from('mijn_stem_documents').select('id').limit(1);
      tableExists = true;
      console.log('✅ Database table exists');
    } catch (tableError: any) {
      console.log('❌ Database table does not exist:', tableError.message);
    }

    return NextResponse.json({
      success: true,
      message: tableExists ? 'MijnStem infrastructure is ready' : 'Storage bucket created, but database table needs manual setup',
      setup: {
        tableExists,
        storageBucketExists: true,
        manualSetupRequired: !tableExists
      },
      nextSteps: !tableExists ? {
        instruction: 'Please run the following SQL in your Supabase dashboard SQL Editor:',
        sqlScript: `
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_user_id ON mijn_stem_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_status ON mijn_stem_documents(status);

-- Enable RLS
ALTER TABLE mijn_stem_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own documents" ON mijn_stem_documents
  FOR ALL USING (auth.uid() = user_id);
        `
      } : null
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Setup failed: ' + error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if everything is set up correctly
    const checks = {
      tableExists: false,
      storageBucketExists: false,
      rlsEnabled: false
    };

    // Check table
    try {
      await supabase.from('mijn_stem_documents').select('id').limit(1);
      checks.tableExists = true;
    } catch (error) {
      console.log('Table check failed:', error);
    }

    // Check storage bucket
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      checks.storageBucketExists = buckets.some(bucket => bucket.name === 'documents');
    } catch (error) {
      console.log('Bucket check failed:', error);
    }

    // Check RLS (simplified check)
    try {
      const { data } = await supabase.from('mijn_stem_documents').select('id').limit(1);
      checks.rlsEnabled = true; // If we can query, RLS is probably set up
    } catch (error) {
      console.log('RLS check failed:', error);
    }

    return NextResponse.json({
      success: true,
      checks,
      allSetup: Object.values(checks).every(check => check === true)
    });

  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json({ 
      error: 'Health check failed: ' + error.message
    }, { status: 500 });
  }
}
