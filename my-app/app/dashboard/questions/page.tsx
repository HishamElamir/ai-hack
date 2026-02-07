"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { questionsApi } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Loader2 } from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, CATEGORY_COLORS } from "@/lib/types";
import type { Question } from "@/lib/types";

export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const params: Record<string, unknown> = { per_page: 50 };
  if (statusFilter !== "all") params.status = statusFilter;
  if (priorityFilter !== "all") params.priority = priorityFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["questions", params],
    queryFn: () => questionsApi.list(params),
  });

  const questions: Question[] = data?.data?.data ?? [];

  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");

  const answerMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      questionsApi.answer(id, { response, status: "answered", send_notification: true }),
    onSuccess: () => {
      toast.success("Question answered!");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      setAnsweringId(null);
      setAnswerText("");
    },
    onError: () => toast.error("Failed to answer question"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Questions Inbox</h1>
        <p className="text-muted-foreground">Review and respond to new hire questions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Question list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="py-16 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No questions found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const initials = q.new_hire_name.split(" ").map((n) => n[0]).join("").toUpperCase();
            return (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{q.new_hire_name}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(q.asked_at), "MMM dd, yyyy · h:mm a")}
                          </span>
                        </div>
                        <p className="mt-1 text-base">{q.question}</p>
                        {q.context && (
                          <p className="mt-1 text-sm text-muted-foreground">Context: {q.context}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <Badge className={PRIORITY_COLORS[q.priority] ?? ""} variant="secondary">{q.priority}</Badge>
                      {q.category && (
                        <Badge className={CATEGORY_COLORS[q.category] ?? "bg-gray-100 text-gray-700"} variant="secondary">
                          {q.category}
                        </Badge>
                      )}
                      <Badge className={STATUS_COLORS[q.status] ?? ""} variant="secondary">{STATUS_LABELS[q.status] ?? q.status}</Badge>
                    </div>
                  </div>
                </CardHeader>

                {q.hr_response ? (
                  <CardContent>
                    <div className="rounded-lg bg-muted p-4">
                      <p className="mb-1 text-sm font-medium">Your Response:</p>
                      <p className="text-sm">{q.hr_response}</p>
                      {q.answered_at && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Answered on {format(new Date(q.answered_at), "MMM dd, yyyy")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                ) : (
                  <CardFooter>
                    {answeringId === q.id ? (
                      <div className="w-full space-y-3">
                        <Textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Type your response to this question..."
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={!answerText.trim() || answerMutation.isPending}
                            onClick={() => answerMutation.mutate({ id: q.id, response: answerText })}
                          >
                            {answerMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                            Submit Answer
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setAnsweringId(null); setAnswerText(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => setAnsweringId(q.id)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Answer Question
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
