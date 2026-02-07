"use client";

import { useQuery } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";
import type { Contract } from "@/lib/types";

export default function ContractsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => contractsApi.list(),
  });

  const contracts: Contract[] = data?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground">View and manage all generated contracts</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No contracts yet</p>
          <p className="text-sm text-muted-foreground">Contracts will appear here once generated from new hire profiles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contracts.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{c.contract_type.replace(/_/g, " ")}</p>
                      {c.new_hire_name && (
                        <p className="text-xs text-muted-foreground">{c.new_hire_name}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[c.status] ?? ""} variant="secondary">
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  v{c.version} &middot; {format(new Date(c.created_at), "MMM dd, yyyy")}
                  {c.ai_model && ` · AI: ${c.ai_model}`}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/contracts/${c.id}`)}
                  >
                    <Eye className="mr-1 h-3 w-3" /> View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-1 h-3 w-3" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
