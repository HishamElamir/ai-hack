"use client";

import { useAuthStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={user?.full_name ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="capitalize">{user?.role?.replace(/_/g, " ") ?? "N/A"}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={user?.department ?? "N/A"} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Configure external service connections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>OpenAI API Key</Label>
            <Input type="password" placeholder="sk-..." />
            <p className="text-xs text-muted-foreground">Required for AI-powered document generation</p>
          </div>
          <div className="space-y-2">
            <Label>ElevenLabs API Key</Label>
            <Input type="password" placeholder="Enter your ElevenLabs API key..." />
            <p className="text-xs text-muted-foreground">Required for voice agent functionality</p>
          </div>
          <Separator />
          <Button>Save Configuration</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Email notifications for new questions",
            "Email notifications for completed onboarding",
            "Email notifications for voice session completions",
            "Daily summary email",
          ].map((label) => (
            <div key={label} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{label}</span>
              <Button variant="outline" size="sm">Enabled</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
