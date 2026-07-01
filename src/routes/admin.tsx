import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Gift,
  Trophy,
  Briefcase,
} from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";

const items: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Students", to: "/admin/students", icon: Users },
  { label: "Verification", to: "/admin/verification", icon: ShieldCheck },
  { label: "Rewards", to: "/admin/rewards", icon: Gift },
  { label: "Leaderboard", to: "/admin/leaderboard", icon: Trophy },
  { label: "Opportunity", to: "/admin/opportunities", icon: Briefcase },
];

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <DashboardShell
      items={items}
      requiredRole="admin"
      searchPlaceholder="Search students by name, skill, faculty…"
    >
      <Outlet />
    </DashboardShell>
  );
}