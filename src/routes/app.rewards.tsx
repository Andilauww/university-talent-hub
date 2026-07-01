import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Star, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/rewards")({ component: RewardsPage });

function RewardsPage() {
  const { session, profile } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const points = profile?.total_points ?? 0;

  const { data } = useQuery({
    queryKey: ["reward-catalog", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [rewards, claims] = await Promise.all([
        supabase.from("rewards").select("*").order("required_points"),
        supabase.from("reward_claims").select("reward_id,status").eq("user_id", uid!),
      ]);
      return { rewards: rewards.data ?? [], claims: claims.data ?? [] };
    },
  });

  const claim = async (rewardId: string) => {
    if (!uid) return;
    const { error } = await supabase.from("reward_claims").insert({ reward_id: rewardId, user_id: uid });
    if (error) toast.error(error.message);
    else { toast.success("Reward claimed! Awaiting fulfillment."); qc.invalidateQueries({ queryKey: ["reward-catalog"] }); }
  };

  return (
    <div>
      <PageHeader title="Rewards" subtitle={`You have ${points} points to spend.`} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data?.rewards.map((r) => {
          const claimed = data.claims.find((c) => c.reward_id === r.id);
          const affordable = points >= r.required_points;
          return (
            <div key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform hover:-translate-y-1">
              <div className="relative h-36 bg-gradient-soft">
                {r.image ? <img src={r.image} alt={r.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><Gift className="h-10 w-10" /></div>}
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-bold text-primary backdrop-blur"><Star className="h-3 w-3 fill-primary" />{r.required_points}</span>
              </div>
              <div className="p-4">
                <p className="font-bold text-foreground">{r.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                {claimed ? (
                  <Button disabled className="mt-4 w-full rounded-xl" variant="outline"><Check className="mr-1.5 h-4 w-4" /> Claimed</Button>
                ) : (
                  <Button onClick={() => claim(r.id)} disabled={!affordable} className="mt-4 w-full rounded-xl bg-gradient-primary disabled:opacity-60">
                    {affordable ? "Claim reward" : <><Lock className="mr-1.5 h-4 w-4" /> Need {r.required_points - points} more</>}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}