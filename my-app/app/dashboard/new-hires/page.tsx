"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { newHiresApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";
import type { NewHireListItem } from "@/lib/types";

const STATUSES = [
  "all", "draft", "invited", "in_progress", "offer_presented",
  "contract_sent", "signed", "completed", "declined",
];

export default function NewHiresListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const params: Record<string, unknown> = { page, per_page: 20 };
  if (search) params.search = search;
  if (statusFilter && statusFilter !== "all") params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["newHires", params],
    queryFn: () => newHiresApi.list(params),
  });

  const hires: NewHireListItem[] = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Hires</h1>
          <p className="text-muted-foreground">
            Manage all new hire onboarding records
          </p>
        </div>
        <Link href="/dashboard/new-hires/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Hire
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All Statuses" : STATUS_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : hires.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium">No new hires found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Position</th>
                    <th className="px-6 py-3 font-medium">Department</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Progress</th>
                    <th className="px-6 py-3 font-medium">Questions</th>
                    <th className="px-6 py-3 font-medium">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {hires.map((hire) => (
                    <tr
                      key={hire.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/new-hires/${hire.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{hire.full_name}</p>
                          <p className="text-xs text-muted-foreground">{hire.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{hire.position}</td>
                      <td className="px-6 py-4 text-sm">{hire.department}</td>
                      <td className="px-6 py-4">
                        <Badge className={STATUS_COLORS[hire.status] ?? ""} variant="secondary">
                          {STATUS_LABELS[hire.status] ?? hire.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 w-32">
                        <div className="flex items-center gap-2">
                          <Progress value={hire.progress_percentage} className="h-2" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{hire.progress_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {hire.pending_questions > 0 ? (
                          <Badge variant="destructive">{hire.pending_questions}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
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

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.has_prev} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
