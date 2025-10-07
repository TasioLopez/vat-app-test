import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const checks = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    openaiApiKey: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  };

  const allGood = Object.values(checks).every(check => check === true || typeof check === 'string');
  
  return NextResponse.json({
    status: allGood ? 'healthy' : 'unhealthy',
    checks,
    message: allGood ? 'All environment variables are set' : 'Some environment variables are missing'
  });
}
