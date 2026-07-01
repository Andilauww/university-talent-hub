import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/app/opportunities")({ component: OpportunitiesPage });

function OpportunitiesPage() {
  const { data } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("*").order("deadline", { ascending: true });
      return data ?? [];
    },
  });
  return (
    <div>
      <PageHeader title="Opportunities" subtitle="Internships, competitions and openings for you." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((o) => (
          <div key={o.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-transform hover:-translate-y-1">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Briefcase className="h-5 w-5" /></div>
            <p className="font-bold text-foreground">{o.title}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="h-3.5 w-3.5" /> {o.company}</p>
            <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">{o.description}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><CalendarClock className="h-3.5 w-3.5" />{o.deadline ? `Due ${new Date(o.deadline).toLocaleDateString()}` : "No deadline"}</p>
          </div>
        ))}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No opportunities posted yet.</p>}
      </div>
    </div>
  );
}