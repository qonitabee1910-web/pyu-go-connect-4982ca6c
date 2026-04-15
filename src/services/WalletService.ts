/**
 * Wallet Service - Financial Operations
 * Uses atomic RPC function for race condition safety
 */

import { supabase } from '@/integrations/supabase/client';
import { log_security_event } from '@/middleware/auditLogger';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarnings: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'debit' | 'credit' | 'balance_update';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  relatedId?: string;
  createdAt: string;
}

export interface WalletOperationResult {
  success: boolean;
  error?: string;
  newBalance?: number;
  transactionId?: string;
  message?: string;
}

export class WalletService {
  static async getWallet(userId: string): Promise<Wallet | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching wallet:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        balance: Number(data.balance ?? 0),
        totalEarnings: 0,
        totalSpent: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (err) {
      console.error('Wallet fetch failed:', err);
      return null;
    }
  }

  static async deductBalance(
    userId: string,
    amount: number,
    description?: string,
    transactionId?: string
  ): Promise<WalletOperationResult> {
    try {
      if (amount <= 0) {
        return { success: false, error: 'Amount must be greater than 0' };
      }

      await log_security_event('wallet_deduction', 'wallet', 'deduct_balance', 'processing', { user_id: userId, amount, description });

      const { data, error } = await supabase.rpc('update_wallet_balance', {
        p_user_id: userId,
        p_amount: -amount,
        p_transaction_id: transactionId ?? ''
      });

      if (error) {
        await log_security_event('wallet_deduction', 'wallet', 'deduct_balance', 'failed', { user_id: userId, amount, error: error.message });
        return { success: false, error: error.message };
      }

      const result = data as any;

      if (result?.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        newBalance: Number(result?.new_balance ?? 0),
        transactionId: result?.transaction_id,
        message: `Deducted ${amount} from wallet`
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async addBalance(
    userId: string,
    amount: number,
    description?: string,
    transactionId?: string
  ): Promise<WalletOperationResult> {
    try {
      if (amount <= 0) {
        return { success: false, error: 'Amount must be greater than 0' };
      }

      const { data, error } = await supabase.rpc('update_wallet_balance', {
        p_user_id: userId,
        p_amount: amount,
        p_transaction_id: transactionId ?? ''
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as any;

      if (result?.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        newBalance: Number(result?.new_balance ?? 0),
        transactionId: result?.transaction_id,
        message: `Added ${amount} to wallet`
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    try {
      // Use wallet_transactions or a view if available; fallback to empty
      const { data, error } = await supabase
        .from('active_sessions' as any)
        .select('*')
        .limit(0);

      // Transactions table doesn't exist in current schema — return empty
      return [];
    } catch (err) {
      console.error('Transaction history fetch failed:', err);
      return [];
    }
  }

  static async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const wallet = await this.getWallet(userId);
      if (!wallet) return false;
      return wallet.balance >= amount;
    } catch (err) {
      return false;
    }
  }

  static async getWalletSummary(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, balance, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching wallet summary:', error);
        return null;
      }

      return {
        balance: Number(data.balance ?? 0),
        earnings: 0,
        spent: 0,
        lastUpdated: data.updated_at
      };
    } catch (err) {
      console.error('Wallet summary fetch failed:', err);
      return null;
    }
  }
}

export default WalletService;
