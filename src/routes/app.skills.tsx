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
import { uploadFile } from "@/lib/storage";

export const Route = createFileRoute("/app/skills")({ component: SkillsPage });

function SkillsPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["my-skills", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("skills").select("*").eq("user_id", uid!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = async () => {
    if (!uid || !name.trim()) return;
    setSubmitting(true);
    try {
      let proof: string | null = null;
      if (file) proof = await uploadFile(file, `skills/${uid}`);
      const { error } = await supabase.from("skills").insert({ user_id: uid, skill_name: name.trim(), proof_file: proof });
      if (error) throw error;
      toast.success("Skill submitted for review.");
      setOpen(false); setName(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["my-skills"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader title="Skills" subtitle="Add skills with proof. Points are awarded after admin approval."
        action={<Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-primary shadow-soft"><Plus className="mr-1.5 h-4 w-4" /> Add Skill</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <p className="font-bold text-foreground">{s.skill_name}</p>
              <StatusBadge status={s.status} />
            </div>
            {s.status === "rejected" && s.reason && (
              <p className="mt-2 text-xs text-destructive">Reason: {s.reason}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">+{s.point} pts on approval</p>
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No skills yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Skill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Skill name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. React" className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Proof (optional)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-accent/40">
                <Upload className="h-4 w-4" />{file ? file.name : "Upload certificate / screenshot"}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={!name.trim() || submitting} className="bg-gradient-primary">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}