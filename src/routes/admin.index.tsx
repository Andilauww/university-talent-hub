import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  ShieldCheck,
  FolderKanban,
  Clock,
  Gift,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface Submission {
  id: string;
  title: string;
  kind: string;
  status: string;
  created_at: string;
  student: string;
}

async function fetchStats() {
  const [profiles, skills, certs, portfolio, rewards, opps] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("skills").select("id,status,skill_name,created_at,profiles(fullname)"),
    supabase.from("certificates").select("id,status,title,created_at,profiles(fullname)"),
    supabase.from("portfolio").select("id,status,title,created_at,profiles(fullname)"),
    supabase.from("rewards").select("id", { count: "exact", head: true }),
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
  ]);

  const skillRows = skills.data ?? [];
  const certRows = certs.data ?? [];
  const portfolioRows = portfolio.data ?? [];

  const pending =
    skillRows.filter((s) => s.status === "pending").length +
    certRows.filter((c) => c.status === "pending").length +
    portfolioRows.filter((p) => p.status === "pending").length;

  const recent: Submission[] = [
    ...skillRows.map((s: any) => ({
      id: s.id,
      title: s.skill_name,
      kind: "Skill",
      status: s.status,
      created_at: s.created_at,
      student: s.profiles?.fullname ?? "Unknown",
    })),
    ...certRows.map((c: any) => ({
      id: c.id,
      title: c.title,
      kind: "Certificate",
      status: c.status,
      created_at: c.created_at,
      student: c.profiles?.fullname ?? "Unknown",
    })),
    ...portfolioRows.map((p: any) => ({
      id: p.id,
      title: p.title,
      kind: "Portfolio",
      status: p.status,
      created_at: p.created_at,
      student: p.profiles?.fullname ?? "Unknown",
    })),
  ]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8);

  return {
    totalStudents: profiles.count ?? 0,
    verifiedSkills: skillRows.filter((s) => s.status === "approved").length,
    verifiedPortfolio: portfolioRows.filter((p) => p.status === "approved").length,
    pending,
    totalRewards: rewards.count ?? 0,
    totalOpps: opps.count ?? 0,
    recent,
  };
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of student talent activity across the university."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Students" value={data?.totalStudents ?? 0} icon={Users} />
        <StatCard
          label="Verified Skills"
          value={data?.verifiedSkills ?? 0}
          icon={ShieldCheck}
          accent="bg-success/12 text-success"
        />
        <StatCard
          label="Verified Portfolio"
          value={data?.verifiedPortfolio ?? 0}
          icon={FolderKanban}
          accent="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Pending Verification"
          value={data?.pending ?? 0}
          icon={Clock}
          accent="bg-warning/15 text-warning-foreground"
        />
        <StatCard
          label="Total Rewards"
          value={data?.totalRewards ?? 0}
          icon={Gift}
          accent="bg-chart-5/15 text-chart-5"
        />
        <StatCard
          label="Total Opportunities"
          value={data?.totalOpps ?? 0}
          icon={Briefcase}
          accent="bg-primary/10 text-primary"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">Recent Submissions</h2>
          <span className="text-sm text-muted-foreground">Latest activities</span>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : data && data.recent.length > 0 ? (
          <ul className="divide-y divide-border">
            {data.recent.map((s) => (
              <li
                key={`${s.kind}-${s.id}`}
                className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-secondary/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground text-xs font-bold">
                  {s.kind[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {s.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.kind} · {s.student}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">No submissions yet.</div>
        )}
      </div>
    </div>
  );
}