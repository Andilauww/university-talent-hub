import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

async function fetchLeaderboard() {
  const { data } = await supabase
    .from("profiles")
    .select("id,fullname,avatar,total_points,major")
    .eq("role", "student")
    .order("total_points", { ascending: false })
    .limit(10);
  return data ?? [];
}

const PODIUM = [
  { ring: "ring-warning", bg: "bg-warning/15", icon: Crown, text: "text-warning-foreground" },
  { ring: "ring-muted-foreground/40", bg: "bg-secondary", icon: Medal, text: "text-muted-foreground" },
  { ring: "ring-chart-5/50", bg: "bg-chart-5/15", icon: Medal, text: "text-chart-5" },
];

export function Leaderboard({ highlightId }: { highlightId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0)
    return <p className="text-sm text-muted-foreground">No ranked students yet.</p>;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {top3.map((s, i) => {
          const cfg = PODIUM[i];
          const Icon = cfg.icon;
          return (
            <div
              key={s.id}
              className={cn(
                "relative flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-transform hover:-translate-y-1",
                i === 0 && "sm:-translate-y-2 sm:shadow-glow",
              )}
            >
              <span
                className={cn(
                  "absolute -top-3 grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold",
                  cfg.bg,
                  cfg.text,
                )}
              >
                {i + 1}
              </span>
              <Avatar className={cn("h-16 w-16 ring-4", cfg.ring)}>
                <AvatarImage src={s.avatar ?? undefined} />
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {initials(s.fullname)}
                </AvatarFallback>
              </Avatar>
              <Icon className={cn("mt-3 h-5 w-5", cfg.text)} />
              <p className="mt-1 font-bold text-foreground">{s.fullname}</p>
              <p className="text-xs text-muted-foreground">{s.major}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-lg font-extrabold text-primary">
                <Star className="h-4 w-4 fill-primary" />
                {s.total_points}
              </p>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <ul className="divide-y divide-border">
            {rest.map((s, i) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors",
                  highlightId === s.id ? "bg-accent/60" : "hover:bg-secondary/40",
                )}
              >
                <span className="w-6 text-center font-bold text-muted-foreground">
                  {i + 4}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={s.avatar ?? undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {initials(s.fullname)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{s.fullname}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.major}</p>
                </div>
                <span className="inline-flex items-center gap-1 font-bold text-primary">
                  <Star className="h-3.5 w-3.5 fill-primary" />
                  {s.total_points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}