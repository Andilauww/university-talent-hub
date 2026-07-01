import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { Leaderboard } from "@/components/Leaderboard";

export const Route = createFileRoute("/admin/leaderboard")({
  component: () => (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle="Top 10 students ranked by total verified points."
      />
      <Leaderboard />
    </div>
  ),
});