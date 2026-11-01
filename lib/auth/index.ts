import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Auth utilities for server-side role checking.
 */

export type UserRole = 'star' | 'superadmin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  starId?: string;
}

/**
 * Get the current authenticated user with role info.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use admin client server-side to prevent RLS recursion issues
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  // Fetch profile with role
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  // If star, get star ID
  let starId: string | undefined;
  if (profile.role === 'star') {
    const { data: star } = await adminClient
      .from('stars')
      .select('id')
      .eq('user_id', user.id)
      .single();
    starId = star?.id;
  }

  return {
    id: user.id,
    email: user.email || '',
    role: profile.role as UserRole,
    starId,
  };
}

/**
 * Require authentication. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Require Star role. Redirects if not a star.
 */
export async function requireStar(): Promise<AuthUser & { starId: string }> {
  const user = await requireAuth();
  if (user.role !== 'star' || !user.starId) {
    redirect('/login');
  }
  return user as AuthUser & { starId: string };
}

/**
 * Require Superadmin role. Redirects if not superadmin.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== 'superadmin') {
    redirect('/dashboard');
  }
  return user;
}

/**
 * Check if user owns a specific star record.
 */
export async function verifyStarOwnership(
  userId: string,
  starId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('stars')
    .select('id')
    .eq('id', starId)
    .eq('user_id', userId)
    .single();

  return !!data;
}
