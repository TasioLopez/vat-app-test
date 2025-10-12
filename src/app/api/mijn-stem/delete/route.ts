import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');

    if (!documentId || !userId) {
      return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document info first
    const { data: document, error: docError } = await supabase
      .from('mijn_stem_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId) // Ensure user can only delete their own documents
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('mijn_stem_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      return NextResponse.json({ error: 'Failed to delete document from database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
