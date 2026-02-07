"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newHiresApi, contractsApi, questionsApi, voiceApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Mail, Send, Sparkles, FileText, MessageSquare, Clock,
  User, Briefcase, MapPin, DollarSign, Calendar, Loader2, Download,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, CATEGORY_COLORS } from "@/lib/types";
import type { NewHire, ConversationTranscript } from "@/lib/types";

type InvitationResponse = {
  invitation_link?: string;
};

export default function NewHireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["newHire", id],
    queryFn: () => newHiresApi.get(id),
  });
  const hire: NewHire | null = data?.data ?? null;

  const [tabValue, setTabValue] = useState("overview");
  const [expandedConversationId, setExpandedConversationId] = useState<string | null>(null);

  const transcriptQuery = useQuery({
    queryKey: ["conversationTranscript", expandedConversationId],
    queryFn: () => voiceApi.getTranscript(expandedConversationId as string),
    enabled: !!expandedConversationId,
  });
  const transcriptData = transcriptQuery.data?.data as ConversationTranscript | undefined;

  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  const handleCopyInvitationLink = async () => {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      toast.success("Invitation link copied");
    } catch {
      toast.error("Failed to copy invitation link");
    }
  };

  // Send invitation mutation
  const inviteMutation = useMutation({
    mutationFn: () => newHiresApi.sendInvitation(id, { send_email: true }),
    onSuccess: (response) => {
      const link = (response as { data?: InvitationResponse }).data?.invitation_link;
      if (link) {
        setInvitationLink(link);
      }
      toast.success("Invitation sent!");
      queryClient.invalidateQueries({ queryKey: ["newHire", id] });
    },
    onError: () => toast.error("Failed to send invitation"),
  });

  const whatsappMutation = useMutation({
    mutationFn: () => newHiresApi.sendInvitation(id, { send_sms: true, send_email: false }),
    onSuccess: (response) => {
      const link = (response as { data?: InvitationResponse }).data?.invitation_link;
      if (link) {
        setInvitationLink(link);
      }
      toast.success("WhatsApp invitation sent!");
      queryClient.invalidateQueries({ queryKey: ["newHire", id] });
    },
    onError: () => toast.error("Failed to send WhatsApp invitation"),
  });

  // Generate contract dialog
  const [genOpen, setGenOpen] = useState(false);
  const [genType, setGenType] = useState("employment_contract");
  const [genPrompt, setGenPrompt] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [updateNewHire, setUpdateNewHire] = useState(false);
  const [newSalary, setNewSalary] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const handleGenerate = async () => {
    setGenLoading(true);
    try {
      const payload: any = {
        new_hire_id: id,
        contract_type: genType,
        generation_prompt: genPrompt || undefined,
      };

      // Add new hire updates if requested
      if (updateNewHire) {
        const updates: any = {};
        if (newSalary && parseFloat(newSalary) > 0) {
          updates.salary = parseFloat(newSalary);
        }
        if (newPosition.trim()) {
          updates.position = newPosition.trim();
        }
        if (newDepartment.trim()) {
          updates.department = newDepartment.trim();
        }
        
        if (Object.keys(updates).length > 0) {
          payload.update_new_hire = true;
          payload.new_hire_updates = updates;
        }
      }

      await contractsApi.generate(payload);
      toast.success("Contract generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["newHire", id] });
      setGenOpen(false);
      setGenPrompt("");
      setUpdateNewHire(false);
      setNewSalary("");
      setNewPosition("");
      setNewDepartment("");
    } catch {
      toast.error("Failed to generate contract");
    } finally {
      setGenLoading(false);
    }
  };

  // Answer question
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");

  const handleAnswer = async (questionId: string) => {
    try {
      await questionsApi.answer(questionId, { response: answerText, status: "answered" });
      toast.success("Question answered!");
      queryClient.invalidateQueries({ queryKey: ["newHire", id] });
      setAnsweringId(null);
      setAnswerText("");
    } catch {
      toast.error("Failed to answer question");
    }
  };

  const handleToggleConversation = (conversationId: string) => {
    setExpandedConversationId((prev) => (prev === conversationId ? null : conversationId));
  };

  const handleOpenConversation = (conversationId: string | null | undefined) => {
    if (!conversationId) return;
    setTabValue("conversations");
    setExpandedConversationId(conversationId);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hire) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium">New hire not found</p>
        <Link href="/dashboard/new-hires"><Button className="mt-4">Back to list</Button></Link>
      </div>
    );
  }

  const infoItems = [
    { icon: User, label: "Full Name", value: hire.full_name },
    { icon: Mail, label: "Email", value: hire.email },
    { icon: Briefcase, label: "Position", value: hire.position },
    { icon: Briefcase, label: "Department", value: hire.department },
    { icon: DollarSign, label: "Salary", value: `${hire.salary} ${hire.currency}/month` },
    { icon: Calendar, label: "Start Date", value: format(new Date(hire.start_date), "MMM dd, yyyy") },
    { icon: MapPin, label: "Location", value: `${hire.city ?? ""}, ${hire.country}`.replace(/^, /, "") },
    { icon: Clock, label: "Work Arrangement", value: hire.work_location ?? "N/A" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/new-hires">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{hire.full_name}</h1>
              <Badge className={STATUS_COLORS[hire.status] ?? ""} variant="secondary">
                {STATUS_LABELS[hire.status] ?? hire.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{hire.email} &middot; {hire.position}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {inviteMutation.isPending
              ? "Sending..."
              : hire.status === "draft"
                ? "Send Invitation"
                : "Resend Invitation"}
          </Button>
          <Button
            variant="outline"
            onClick={() => whatsappMutation.mutate()}
            disabled={whatsappMutation.isPending || !hire.phone}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {whatsappMutation.isPending
              ? "Sending..."
              : hire.status === "draft"
                ? "Send WhatsApp"
                : "Resend WhatsApp"}
          </Button>
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <DialogTrigger asChild>
              <Button><Sparkles className="mr-2 h-4 w-4" />Generate Contract</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Contract with AI</DialogTitle>
                <DialogDescription>AI will generate a complete contract based on the new hire details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Contract Type</Label>
                  <Select value={genType} onValueChange={setGenType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employment_contract">Employment Contract</SelectItem>
                      <SelectItem value="offer_letter">Offer Letter</SelectItem>
                      <SelectItem value="nda">NDA</SelectItem>
                      <SelectItem value="equity_agreement">Equity Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="update-hire-info"
                    checked={updateNewHire}
                    onChange={(e) => setUpdateNewHire(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="update-hire-info" className="cursor-pointer font-medium">
                    Update employee information with new contract details
                  </Label>
                </div>
                
                {updateNewHire && (
                  <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-salary">New Salary (Optional)</Label>
                      <Input
                        id="new-salary"
                        type="number"
                        placeholder={`Current: ${hire?.salary} ${hire?.currency}`}
                        value={newSalary}
                        onChange={(e) => setNewSalary(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-position">New Position (Optional)</Label>
                      <Input
                        id="new-position"
                        placeholder={`Current: ${hire?.position}`}
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-department">New Department (Optional)</Label>
                      <Input
                        id="new-department"
                        placeholder={`Current: ${hire?.department}`}
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These changes will update the employee's record and be reflected in the generated contract.
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>AI Instructions (Optional)</Label>
                  <Textarea
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="e.g., Include a 6-month probation period and remote work clause..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={genLoading}>
                  {genLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {invitationLink && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Invitation Link</CardTitle>
            <CardDescription>Share this link with the new hire</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={invitationLink} readOnly className="font-mono text-xs" />
            <Button variant="outline" onClick={handleCopyInvitationLink}>
              Copy Link
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Onboarding Progress</span>
              <span className="font-medium">{hire.progress_percentage}%</span>
            </div>
            <Progress value={hire.progress_percentage} className="h-3" />
          </div>
          <div className="flex gap-4 text-center text-xs">
            <div><p className="font-medium">{hire.voice_session_completed ? "Yes" : "No"}</p><p className="text-muted-foreground">Voice Done</p></div>
            <div><p className="font-medium">{hire.offer_accepted ? "Yes" : "No"}</p><p className="text-muted-foreground">Offer Accepted</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tabValue} onValueChange={setTabValue}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">
            Contracts <Badge variant="secondary" className="ml-1.5">{hire.contracts?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="questions">
            Questions
            {(hire.questions?.filter((q) => q.status === "pending").length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1.5">{hire.questions?.filter((q) => q.status === "pending").length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Personal & Employment Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {infoItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Benefits</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {hire.benefits?.length > 0 ? hire.benefits.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{b.benefit_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{b.description}</p>
                    </div>
                    {b.value && <span className="text-sm font-medium">{b.value} {b.currency}</span>}
                  </div>
                )) : <p className="text-sm text-muted-foreground">No benefits assigned</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hire.contracts?.length > 0 ? hire.contracts.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <p className="font-medium capitalize">{c.contract_type.replace(/_/g, " ")}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">v{c.version} &middot; {format(new Date(c.created_at), "MMM dd, yyyy")}</p>
                    </div>
                    <Badge className={STATUS_COLORS[c.status] ?? ""} variant="secondary">{STATUS_LABELS[c.status] ?? c.status}</Badge>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/contracts/${c.id}`)}>View</Button>
                    <Button variant="outline" size="sm"><Download className="mr-1 h-3 w-3" />Download</Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                No contracts generated yet. Click "Generate Contract" above.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-6 space-y-4">
          {hire.questions?.length > 0 ? hire.questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Asked {format(new Date(q.asked_at), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                    {q.conversation_id && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto px-0 text-xs"
                        onClick={() => handleOpenConversation(q.conversation_id)}
                      >
                        View conversation
                        {q.conversation_start_time
                          ? ` · ${format(new Date(q.conversation_start_time), "MMM dd, yyyy 'at' h:mm a")}`
                          : ""}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={PRIORITY_COLORS[q.priority] ?? ""} variant="secondary">{q.priority}</Badge>
                    <Badge className={STATUS_COLORS[q.status] ?? ""} variant="secondary">{q.status}</Badge>
                  </div>
                </div>
                {q.status === "pending" && (
                  <div className="mt-4">
                    {answeringId === q.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Type your response..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAnswer(q.id)}>Submit Answer</Button>
                          <Button size="sm" variant="outline" onClick={() => { setAnsweringId(null); setAnswerText(""); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setAnsweringId(q.id)}>
                        <MessageSquare className="mr-1 h-3 w-3" /> Answer
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <div className="py-8 text-center text-muted-foreground">No questions from this new hire</div>
          )}
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="mt-6 space-y-4">
          {hire.conversations?.length > 0 ? hire.conversations.map((cv) => {
            const isExpanded = expandedConversationId === cv.id;
            const activeTranscript = isExpanded && transcriptData?.conversation_id === cv.id
              ? transcriptData
              : undefined;

            return (
              <Card key={cv.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">Voice Session</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(cv.start_time), "MMM dd, yyyy 'at' h:mm a")}
                        {cv.duration_seconds && ` · ${Math.round(cv.duration_seconds / 60)} min`}
                      </p>
                      {cv.summary && (
                        <p className="mt-2 text-sm text-muted-foreground">{cv.summary}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {cv.sentiment_score !== null && cv.sentiment_score !== undefined && (
                        <Badge variant="secondary">Sentiment {cv.sentiment_score.toFixed(2)}</Badge>
                      )}
                      {cv.engagement_score !== null && cv.engagement_score !== undefined && (
                        <Badge variant="secondary">Engagement {cv.engagement_score.toFixed(2)}</Badge>
                      )}
                      <Badge className={STATUS_COLORS[cv.completion_status ?? ""] ?? "bg-gray-100 text-gray-800"} variant="secondary">
                        {cv.completion_status ?? "unknown"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      {cv.message_count !== null && cv.message_count !== undefined
                        ? `${cv.message_count} messages`
                        : "No messages"}
                      {cv.language ? ` · ${cv.language.toUpperCase()}` : ""}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleToggleConversation(cv.id)}>
                      {isExpanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                      {isExpanded ? "Hide Transcript" : "View Transcript"}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t pt-4">
                      {transcriptQuery.isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading transcript...
                        </div>
                      ) : activeTranscript && activeTranscript.messages?.length > 0 ? (
                        <div className="space-y-3">
                          {activeTranscript.messages.map((msg, idx) => (
                            <div key={`${msg.speaker}-${idx}`} className={cn("flex", msg.speaker === "new_hire" ? "justify-end" : "justify-start")}>
                              <div className={cn(
                                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                                msg.speaker === "new_hire"
                                  ? "bg-blue-600 text-white"
                                  : "bg-muted",
                              )}>
                                {msg.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : activeTranscript?.full_transcript ? (
                        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                          {activeTranscript.full_transcript}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No transcript available yet</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }) : (
            <div className="py-8 text-center text-muted-foreground">No voice conversations yet</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
