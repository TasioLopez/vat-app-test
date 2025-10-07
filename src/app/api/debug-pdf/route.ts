import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to extract storage path from URL
function extractStoragePath(url: string): string | null {
  const match = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (match?.[1]) return match[1];
  if (url.startsWith('documents/')) return url.slice('documents/'.length);
  if (!url.includes('://') && !url.includes('object/')) return url;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    console.log('🔍 Debugging PDF for employee:', employeeId);

    // Fetch documents
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId);

    if (docsError) {
      console.error('Database error:', docsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({ 
        success: false,
        message: 'No documents found for this employee'
      });
    }

    console.log('📄 Found documents:', docs.length);

    // Process each document
    const results = [];
    
    for (const doc of docs) {
      try {
        if (!doc.url) continue;

        const path = extractStoragePath(doc.url);
        if (!path) continue;

        console.log('📥 Processing document:', doc.name, 'Type:', doc.type);

        const { data: file, error: downloadError } = await supabase.storage
          .from('documents')
          .download(path);

        if (!file || downloadError) {
          console.warn('Download failed:', doc.name);
          results.push({
            name: doc.name,
            type: doc.type,
            status: 'download_failed',
            error: downloadError?.message
          });
          continue;
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Try different extraction methods
        const extractionResults = {
          name: doc.name,
          type: doc.type,
          fileSize: buffer.length,
          methods: {}
        };

        // Method 1: Try pdf-parse
        try {
          const pdfParse = await import('pdf-parse');
          const data = await pdfParse.default(buffer);
          extractionResults.methods.pdfParse = {
            success: true,
            textLength: data.text?.length || 0,
            textPreview: data.text?.substring(0, 500) || '',
            fullText: data.text || ''
          };
        } catch (error) {
          extractionResults.methods.pdfParse = {
            success: false,
            error: error.message
          };
        }

        // Method 2: Try raw buffer analysis
        try {
          const rawText = buffer.toString('utf8');
          const textMatches = rawText.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
          extractionResults.methods.rawBuffer = {
            success: true,
            textLength: textMatches?.length || 0,
            textPreview: textMatches?.join(' ').substring(0, 500) || '',
            fullText: textMatches?.join(' ') || ''
          };
        } catch (error) {
          extractionResults.methods.rawBuffer = {
            success: false,
            error: error.message
          };
        }

        // Method 3: Try binary analysis
        try {
          const binaryText = buffer.toString('binary');
          const textMatches = binaryText.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
          extractionResults.methods.binaryBuffer = {
            success: true,
            textLength: textMatches?.length || 0,
            textPreview: textMatches?.join(' ').substring(0, 500) || '',
            fullText: textMatches?.join(' ') || ''
          };
        } catch (error) {
          extractionResults.methods.binaryBuffer = {
            success: false,
            error: error.message
          };
        }

        results.push(extractionResults);

      } catch (error) {
        console.error('Error processing document:', doc.name, error);
        results.push({
          name: doc.name,
          type: doc.type,
          status: 'processing_error',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Debugged ${results.length} documents`
    });

  } catch (error: any) {
    console.error('❌ Debug API Error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error.message 
    }, { status: 500 });
  }
}
