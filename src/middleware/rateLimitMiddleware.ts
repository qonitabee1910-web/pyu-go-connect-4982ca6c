/**
 * Rate Limit Middleware - Client-side stub
 * Rate limiting is handled server-side by Supabase edge functions and RLS.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Check current rate limit status for a user
 */
export async function checkRateLimitStatus(
  userId: string,
  endpoint: string,
  limitType: 'general' | 'auth' | 'payment' | 'booking' = 'general'
): Promise<{
  remaining: number;
  reset: number;
  isLimited: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('rate_limit_logs')
      .select('*')
      .eq('endpoint', endpoint)
      .eq('user_id', userId)
      .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(1);

    if (error || !data || data.length === 0) {
      return { remaining: 100, reset: Date.now() + 15 * 60 * 1000, isLimited: false };
    }

    const violation = data[0];
    const maxAttempts = limitType === 'auth' ? 5 : 100;
    const remaining = Math.max(0, maxAttempts - (violation.violation_count ?? 0));

    return {
      remaining,
      reset: new Date(violation.timestamp ?? '').getTime() + 15 * 60 * 1000,
      isLimited: remaining === 0
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    return { remaining: 100, reset: Date.now() + 15 * 60 * 1000, isLimited: false };
  }
}
