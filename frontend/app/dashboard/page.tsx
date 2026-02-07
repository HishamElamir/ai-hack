"use client";

import { useQuery } from "@tanstack/react-query";
import { newHiresApi } from "@/lib/api";
import { useDashboardStore } from "@/lib/store";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle, Clock, MessageSquare, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";
import type { DashboardStatistics, NewHireListItem } from "@/lib/types";
import { format } from "date-fns";

export default function DashboardPage() {
  const router = useRouter();
  const { setStatistics, setNewHires } = useDashboardStore();

  const { data: statsData } = useQuery({
    queryKey: ["statistics"],
    queryFn: () => newHiresApi.getStatistics(),
  });

  const { data: hiresData, isLoading } = useQuery({
    queryKey: ["newHires", { page: 1, per_page: 10 }],
    queryFn: () => newHiresApi.list({ page: 1, per_page: 10 }),
  });

  const stats: DashboardStatistics | null = statsData?.data ?? null;
  const hires: NewHireListItem[] = hiresData?.data?.data ?? [];

  useEffect(() => {
    if (stats) setStatistics(stats);
    if (hires.length) setNewHires(hires);
  }, [stats, hires, setStatistics, setNewHires]);

  const statCards = [
    {
      label: "Total New Hires",
      value: stats?.total_new_hires ?? 0,
      icon: Users,
      change: stats?.this_month?.new_hires_created,
      trend: "up" as const,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completion Rate",
      value: `${stats?.completion_rate ?? 0}%`,
      icon: CheckCircle,
      change: null,
      trend: "up" as const,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Avg. Time to Complete",
      value: `${stats?.average_time_to_complete_hours ?? 0}h`,
      icon: Clock,
      change: null,
      trend: "down" as const,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Pending Questions",
      value: stats?.pending_questions ?? 0,
      icon: MessageSquare,
      change: null,
      trend: "up" as const,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your onboarding pipeline</p>
        </div>
        <Link href="/dashboard/new-hires/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Hire
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.change !== null && card.change !== undefined && (
                <p className="mt-1 flex items-center text-xs text-green-600">
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                  {card.change} this month
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent New Hires */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent New Hires</CardTitle>
          <Link href="/dashboard/new-hires">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Position</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Progress</th>
                    <th className="pb-3 font-medium">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {hires.map((hire) => (
                    <tr
                      key={hire.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/new-hires/${hire.id}`)}
                    >
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{hire.full_name}</p>
                          <p className="text-xs text-muted-foreground">{hire.email}</p>
                        </div>
                      </td>
                      <td className="py-3 text-sm">{hire.position}</td>
                      <td className="py-3 text-sm">{hire.department}</td>
                      <td className="py-3">
                        <Badge className={STATUS_COLORS[hire.status] ?? "bg-gray-100 text-gray-800"} variant="secondary">
                          {STATUS_LABELS[hire.status] ?? hire.status}
                        </Badge>
                      </td>
                      <td className="py-3 w-32">
                        <div className="flex items-center gap-2">
                          <Progress value={hire.progress_percentage} className="h-2" />
                          <span className="text-xs text-muted-foreground">{hire.progress_percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {format(new Date(hire.start_date), "MMM dd, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
