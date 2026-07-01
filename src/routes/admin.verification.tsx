import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/admin/verification")({
  component: VerificationPage,
});

type Table = "skills" | "certificates" | "portfolio";

async function fetchPending(table: Table) {
  const cols =
    table === "skills"
      ? "id,skill_name,proof_file,point,created_at,profiles(fullname,avatar)"
      : table === "certificates"
        ? "id,title,level,proof_file,point,created_at,profiles(fullname,avatar)"
        : "id,title,description,category,project_link,image,point,created_at,profiles(fullname,avatar)";
  const { data } = await supabase
    .from(table)
    .select(cols)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
}

function VerificationPage() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<{ table: Table; id: string } | null>(null);
  const [reason, setReason] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pending"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["students"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  const approve = useMutation({
    mutationFn: async ({ table, id }: { table: Table; id: string }) => {
      const { error } = await supabase
        .from(table)
        .update({ status: "approved", reason: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission approved — points awarded.");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ table, id, reason }: { table: Table; id: string; reason: string }) => {
      const { error } = await supabase
        .from(table)
        .update({ status: "rejected", reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission rejected.");
      setRejectTarget(null);
      setReason("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Verification"
        subtitle="Review pending submissions. Approving a submission automatically awards points."
      />

      <Tabs defaultValue="skills">
        <TabsList className="rounded-xl">
          <TabsTrigger value="skills" className="rounded-lg">Skills</TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-lg">Certificates</TabsTrigger>
          <TabsTrigger value="portfolio" className="rounded-lg">Portfolio</TabsTrigger>
        </TabsList>

        {(["skills", "certificates", "portfolio"] as Table[]).map((table) => (
          <TabsContent key={table} value={table} className="mt-5">
            <PendingList
              table={table}
              onApprove={(id) => approve.mutate({ table, id })}
              onReject={(id) => {
                setRejectTarget({ table, id });
                setReason("");
              }}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectTarget && reject.mutate({ ...rejectTarget, reason })
              }
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingList({
  table,
  onApprove,
  onReject,
}: {
  table: Table;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["pending", table],
    queryFn: () => fetchPending(table),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No pending {table} submissions. 🎉
      </div>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">
                {item.skill_name ?? item.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.profiles?.fullname ?? "Unknown"}
                {item.level && ` · ${item.level}`}
                {item.category && ` · ${item.category}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
              +{item.point} pts
            </span>
          </div>

          {item.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}

          <Preview item={item} />

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={() => onApprove(item.id)}
              className="flex-1 rounded-lg bg-success text-success-foreground hover:bg-success/90"
            >
              <Check className="mr-1.5 h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(item.id)}
              className="flex-1 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <X className="mr-1.5 h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Preview({ item }: { item: any }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const file = item.proof_file ?? item.image;

  const openPreview = async () => {
    if (item.project_link) {
      window.open(item.project_link, "_blank", "noopener");
      return;
    }
    if (!file) return;
    setLoading(true);
    const signed = await getSignedUrl(file);
    setUrl(signed);
    setLoading(false);
    if (signed) window.open(signed, "_blank", "noopener");
  };

  if (!file && !item.project_link) return null;

  return (
    <button
      onClick={openPreview}
      disabled={loading}
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
    >
      {item.project_link ? (
        <ExternalLink className="h-4 w-4" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {loading ? "Opening…" : item.project_link ? "View project" : "View proof"}
    </button>
  );
}