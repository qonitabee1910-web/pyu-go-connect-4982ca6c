
-- Create enums
CREATE TYPE public.wallet_type AS ENUM ('user', 'driver');
CREATE TYPE public.transaction_type AS ENUM ('top_up', 'ride_payment', 'ride_earning', 'withdrawal', 'refund', 'admin_adjustment');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');

-- Wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  wallet_type public.wallet_type NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update wallets" ON public.wallets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Wallet transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL DEFAULT 0,
  reference_id TEXT,
  description TEXT,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  payment_gateway TEXT,
  gateway_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert transactions" ON public.wallet_transactions FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_gateway_txn ON public.wallet_transactions(gateway_transaction_id);

-- Payment settings table
CREATE TABLE public.payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  commission_rate NUMERIC NOT NULL DEFAULT 0.1,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read payment settings" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment settings" ON public.payment_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_settings_updated_at BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic wallet transaction function
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_wallet_id UUID,
  p_type public.transaction_type,
  p_amount NUMERIC,
  p_description TEXT DEFAULT '',
  p_reference_id TEXT DEFAULT NULL,
  p_payment_gateway TEXT DEFAULT NULL,
  p_gateway_transaction_id TEXT DEFAULT NULL,
  p_status public.transaction_status DEFAULT 'completed'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_txn_id UUID;
BEGIN
  -- Lock the wallet row
  SELECT balance INTO v_current_balance FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Update balance
  UPDATE public.wallets SET balance = v_new_balance WHERE id = p_wallet_id;

  -- Insert transaction
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, balance_after, reference_id, description, status, payment_gateway, gateway_transaction_id)
  VALUES (p_wallet_id, p_type, p_amount, v_new_balance, p_reference_id, p_description, p_status, p_payment_gateway, p_gateway_transaction_id)
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
