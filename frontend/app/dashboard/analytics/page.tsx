"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Clock, MessageSquare, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import type { AnalyticsOverview, ConversationAnalytics } from "@/lib/types";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function AnalyticsPage() {
  const { data: overviewData } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => analyticsApi.overview(),
  });

  const { data: convData } = useQuery({
    queryKey: ["analytics", "conversations"],
    queryFn: () => analyticsApi.conversations(),
  });

  const overview: AnalyticsOverview | null = overviewData?.data ?? null;
  const convAnalytics: ConversationAnalytics | null = convData?.data ?? null;

  const metrics = overview?.metrics;

  const metricCards = [
    { label: "Total New Hires", value: metrics?.total_new_hires ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Completion Rate", value: `${metrics?.completion_rate ?? 0}%`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Avg. Complete Time", value: `${metrics?.average_time_to_complete_hours ?? 0}h`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Questions Answered", value: `${metrics?.questions_answered ?? 0}/${metrics?.total_questions ?? 0}`, icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  // Prepare language pie data
  const languageData = convAnalytics?.by_language
    ? Object.entries(convAnalytics.by_language).map(([lang, count]) => ({
        name: lang === "en" ? "English" : lang === "ar" ? "Arabic" : lang,
        value: count,
      }))
    : [];

  // Conversation metrics
  const convMetrics = [
    { label: "Total Conversations", value: convAnalytics?.total_conversations ?? 0 },
    { label: "Avg. Duration", value: `${Math.round((convAnalytics?.average_duration_seconds ?? 0) / 60)} min` },
    { label: "Completion Rate", value: `${convAnalytics?.completion_rate ?? 0}%` },
    { label: "Avg. Sentiment", value: (convAnalytics?.average_sentiment ?? 0).toFixed(2) },
    { label: "Avg. Engagement", value: (convAnalytics?.average_engagement ?? 0).toFixed(2) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Insights into your onboarding pipeline performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>New Hires by Week</CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.trends?.new_hires_by_week?.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overview.trends.new_hires_by_week}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-10 w-10" />
                  <p className="mt-2">No trend data available yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Conversations by Language</CardTitle>
          </CardHeader>
          <CardContent>
            {languageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={languageData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                    {languageData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No conversation data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversation Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Conversation Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {convMetrics.map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-sm text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
