import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; spinning?: boolean }> = {
  provisioning: { label: "Restarting", variant: "secondary", spinning: true },
  running: { label: "Running", variant: "default" },
  stopped: { label: "Stopped", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
  deleted: { label: "Deleted", variant: "destructive" },
};

export function VmStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.spinning && <Loader2 className="h-3 w-3 animate-spin" />}
      {config.label}
    </Badge>
  );
}
