import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { uploadFile } from "@/lib/storage";
import { CERTIFICATE_LEVELS } from "@/lib/points";

export const Route = createFileRoute("/app/certificates")({ component: CertificatesPage });

function CertificatesPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("Local");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["my-certs", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("certificates").select("*").eq("user_id", uid!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = async () => {
    if (!uid || !title.trim()) return;
    setSubmitting(true);
    try {
      let proof: string | null = null;
      if (file) proof = await uploadFile(file, `certificates/${uid}`);
      const { error } = await supabase.from("certificates").insert({ user_id: uid, title: title.trim(), level, proof_file: proof });
      if (error) throw error;
      toast.success("Certificate submitted for review.");
      setOpen(false); setTitle(""); setLevel("Local"); setFile(null);
      qc.invalidateQueries({ queryKey: ["my-certs"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader title="Certificates" subtitle="Upload certificates. Higher levels earn more points."
        action={<Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-primary shadow-soft"><Plus className="mr-1.5 h-4 w-4" /> Add Certificate</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-foreground">{c.title}</p>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{c.level} · +{c.point} pts</p>
            {c.status === "rejected" && c.reason && <p className="mt-2 text-xs text-destructive">Reason: {c.reason}</p>}
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No certificates yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Certificate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label} (+{l.points})</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Proof (optional)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-accent/40">
                <Upload className="h-4 w-4" />{file ? file.name : "Upload certificate file"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={!title.trim() || submitting} className="bg-gradient-primary">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}