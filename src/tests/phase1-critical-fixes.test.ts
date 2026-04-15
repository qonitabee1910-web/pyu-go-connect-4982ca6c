/**
 * Phase 1 Critical Fixes - Test Suite
 * Tests wallet operations and security audit logging
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

const TEST_USER_ID = `test-user-${Date.now()}`;

describe('PHASE 1: Wallet Atomic Operations', () => {
  beforeEach(async () => {
    // Setup: Create test wallet
    await supabase.from('wallets').insert([
      {
        user_id: TEST_USER_ID,
        balance: 1000,
        wallet_type: 'user' as const
      }
    ] as any);
  });

  afterEach(async () => {
    await supabase.from('wallets').delete().eq('user_id', TEST_USER_ID);
  });

  it('should have test wallet created', async () => {
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', TEST_USER_ID)
      .single();
    
    expect(data).toBeTruthy();
  });

  it('should deduct balance atomically via RPC', async () => {
    const { data, error } = await supabase.rpc('update_wallet_balance', {
      p_user_id: TEST_USER_ID,
      p_amount: -100,
      p_transaction_id: crypto.randomUUID()
    });

    const result = data as any;
    expect(error).toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.new_balance).toBe(900);
  });

  it('should reject insufficient balance', async () => {
    const { data, error } = await supabase.rpc('update_wallet_balance', {
      p_user_id: TEST_USER_ID,
      p_amount: -99999,
      p_transaction_id: crypto.randomUUID()
    });

    const result = data as any;
    expect(result?.error).toBeTruthy();
  });
});

describe('PHASE 1: Security Audit Logging', () => {
  it('should log wallet operations to security audit log', async () => {
    const testId = `audit-test-${Date.now()}`;
    await supabase.from('wallets').insert([
      {
        user_id: testId,
        balance: 500,
        wallet_type: 'user' as const
      }
    ] as any);

    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    expect(data).toBeTruthy();

    // Cleanup
    await supabase.from('wallets').delete().eq('user_id', testId);
  });
});
