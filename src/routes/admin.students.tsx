import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Star, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, useDashboardSearch } from "@/components/dashboard/DashboardShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/admin/students")({
  component: StudentsPage,
});

async function fetchStudents() {
  const [{ data: profiles }, { data: skills }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("total_points", { ascending: false }),
    supabase.from("skills").select("id,user_id,skill_name,status"),
  ]);
  const skillsByUser = new Map<string, { skill_name: string; status: string }[]>();
  (skills ?? []).forEach((s) => {
    const arr = skillsByUser.get(s.user_id) ?? [];
    arr.push({ skill_name: s.skill_name, status: s.status });
    skillsByUser.set(s.user_id, arr);
  });
  return { profiles: profiles ?? [], skillsByUser };
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function StudentsPage() {
  const { query } = useDashboardSearch();
  const { data } = useQuery({ queryKey: ["students"], queryFn: fetchStudents });
  const [skillFilter, setSkillFilter] = useState("all");
  const [pointsFilter, setPointsFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    data?.skillsByUser.forEach((arr) => arr.forEach((s) => set.add(s.skill_name)));
    return Array.from(set).sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.profiles.filter((p) => {
      const skills = data.skillsByUser.get(p.id) ?? [];
      const matchQuery =
        !q ||
        p.fullname.toLowerCase().includes(q) ||
        (p.faculty ?? "").toLowerCase().includes(q) ||
        (p.major ?? "").toLowerCase().includes(q) ||
        String(p.total_points).includes(q) ||
        skills.some((s) => s.skill_name.toLowerCase().includes(q));
      const matchSkill =
        skillFilter === "all" || skills.some((s) => s.skill_name === skillFilter);
      const matchPoints =
        pointsFilter === "all" ||
        (pointsFilter === "0-10" && p.total_points <= 10) ||
        (pointsFilter === "11-30" && p.total_points > 10 && p.total_points <= 30) ||
        (pointsFilter === "30+" && p.total_points > 30);
      return matchQuery && matchSkill && matchPoints;
    });
  }, [data, query, skillFilter, pointsFilter]);

  const detail = data?.profiles.find((p) => p.id === detailId);
  const detailSkills = detailId ? data?.skillsByUser.get(detailId) ?? [] : [];

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Browse, search and inspect every student in the talent pool."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-full rounded-xl sm:w-56">
            <SelectValue placeholder="Filter by skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skills</SelectItem>
            {allSkills.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pointsFilter} onValueChange={setPointsFilter}>
          <SelectTrigger className="w-full rounded-xl sm:w-48">
            <SelectValue placeholder="Filter by points" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All points</SelectItem>
            <SelectItem value="0-10">0 – 10</SelectItem>
            <SelectItem value="11-30">11 – 30</SelectItem>
            <SelectItem value="30+">30+</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {rows.length} student{rows.length !== 1 && "s"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3.5 font-semibold">Student</th>
                <th className="px-6 py-3.5 font-semibold">Faculty</th>
                <th className="px-6 py-3.5 font-semibold">Major</th>
                <th className="px-6 py-3.5 font-semibold">Points</th>
                <th className="px-6 py-3.5 font-semibold">Verified Skills</th>
                <th className="px-6 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => {
                const skills = data?.skillsByUser.get(p.id) ?? [];
                const verified = skills.filter((s) => s.status === "approved").length;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={p.avatar ?? undefined} />
                          <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                            {initials(p.fullname)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground">
                          {p.fullname}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{p.faculty}</td>
                    <td className="px-6 py-3 text-muted-foreground">{p.major}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 font-bold text-primary">
                        <Star className="h-3.5 w-3.5 fill-primary" />
                        {p.total_points}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{verified}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setDetailId(p.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No students match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Detail</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={detail.avatar ?? undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {initials(detail.fullname)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold text-foreground">{detail.fullname}</p>
                  <p className="text-sm text-muted-foreground">{detail.email}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-primary">
                    <Star className="h-3.5 w-3.5 fill-primary" />
                    {detail.total_points} points
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Faculty" value={detail.faculty} />
                <Info label="Major" value={detail.major} />
                <Info label="Semester" value={detail.semester?.toString()} />
                <Info label="Skills" value={String(detailSkills.length)} />
              </div>
              {detail.bio && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Bio</p>
                  <p className="mt-1 text-sm text-foreground">{detail.bio}</p>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {detailSkills.length ? (
                    detailSkills.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        {s.skill_name}
                        {s.status === "approved" && (
                          <GraduationCap className="h-3 w-3 text-success" />
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No skills yet.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value || "—"}</p>
    </div>
  );
}