import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Briefcase, CalendarClock, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/opportunities")({
  component: OpportunitiesPage,
});

interface Opportunity {
  id: string;
  title: string;
  company: string | null;
  description: string | null;
  deadline: string | null;
}

const empty = { title: "", company: "", description: "", deadline: "" };

function OpportunitiesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("*")
        .order("deadline", { ascending: true });
      return (data ?? []) as Opportunity[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        company: form.company,
        description: form.description,
        deadline: form.deadline || null,
      };
      if (editId) {
        const { error } = await supabase.from("opportunities").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("opportunities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Opportunity updated." : "Opportunity created.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opportunity deleted.");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (o: Opportunity) => {
    setEditId(o.id);
    setForm({
      title: o.title,
      company: o.company ?? "",
      description: o.description ?? "",
      deadline: o.deadline ?? "",
    });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Publish internships, competitions and openings for students."
        action={
          <Button onClick={openCreate} className="rounded-xl bg-gradient-primary shadow-soft">
            <Plus className="mr-1.5 h-4 w-4" /> New Opportunity
          </Button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((o) => (
          <div
            key={o.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft"
          >
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <p className="font-bold text-foreground">{o.title}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> {o.company}
            </p>
            <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
              {o.description}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-warning-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {o.deadline ? `Due ${new Date(o.deadline).toLocaleDateString()}` : "No deadline"}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(o)} className="flex-1 rounded-lg">
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteId(o.id)}
                className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Opportunity" : "New Opportunity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending} className="bg-gradient-primary">
              {editId ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && remove.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}