import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, Plus, Filter } from "lucide-react";
import { TransactionList } from "@/components/wallet/TransactionList";
import { TopUpDialog } from "@/components/wallet/TopUpDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Wallet() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Wallet balance
  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user.id).single();
      if (!data) {
        // Auto-create wallet
        const { data: newW } = await supabase.from("wallets").insert({ user_id: user.id, wallet_type: "user" as const }).select("*").single();
        return newW;
      }
      return data;
    },
    enabled: !!user,
  });

  // Transactions
  const { data: transactions = [], isLoading: txnLoading } = useQuery({
    queryKey: ["wallet-transactions", wallet?.id, filterType],
    queryFn: async () => {
      if (!wallet) return [];
      let q = supabase.from("wallet_transactions").select("*").eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(50);
      if (filterType !== "all") q = q.eq("type", filterType as any);
      const { data } = await q;
      return data || [];
    },
    enabled: !!wallet,
  });

  // Active gateways
  const { data: gateways = [] } = useQuery({
    queryKey: ["payment-gateways"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_settings").select("gateway, is_default, is_active").eq("is_active", true);
      return data || [];
    },
  });

  // Realtime subscription for wallet balance updates
  useEffect(() => {
    if (!wallet) return;
    const channel = supabase
      .channel("wallet-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `id=eq.${wallet.id}` }, () => {
        refetchWallet();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallet?.id, refetchWallet]);

  if (authLoading) return <div className="min-h-screen bg-background" />;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary to-primary/70 rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-center gap-2 mb-1">
          <WalletIcon className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">My Wallet</span>
        </div>
        <p className="text-3xl font-bold mb-4">
          Rp {(wallet?.balance || 0).toLocaleString("id-ID")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTopUpOpen(true)}
          disabled={gateways.length === 0}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Top Up
        </Button>
        {gateways.length === 0 && (
          <p className="text-xs opacity-70 mt-2">No payment gateway active. Contact admin.</p>
        )}
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Transaction History</h2>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="top_up">Top Up</SelectItem>
              <SelectItem value="ride_payment">Ride Payment</SelectItem>
              <SelectItem value="ride_earning">Earnings</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TransactionList transactions={transactions as any} isLoading={txnLoading} />
      </div>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} activeGateways={gateways} />
    </div>
  );
}
