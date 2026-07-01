import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadFile, getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const uid = session?.user.id;
  const [form, setForm] = useState({
    fullname: "", faculty: "", major: "", semester: "", bio: "", avatar: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        fullname: profile.fullname ?? "",
        faculty: profile.faculty ?? "",
        major: profile.major ?? "",
        semester: profile.semester?.toString() ?? "",
        bio: profile.bio ?? "",
        avatar: profile.avatar ?? "",
      });
      getSignedUrl(profile.avatar).then(setAvatarUrl);
    }
  }, [profile]);

  const { data: skills } = useQuery({
    queryKey: ["my-skill-tags", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("skills").select("skill_name,status").eq("user_id", uid!);
      return data ?? [];
    },
  });

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    try {
      const path = await uploadFile(file, `avatars/${uid}`);
      setForm((f) => ({ ...f, avatar: path }));
      setAvatarUrl(await getSignedUrl(path));
      toast.success("Avatar uploaded — remember to save.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        fullname: form.fullname,
        faculty: form.faculty,
        major: form.major,
        semester: form.semester ? Number(form.semester) : null,
        bio: form.bio,
        avatar: form.avatar || null,
      })
      .eq("id", uid);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated.");
      refreshProfile();
    }
  };

  return (
    <div>
      <PageHeader title="Profile" subtitle="Keep your profile up to date so admins can discover your talent." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <Avatar className="mx-auto h-24 w-24">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="bg-accent text-2xl text-accent-foreground">
              {form.fullname.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="mt-4 font-bold text-foreground">{form.fullname || "Your name"}</p>
          <p className="text-sm text-muted-foreground">{profile?.total_points ?? 0} points</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Change avatar
            <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          </label>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {(skills ?? []).map((s, i) => (
              <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {s.skill_name}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} className="rounded-xl" /></Field>
            <Field label="Faculty"><Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} className="rounded-xl" /></Field>
            <Field label="Major"><Input value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} className="rounded-xl" /></Field>
            <Field label="Semester"><Input type="number" min={1} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="rounded-xl" /></Field>
          </div>
          <div className="mt-4">
            <Field label="Bio"><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="rounded-xl" /></Field>
          </div>
          <Button onClick={save} disabled={saving} className="mt-5 rounded-xl bg-gradient-primary">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}