"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesApi } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Layout, Plus, FileText, Loader2 } from "lucide-react";
import type { Template } from "@/lib/types";

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    template_type: "employment_contract",
    country: "UAE",
    language: "en",
    content_template: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => templatesApi.list(),
  });

  const templates: Template[] = data?.data?.data ?? [];

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCreate = async () => {
    setCreating(true);
    try {
      await templatesApi.create(form);
      toast.success("Template created!");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setCreateOpen(false);
      setForm({ name: "", description: "", template_type: "employment_contract", country: "UAE", language: "en", content_template: "" });
    } catch {
      toast.error("Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Manage contract templates for document generation</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Contract Template</DialogTitle>
              <DialogDescription>Define a reusable template for document generation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="UAE Employment Contract" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.template_type} onValueChange={(v) => setField("template_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employment_contract">Employment Contract</SelectItem>
                      <SelectItem value="offer_letter">Offer Letter</SelectItem>
                      <SelectItem value="nda">NDA</SelectItem>
                      <SelectItem value="equity_agreement">Equity Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={form.country} onValueChange={(v) => setField("country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                      <SelectItem value="Egypt">Egypt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={form.language} onValueChange={(v) => setField("language", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Standard employment contract for UAE" />
              </div>
              <div className="space-y-2">
                <Label>Template Content</Label>
                <Textarea
                  value={form.content_template}
                  onChange={(e) => setField("content_template", e.target.value)}
                  placeholder="EMPLOYMENT CONTRACT\n\nThis Employment Contract is made on {{ start_date }}..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Use {"{{ variable_name }}"} for dynamic placeholders</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !form.name || !form.content_template}>
                {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center">
          <Layout className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No templates yet</p>
          <p className="text-sm text-muted-foreground">Create your first template to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{t.template_type.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Badge variant={t.is_active ? "default" : "secondary"}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{t.country}</Badge>
                  <Badge variant="outline">{t.language.toUpperCase()}</Badge>
                  <Badge variant="outline">v{t.version}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {format(new Date(t.created_at), "MMM dd, yyyy")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
