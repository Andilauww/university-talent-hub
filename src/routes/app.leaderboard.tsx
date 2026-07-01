import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Leaderboard } from "@/components/Leaderboard";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/leaderboard")({ component: LeaderboardPage });

function LeaderboardPage() {
  const { session } = useAuth();
  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="See where you rank among the top talent." />
      <Leaderboard highlightId={session?.user.id} />
    </div>
  );
}