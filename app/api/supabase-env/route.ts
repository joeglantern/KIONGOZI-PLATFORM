import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  console.log('🔍 [Supabase Env API] Environment check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'missing'
  });
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ [Supabase Env API] Missing environment variables');
    return NextResponse.json(
      { 
        error: 'Supabase environment variables not configured',
        available: {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      },
      { status: 500 }
    );
  }
  
  return NextResponse.json({
    url: supabaseUrl,
    key: supabaseAnonKey
  });
}




