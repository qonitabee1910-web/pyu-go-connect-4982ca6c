import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function AdminPayments() {
  const queryClient = useQueryClient();

  // Payment settings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-payment-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_settings").select("*").order("gateway");
      return data || [];
    },
  });

  // All transactions
  const { data: transactions = [], isLoading: txnLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("wallet_transactions").select("*, wallets(user_id, wallet_type)").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  // Toggle gateway active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("payment_settings").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      toast.success("Gateway updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Set default
  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, gateway }: { id: string; gateway: string }) => {
      // Unset all defaults first
      await supabase.from("payment_settings").update({ is_default: false }).neq("id", id);
      const { error } = await supabase.from("payment_settings").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      toast.success("Default gateway updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update commission
  const commissionMutation = useMutation({
    mutationFn: async ({ id, commission_rate }: { id: string; commission_rate: number }) => {
      const { error } = await supabase.from("payment_settings").update({ commission_rate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      toast.success("Commission updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Payment Settings</h1>

      {/* Gateway cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((gw: any) => (
          <GatewayCard
            key={gw.id}
            gw={gw}
            onToggle={(active) => toggleMutation.mutate({ id: gw.id, is_active: active })}
            onSetDefault={() => setDefaultMutation.mutate({ id: gw.id, gateway: gw.gateway })}
            onCommissionChange={(rate) => commissionMutation.mutate({ id: gw.id, commission_rate: rate })}
          />
        ))}
      </div>

      {/* All transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {txnLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn: any) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(txn.created_at), "dd MMM yy HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{txn.type.replace("_", " ")}</Badge></TableCell>
                      <TableCell className={txn.amount > 0 ? "text-green-600" : "text-red-600"}>
                        Rp {Math.abs(txn.amount).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={txn.status === "completed" ? "default" : txn.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{txn.payment_gateway || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{txn.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!transactions.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GatewayCard({ gw, onToggle, onSetDefault, onCommissionChange }: {
  gw: any;
  onToggle: (active: boolean) => void;
  onSetDefault: () => void;
  onCommissionChange: (rate: number) => void;
}) {
  const [commission, setCommission] = useState<string>(String((gw.commission_rate || 0.1) * 100));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize flex items-center gap-2">
            {gw.gateway}
            {gw.is_default && <Badge className="text-[10px]">Default</Badge>}
          </CardTitle>
          <Switch checked={gw.is_active} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Commission (%)</Label>
          <Input
            type="number"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            className="h-8 w-20 text-xs"
            min="0"
            max="50"
            step="0.5"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onCommissionChange(Number(commission) / 100)}
          >
            Save
          </Button>
        </div>
        {!gw.is_default && gw.is_active && (
          <Button size="sm" variant="ghost" className="text-xs" onClick={onSetDefault}>
            Set as Default
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground">
          Environment: {gw.config?.environment || "sandbox"}
        </p>
      </CardContent>
    </Card>
  );
}
