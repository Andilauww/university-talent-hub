import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Gift, Star } from "lucide-react";
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

export const Route = createFileRoute("/admin/rewards")({
  component: RewardsPage,
});

interface Reward {
  id: string;
  title: string;
  description: string | null;
  required_points: number;
  image: string | null;
}

const empty = { title: "", description: "", required_points: 10, image: "" };

function RewardsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data } = await supabase.from("rewards").select("*").order("required_points");
      return (data ?? []) as Reward[];
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
        description: form.description,
        required_points: Number(form.required_points),
        image: form.image || null,
      };
      if (editId) {
        const { error } = await supabase.from("rewards").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rewards").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Reward updated." : "Reward created.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["rewards"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rewards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward deleted.");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["rewards"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (r: Reward) => {
    setEditId(r.id);
    setForm({
      title: r.title,
      description: r.description ?? "",
      required_points: r.required_points,
      image: r.image ?? "",
    });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Reward Management"
        subtitle="Create and manage rewards students can redeem with their points."
        action={
          <Button onClick={openCreate} className="rounded-xl bg-gradient-primary shadow-soft">
            <Plus className="mr-1.5 h-4 w-4" /> New Reward
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((r) => (
          <div
            key={r.id}
            className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-soft"
          >
            <div className="relative h-36 bg-gradient-soft">
              {r.image ? (
                <img src={r.image} alt={r.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-primary">
                  <Gift className="h-10 w-10" />
                </div>
              )}
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-bold text-primary backdrop-blur">
                <Star className="h-3 w-3 fill-primary" />
                {r.required_points} pts
              </span>
            </div>
            <div className="p-4">
              <p className="font-bold text-foreground">{r.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {r.description}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(r)}
                  className="flex-1 rounded-lg"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteId(r.id)}
                  className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Reward" : "New Reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Required Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.required_points}
                  onChange={(e) =>
                    setForm({ ...form, required_points: Number(e.target.value) })
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://…"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.title || save.isPending}
              className="bg-gradient-primary"
            >
              {editId ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reward?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
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