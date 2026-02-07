"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { questionsApi } from "@/lib/api";
import { useAuthStore, useDashboardStore } from "@/lib/store";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  const { setQuestions } = useDashboardStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const init = async () => {
      try {
        const { data } = await authApi.me();
        setUser(data);

        // Load pending questions count
        try {
          const qRes = await questionsApi.list({ status: "pending", per_page: 100 });
          setQuestions(qRes.data.data ?? []);
        } catch { /* ignore */ }
      } catch {
        localStorage.removeItem("access_token");
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    if (!user) {
      init();
    } else {
      setLoading(false);
    }
  }, [router, user, setUser, setQuestions]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated && !loading) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
