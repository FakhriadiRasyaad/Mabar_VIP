import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseUrl } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    let response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      getSupabaseUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      let friendlyMessage = 'Email atau password salah. Silakan coba lagi.';
      if (error.message.includes('Invalid login credentials')) {
        friendlyMessage = 'Email atau password salah. Silakan periksa kembali.';
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMessage = 'Email belum dikonfirmasi. Silakan cek inbox email Anda.';
      } else if (error.message.includes('missing email')) {
        friendlyMessage = 'Silakan masukkan email yang valid.';
      }
      return NextResponse.json({ error: friendlyMessage }, { status: 401 });
    }

    return response;
  } catch (err: unknown) {
    console.error('Server login error:', err);
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan pada server.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
