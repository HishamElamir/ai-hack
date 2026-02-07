"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/store";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Layout,
  BarChart3,
  Settings,
  LogOut,
  Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Hires", href: "/dashboard/new-hires", icon: Users },
  { label: "Questions", href: "/dashboard/questions", icon: MessageSquare, badgeKey: "pendingQuestionsCount" as const },
  { label: "Contracts", href: "/dashboard/contracts", icon: FileText },
  { label: "Templates", href: "/dashboard/templates", icon: Layout },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { pendingQuestionsCount } = useDashboardStore();
  const { logout, user } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-slate-950 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Bot className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">HR Platform</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const badge =
            item.badgeKey === "pendingQuestionsCount" ? pendingQuestionsCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                  {badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{user?.full_name ?? "HR User"}</p>
          <p className="text-xs text-slate-400">{user?.role ?? "hr_specialist"}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
