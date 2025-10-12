import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📦 Creating documents storage bucket...');

    // Create storage bucket
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

    return NextResponse.json({
      success: true,
      message: 'Storage bucket created successfully',
      bucket: newBucket
    });

  } catch (error: any) {
    console.error('Create bucket error:', error);
    return NextResponse.json({ 
      error: 'Failed to create bucket: ' + error.message
    }, { status: 500 });
  }
}
