import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, Wrench, Award, FolderKanban, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/app/")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { session, profile } = useAuth();
  const uid = session?.user.id;

  const { data } = useQuery({
    queryKey: ["my-summary", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [skills, certs, portfolio] = await Promise.all([
        supabase.from("skills").select("status,skill_name,created_at").eq("user_id", uid!),
        supabase.from("certificates").select("status,title,created_at").eq("user_id", uid!),
        supabase.from("portfolio").select("status,title,created_at").eq("user_id", uid!),
      ]);
      const s = skills.data ?? [];
      const c = certs.data ?? [];
      const p = portfolio.data ?? [];
      const recent = [
        ...s.map((x) => ({ ...x, kind: "Skill", title: x.skill_name })),
        ...c.map((x) => ({ ...x, kind: "Certificate" })),
        ...p.map((x) => ({ ...x, kind: "Portfolio" })),
      ]
        .sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 6);
      return {
        skills: s.filter((x) => x.status === "approved").length,
        certs: c.filter((x) => x.status === "approved").length,
        portfolio: p.filter((x) => x.status === "approved").length,
        recent,
      };
    },
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile?.fullname?.split(" ")[0] ?? "there"} 👋`}
        subtitle="Track your progress, submit achievements and climb the leaderboard."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Points" value={profile?.total_points ?? 0} icon={Star} />
        <StatCard label="Verified Skills" value={data?.skills ?? 0} icon={Wrench} accent="bg-success/12 text-success" />
        <StatCard label="Verified Certificates" value={data?.certs ?? 0} icon={Award} accent="bg-chart-2/15 text-chart-2" />
        <StatCard label="Verified Portfolio" value={data?.portfolio ?? 0} icon={FolderKanban} accent="bg-chart-5/15 text-chart-5" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h2 className="text-lg font-bold text-foreground">Recent Submissions</h2>
          </div>
          {data && data.recent.length ? (
            <ul className="divide-y divide-border">
              {data.recent.map((r: any, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground text-xs font-bold">
                    {r.kind[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.kind}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">No submissions yet — start adding your skills!</div>
          )}
        </div>

        <Link
          to="/app/recommendations"
          className="group flex h-fit flex-col justify-between rounded-2xl bg-gradient-primary p-6 text-primary-foreground shadow-soft transition-transform hover:-translate-y-1"
        >
          <Sparkles className="h-8 w-8" />
          <div>
            <p className="mt-4 text-lg font-bold">AI Recommendations</p>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Get personalized internships, competitions and projects based on your skills.
            </p>
            <p className="mt-4 text-sm font-semibold underline-offset-4 group-hover:underline">
              Explore now →
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}