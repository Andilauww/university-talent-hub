import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  User,
  Wrench,
  Award,
  FolderKanban,
  Trophy,
  Gift,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";

const items: NavItem[] = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard },
  { label: "Profile", to: "/app/profile", icon: User },
  { label: "Skills", to: "/app/skills", icon: Wrench },
  { label: "Certificates", to: "/app/certificates", icon: Award },
  { label: "Portfolio", to: "/app/portfolio", icon: FolderKanban },
  { label: "Leaderboard", to: "/app/leaderboard", icon: Trophy },
  { label: "Rewards", to: "/app/rewards", icon: Gift },
  { label: "Opportunity", to: "/app/opportunities", icon: Briefcase },
  { label: "AI Recommendation", to: "/app/recommendations", icon: Sparkles },
];

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  return (
    <DashboardShell
      items={items}
      requiredRole="student"
      searchPlaceholder="Search opportunities, rewards…"
    >
      <Outlet />
    </DashboardShell>
  );
}