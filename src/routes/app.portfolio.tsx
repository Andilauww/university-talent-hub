import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { uploadFile } from "@/lib/storage";
import { PORTFOLIO_CATEGORIES } from "@/lib/points";

export const Route = createFileRoute("/app/portfolio")({ component: PortfolioPage });

function PortfolioPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", project_link: "", category: "Personal" });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["my-portfolio", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("portfolio").select("*").eq("user_id", uid!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = async () => {
    if (!uid || !form.title.trim()) return;
    setSubmitting(true);
    try {
      let image: string | null = null;
      if (file) image = await uploadFile(file, `portfolio/${uid}`);
      const { error } = await supabase.from("portfolio").insert({ user_id: uid, ...form, image });
      if (error) throw error;
      toast.success("Portfolio submitted for review.");
      setOpen(false); setForm({ title: "", description: "", project_link: "", category: "Personal" }); setFile(null);
      qc.invalidateQueries({ queryKey: ["my-portfolio"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader title="Portfolio" subtitle="Showcase your projects and earn points by category."
        action={<Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-primary shadow-soft"><Plus className="mr-1.5 h-4 w-4" /> Add Project</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-foreground">{p.title}</p>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{p.category} · +{p.point} pts</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
            {p.project_link && (
              <a href={p.project_link} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> View project
              </a>
            )}
            {p.status === "rejected" && p.reason && <p className="mt-2 text-xs text-destructive">Reason: {p.reason}</p>}
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORTFOLIO_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label} (+{c.points})</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Project link</Label>
                <Input value={form.project_link} onChange={(e) => setForm({ ...form, project_link: e.target.value })} placeholder="https://…" className="rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label>Image (optional)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-accent/40">
                <Upload className="h-4 w-4" />{file ? file.name : "Upload cover image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={!form.title.trim() || submitting} className="bg-gradient-primary">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}