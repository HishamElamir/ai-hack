"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { authApi, voiceApi } from "@/lib/api";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Globe, MessageSquare, Loader2, Phone, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  speaker: "agent" | "new_hire";
  message: string;
  timestamp: Date;
}

export default function VoiceOnboardingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [validating, setValidating] = useState(true);
  const [session, setSession] = useState<{ valid: boolean; new_hire?: Record<string, string> } | null>(null);
  const [started, setStarted] = useState(false);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [backendConversationId, setBackendConversationId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [isEnding, setIsEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback(
    async (speaker: "agent" | "new_hire", message: string) => {
      const timestamp = new Date();
      setMessages((prev) => [...prev, { speaker, message, timestamp }]);
      if (backendConversationId) {
        try {
          await voiceApi.storeMessage(backendConversationId, {
            speaker,
            message,
            timestamp: timestamp.toISOString(),
          });
        } catch {
          /* ignore */
        }
      }
    },
    [backendConversationId],
  );

  const conversation = useConversation({
    clientTools: {
      submitQuestion: async (parameters: { question: string; context?: string }) => {
        if (!backendConversationId) {
          return "No active session found.";
        }
        try {
          const { data } = await voiceApi.submitQuestion(backendConversationId, {
            question: parameters.question,
            context: parameters.context ?? "Captured from ElevenLabs agent",
          });
          return data?.message ?? "Question submitted.";
        } catch {
          return "Failed to submit the question.";
        }
      },
    },
    overrides: {
      agent: {
        language,
      },
    },
    onConnect: () => setStarted(true),
    onDisconnect: () => setStarted(false),
    onMessage: (event) => {
      try {
        if (!event || typeof event !== "object") return;
        
        // Log all events for debugging
        console.log("ElevenLabs event:", event);
        
        // Handle error events
        if (event.type === "error" || event.error_type) {
          console.error("ElevenLabs error event:", event);
          const errorMsg = event.message || event.error_message || "Unknown error from agent";
          addMessage("agent", `Error: ${errorMsg}`);
          return;
        }
        
        if (event.type === "user_transcript") {
          const transcript = event.user_transcription_event?.user_transcript;
          if (transcript) {
            addMessage("new_hire", transcript);
          }
        }
        if (event.type === "agent_response") {
          const response = event.agent_response_event?.agent_response;
          if (response) {
            addMessage("agent", response);
          }
        }
        if (event.type === "agent_response_correction") {
          const corrected = event.agent_response_correction_event?.corrected_agent_response;
          if (corrected) {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i -= 1) {
                if (next[i].speaker === "agent") {
                  next[i] = { ...next[i], message: corrected };
                  break;
                }
              }
              return next;
            });
          }
        }
      } catch (err) {
        console.error("Error handling message:", err, event);
      }
    },
    onError: (error) => {
      console.error("ElevenLabs conversation error:", error);
      setStarted(false);
    },
  });

  useEffect(() => {
    const validate = async () => {
      try {
        const { data } = await authApi.validateSession(sessionId);
        setSession(data);
        if (data.new_hire?.preferred_language) {
          setLanguage(data.new_hire.preferred_language as "en" | "ar");
        }
      } catch {
        setSession({ valid: false });
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = async () => {
    if (isStarting || started) return;
    setIsStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data } = await voiceApi.initializeSession(sessionId);
      setBackendConversationId(data.conversation_id);

      // Get signed URL from our Next.js API route
      let signedUrl: string | null = null;
      try {
        const res = await fetch("/api/elevenlabs/signed-url");
        if (res.ok) {
          const json = await res.json();
          signedUrl = json.signed_url ?? null;
        }
      } catch (e) {
        console.warn("Could not get signed URL, falling back to agentId:", e);
      }

      const agentId = data.agent_config?.agent_id;

      if (!signedUrl && !agentId) {
        throw new Error("Neither signed URL nor agent ID configured.");
      }

      console.log("Starting ElevenLabs session...", {
        method: signedUrl ? "signedUrl+websocket" : "agentId+webrtc",
      });

      const conversationId = await conversation.startSession(
        signedUrl
          ? { signedUrl }
          : { agentId: agentId! }
      );

      console.log("ElevenLabs conversation started:", conversationId);
      await voiceApi.linkElevenLabs(data.conversation_id, conversationId);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert(`Failed to start session: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!questionText.trim()) return;
    await conversation.sendUserMessage(questionText.trim());
    setQuestionText("");
  };

  const handleEndConversation = async () => {
    if (!backendConversationId) return;
    setIsEnding(true);
    try {
      // End the ElevenLabs session
      await conversation.endSession();
      
      // Mark as complete in our backend
      await voiceApi.completeSession(backendConversationId, {
        completion_status: "completed",
        summary: "Session ended by user",
      });
      
      setSessionEnded(true);
      setStarted(false);
    } catch (error) {
      console.error("Failed to end session:", error);
      alert("Failed to end the conversation. Please try again.");
    } finally {
      setIsEnding(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session?.valid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <PhoneOff className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold">Session Not Found</h1>
          <p className="mt-2 text-muted-foreground">This session link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur p-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {session.new_hire?.full_name}!</h1>
            <p className="text-muted-foreground">
              {language === "ar" ? "لنراجع عرضك معًا" : "Let's review your offer together"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          >
            <Globe className="mr-2 h-4 w-4" />
            {language === "en" ? "العربية" : "English"}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl p-6">
          {!started ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center py-16 text-center">
              <div className={cn(
                "mb-8 flex h-32 w-32 items-center justify-center rounded-full",
                "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl",
              )}>
                <Bot className="h-16 w-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold">
                {language === "ar" ? "مرحباً بك في فريقنا!" : "Welcome to the Team!"}
              </h2>
              <p className="mt-3 max-w-md text-lg text-muted-foreground">
                {language === "ar"
                  ? "أنا مساعد الموارد البشرية. سأشرح لك عرض العمل والمزايا."
                  : "I'm your HR assistant. I'll walk you through your offer, benefits, and answer your questions."}
              </p>
              <Button size="lg" className="mt-8" onClick={handleStart}>
                <Phone className="mr-2 h-5 w-5" />
                {isStarting ? (language === "ar" ? "...جاري البدء" : "Starting...") : (language === "ar" ? "ابدأ المحادثة" : "Start Conversation")}
              </Button>
            </div>
          ) : sessionEnded ? (
            /* Session Ended View */
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl">
                <PhoneOff className="h-16 w-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold">
                {language === "ar" ? "تمت المحادثة بنجاح" : "Conversation Ended"}
              </h2>
              <p className="mt-3 max-w-md text-lg text-muted-foreground">
                {language === "ar"
                  ? "شكراً لوقتك! سيتواصل فريق الموارد البشرية معك قريباً."
                  : "Thank you for your time! Our HR team will be in touch soon."}
              </p>
              <div className="mt-8 rounded-lg border bg-muted/50 p-4 text-left">
                <p className="text-sm text-muted-foreground">
                  {language === "ar"
                    ? "• تم حفظ جميع أسئلتك وسيتم الرد عليها خلال 24 ساعة"
                    : "• All your questions have been saved and will be answered within 24 hours"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {language === "ar"
                    ? "• يمكنك إغلاق هذه النافذة الآن"
                    : "• You can close this window now"}
                </p>
              </div>
            </div>
          ) : (
            /* Conversation View */
            <div className="space-y-6">
              {/* Agent Avatar & End Button */}
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex justify-center flex-1">
                  <div className="relative">
                    <div className={cn(
                      "flex h-24 w-24 items-center justify-center rounded-full",
                      "bg-gradient-to-br from-blue-500 to-indigo-600 transition-all duration-300",
                      conversation.isSpeaking && "scale-110 shadow-2xl",
                    )}>
                      <Bot className="h-12 w-12 text-white" />
                    </div>
                    {conversation.isSpeaking && (
                      <div className="absolute -inset-2 animate-ping rounded-full border-2 border-blue-400 opacity-30" />
                    )}
                    <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2">{language.toUpperCase()}</Badge>
                  </div>
                </div>
                <div className="flex-1 flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEndConversation}
                    disabled={isEnding}
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    {isEnding
                      ? (language === "ar" ? "...جاري الإنهاء" : "Ending...")
                      : (language === "ar" ? "إنهاء المحادثة" : "End Call")}
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <Card>
                <CardContent className="max-h-[400px] min-h-[200px] overflow-auto pt-6">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={cn("flex", msg.speaker === "new_hire" ? "justify-end" : "justify-start")}>
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
                    {conversation.isSpeaking && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0.1s" }} />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>
              </Card>

              {/* Ask Question */}
              <div className="flex gap-3">
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={language === "ar" ? "اكتب سؤالك هنا..." : "Type your question here..."}
                  rows={2}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAskQuestion();
                    } else {
                      conversation.sendUserActivity();
                    }
                  }}
                />
                <Button onClick={handleAskQuestion} disabled={!questionText.trim()}>
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
