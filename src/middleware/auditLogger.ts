/**
 * Audit Logger - Client-side stub
 * Logs security events to the security_audit_log table via Supabase client.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  eventType: string;
  resource?: string;
  action?: string;
  status: 'success' | 'failed' | 'blocked' | 'processing' | 'insufficient_seats';
  details?: Record<string, any>;
}

/**
 * Log a security event to the database
 */
export async function log_security_event(
  eventType: string,
  resource: string,
  action: string,
  status: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('security_audit_log').insert({
      event_type: eventType,
      resource,
      action,
      status,
      details: details as any,
    });
  } catch (err) {
    console.warn('Failed to log security event:', err);
  }
}
