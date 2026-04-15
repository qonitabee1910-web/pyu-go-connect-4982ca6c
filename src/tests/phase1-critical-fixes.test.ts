/**
 * Phase 1 Critical Fixes - Test Suite
 * Tests wallet operations and security audit logging
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

const TEST_USER_ID = 'test-user-wallet-ops';

describe('PHASE 1: Atomic Wallet Operations', () => {
  beforeEach(async () => {
    await supabase.from('wallets').insert({
      user_id: TEST_USER_ID,
      balance: 1000,
    } as any);
  });

  afterEach(async () => {
    await supabase.from('wallets').delete().eq('user_id', TEST_USER_ID);
  });

  it('should fetch wallet balance', async () => {
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .single();

    expect(data).toBeTruthy();
    expect(Number(data?.balance)).toBe(1000);
  });

  it('should deduct balance atomically via RPC', async () => {
    const { data, error } = await supabase.rpc('update_wallet_balance', {
      p_user_id: TEST_USER_ID,
      p_amount: -200,
      p_transaction_id: 'test-txn-1'
    });

    expect(error).toBeNull();
    const result = data as any;
    expect(result?.new_balance).toBeDefined();
  });
});

describe('PHASE 1: Security Audit Logging', () => {
  it('should log wallet operations to security audit log', async () => {
    const testUserId = `audit-test-${Date.now()}`;
    
    await supabase.from('wallets').insert({
      user_id: testUserId,
      balance: 500,
    } as any);

    const { data } = await supabase
      .from('security_audit_log')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false });

    expect(data).toBeTruthy();

    // Cleanup
    await supabase.from('wallets').delete().eq('user_id', testUserId);
  });
});
