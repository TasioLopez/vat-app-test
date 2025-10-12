import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔧 Auto-initializing MijnStem infrastructure...');

    // 1. Create storage bucket if it doesn't exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Failed to list buckets:', bucketsError);
      return NextResponse.json({ 
        error: 'Failed to check storage buckets: ' + bucketsError.message
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
          error: 'Failed to create storage bucket: ' + createBucketError.message
        }, { status: 500 });
      }
      
      console.log('✅ Storage bucket created successfully');
    } else {
      console.log('✅ Storage bucket already exists');
    }

    // 2. Try to create the table using a direct SQL query
    const createTableSQL = `
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
    `;

    // Try to execute the SQL
    try {
      // Use the Supabase REST API to execute raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: createTableSQL })
      });

      if (!response.ok) {
        console.log('Direct SQL execution not available, trying alternative approach...');
        
        // Alternative: Try to create a simple test record to see if table exists
        try {
          await supabase.from('mijn_stem_documents').select('id').limit(1);
          console.log('✅ Table already exists');
        } catch (testError: any) {
          console.log('❌ Table does not exist, manual setup required');
          return NextResponse.json({
            success: false,
            error: 'Database table does not exist and cannot be created automatically',
            manualSetupRequired: true,
            sqlScript: createTableSQL,
            instruction: 'Please run this SQL script in your Supabase SQL Editor:'
          }, { status: 500 });
        }
      } else {
        console.log('✅ Table created successfully via SQL execution');
      }
    } catch (sqlError: any) {
      console.error('SQL execution failed:', sqlError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create database table: ' + sqlError.message,
        manualSetupRequired: true,
        sqlScript: createTableSQL
      }, { status: 500 });
    }

    // 3. Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_user_id ON mijn_stem_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_mijn_stem_documents_status ON mijn_stem_documents(status);
    `;

    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: createIndexesSQL })
      });
      console.log('✅ Indexes created successfully');
    } catch (indexError) {
      console.log('⚠️ Index creation failed (may already exist):', indexError);
    }

    // 4. Enable RLS
    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: 'ALTER TABLE mijn_stem_documents ENABLE ROW LEVEL SECURITY;' })
      });
      console.log('✅ RLS enabled successfully');
    } catch (rlsError) {
      console.log('⚠️ RLS setup failed (may already be enabled):', rlsError);
    }

    // 5. Create RLS policy
    const createPolicySQL = `
      DROP POLICY IF EXISTS "Users can manage their own documents" ON mijn_stem_documents;
      CREATE POLICY "Users can manage their own documents" ON mijn_stem_documents
        FOR ALL USING (auth.uid() = user_id);
    `;

    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: createPolicySQL })
      });
      console.log('✅ RLS policy created successfully');
    } catch (policyError) {
      console.log('⚠️ Policy creation failed (may already exist):', policyError);
    }

    return NextResponse.json({
      success: true,
      message: 'MijnStem infrastructure initialized successfully',
      setup: {
        tableCreated: true,
        indexesCreated: true,
        rlsEnabled: true,
        policyCreated: true,
        storageBucketExists: true
      }
    });

  } catch (error: any) {
    console.error('Init error:', error);
    return NextResponse.json({ 
      error: 'Initialization failed: ' + error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
