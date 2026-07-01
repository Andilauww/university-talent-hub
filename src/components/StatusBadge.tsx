import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const MAP: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  approved: {
    label: "Approved",
    className: "bg-success/12 text-success",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    className: "bg-warning/15 text-warning-foreground",
    icon: Clock,
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/12 text-destructive",
    icon: XCircle,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = MAP[status] ?? MAP.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        cfg.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}