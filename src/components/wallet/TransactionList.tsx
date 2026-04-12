import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle, RefreshCw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  status: string;
  payment_gateway: string | null;
  created_at: string;
};

const typeConfig: Record<string, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
  top_up: { label: "Top Up", icon: ArrowDownLeft, color: "text-green-500" },
  ride_payment: { label: "Ride Payment", icon: ArrowUpRight, color: "text-red-500" },
  ride_earning: { label: "Ride Earning", icon: ArrowDownLeft, color: "text-green-500" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, color: "text-orange-500" },
  refund: { label: "Refund", icon: RefreshCw, color: "text-blue-500" },
  admin_adjustment: { label: "Adjustment", icon: Wrench, color: "text-muted-foreground" },
};

const statusIcon: Record<string, typeof Clock> = {
  pending: Clock,
  completed: CheckCircle,
  failed: XCircle,
};

export function TransactionList({ transactions, isLoading }: { transactions: Transaction[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return <p className="text-center text-muted-foreground py-8 text-sm">No transactions yet</p>;
  }

  return (
    <div className="space-y-2">
      {transactions.map((txn) => {
        const config = typeConfig[txn.type] || typeConfig.admin_adjustment;
        const Icon = config.icon;
        const StatusIcon = statusIcon[txn.status] || Clock;
        const isPositive = txn.amount > 0;

        return (
          <div key={txn.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center bg-muted", config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{config.label}</p>
                <StatusIcon className={cn("w-3.5 h-3.5", txn.status === "completed" ? "text-green-500" : txn.status === "failed" ? "text-red-500" : "text-yellow-500")} />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {txn.description || config.label}
                {txn.payment_gateway && ` · ${txn.payment_gateway}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("text-sm font-semibold", isPositive ? "text-green-500" : "text-red-500")}>
                {isPositive ? "+" : ""}Rp {Math.abs(txn.amount).toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(txn.created_at), "dd MMM HH:mm")}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
