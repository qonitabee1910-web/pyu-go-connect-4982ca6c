
DROP POLICY "System can insert transactions" ON public.wallet_transactions;
CREATE POLICY "Authenticated can insert transactions" ON public.wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));
