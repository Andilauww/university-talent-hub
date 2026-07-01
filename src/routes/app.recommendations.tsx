import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { getRecommendations } from "@/lib/points";

export const Route = createFileRoute("/app/recommendations")({ component: RecommendationsPage });

function RecommendationsPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const { data: skills } = useQuery({
    queryKey: ["rec-skills", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("skills").select("skill_name").eq("user_id", uid!);
      return (data ?? []).map((s) => s.skill_name);
    },
  });

  const recs = getRecommendations(skills ?? []);

  return (
    <div>
      <PageHeader title="AI Recommendation" subtitle="Personalized suggestions generated from your skills." />
      {recs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-semibold text-foreground">No recommendations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add skills like React, Python, or UI UX to unlock tailored suggestions.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {recs.map((rec) => (
            <div key={rec.skill}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-gradient-primary px-3 py-1 text-sm font-bold text-primary-foreground">{rec.skill}</span>
                <span className="text-sm text-muted-foreground">Because you have this skill</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {rec.items.map((item, i) => (
                  <div key={i} className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
                    <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">{item.type}</span>
                    <p className="mt-3 font-bold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Recommended <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}