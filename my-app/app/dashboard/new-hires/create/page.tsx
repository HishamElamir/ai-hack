"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { newHiresApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";

interface BenefitForm {
  benefit_type: string;
  description: string;
  value: string;
  currency: string;
}

export default function CreateNewHirePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // AI parsing state
  const [aiDescription, setAiDescription] = useState("");
  const [aiParsing, setAiParsing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    preferred_language: "en",
    position: "",
    department: "",
    salary: "",
    currency: "AED",
    start_date: "",
    employment_type: "full_time",
    country: "UAE",
    city: "",
    work_location: "office",
    notes: "",
  });

  const [benefits, setBenefits] = useState<BenefitForm[]>([
    { benefit_type: "health_insurance", description: "Comprehensive health insurance", value: "15000", currency: "AED" },
    { benefit_type: "pto", description: "30 days paid annual leave", value: "30", currency: "AED" },
  ]);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAIParse = async () => {
    if (!aiDescription.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setAiParsing(true);
    try {
      const response = await newHiresApi.parseDescription(aiDescription);
      const data = response.data;

      // Update form fields with parsed data
      const updates: Record<string, string> = {};
      if (data.full_name) updates.full_name = data.full_name;
      if (data.email) updates.email = data.email;
      if (data.phone) updates.phone = data.phone;
      if (data.preferred_language) updates.preferred_language = data.preferred_language;
      if (data.position) updates.position = data.position;
      if (data.department) updates.department = data.department;
      if (data.salary) updates.salary = String(data.salary);
      if (data.currency) updates.currency = data.currency;
      if (data.start_date) updates.start_date = data.start_date;
      if (data.employment_type) updates.employment_type = data.employment_type;
      if (data.country) updates.country = data.country;
      if (data.city) updates.city = data.city;
      if (data.work_location) updates.work_location = data.work_location;
      if (data.notes) updates.notes = data.notes;

      setForm((prev) => ({ ...prev, ...updates }));

      // Update benefits if provided
      if (data.benefits && data.benefits.length > 0) {
        setBenefits(data.benefits.map((b: any) => ({
          benefit_type: b.benefit_type || b.type || "",
          description: b.description || "",
          value: String(b.value || ""),
          currency: b.currency || "AED",
        })));
      }

      toast.success("Form filled with AI!");
      setAiDescription("");
    } catch (error) {
      toast.error("Failed to parse description");
      console.error(error);
    } finally {
      setAiParsing(false);
    }
  };

  const addBenefit = () =>
    setBenefits((prev) => [...prev, { benefit_type: "", description: "", value: "", currency: "AED" }]);

  const removeBenefit = (index: number) =>
    setBenefits((prev) => prev.filter((_, i) => i !== index));

  const updateBenefit = (index: number, key: keyof BenefitForm, value: string) =>
    setBenefits((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [key]: value } : b)),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        salary: parseFloat(form.salary),
        benefits: benefits
          .filter((b) => b.benefit_type && b.description)
          .map((b) => ({
            benefit_type: b.benefit_type,
            description: b.description,
            value: b.value ? parseFloat(b.value) : undefined,
            currency: b.currency,
          })),
      };
      await newHiresApi.create(payload);
      toast.success("New hire created successfully!");
      router.push("/dashboard/new-hires");
    } catch {
      toast.error("Failed to create new hire");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/new-hires">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Hire</h1>
          <p className="text-muted-foreground">Fill in the details for the new employee</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Auto-fill Section */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">AI Auto-Fill</CardTitle>
            </div>
            <CardDescription>
              Describe the new hire in natural language and let AI fill the form for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Textarea
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder="Example: Omar Hassan, Senior Software Engineer in Cairo, starts March 1st 2025, 25000 EGP salary, remote work, omar.hassan@email.com, +201234567890"
                rows={3}
                className="bg-white"
                disabled={aiParsing}
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Include name, position, location, salary, start date, and contact details for best results
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAIParse}
              disabled={aiParsing || !aiDescription.trim()}
              className="w-full sm:w-auto"
            >
              {aiParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Fill Form with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic information about the new hire</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input required value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input required type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+971501234567" />
            </div>
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select value={form.preferred_language} onValueChange={(v) => setField("preferred_language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Position *</Label>
              <Input required value={form.position} onChange={(e) => setField("position", e.target.value)} placeholder="Senior Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Input required value={form.department} onChange={(e) => setField("department", e.target.value)} placeholder="Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Salary *</Label>
              <Input required type="number" value={form.salary} onChange={(e) => setField("salary", e.target.value)} placeholder="25000" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setField("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="EGP">EGP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input required type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={form.employment_type} onValueChange={(v) => setField("employment_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={form.country} onValueChange={(v) => setField("country", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAE">UAE</SelectItem>
                  <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                  <SelectItem value="Egypt">Egypt</SelectItem>
                  <SelectItem value="Jordan">Jordan</SelectItem>
                  <SelectItem value="Qatar">Qatar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Dubai" />
            </div>
            <div className="space-y-2">
              <Label>Work Location</Label>
              <Select value={form.work_location} onValueChange={(v) => setField("work_location", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Benefits</CardTitle>
              <CardDescription>Add benefits for this new hire</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
              <Plus className="mr-1 h-4 w-4" /> Add Benefit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={b.benefit_type} onValueChange={(v) => updateBenefit(i, "benefit_type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="health_insurance">Health Insurance</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                        <SelectItem value="vision">Vision</SelectItem>
                        <SelectItem value="pto">PTO</SelectItem>
                        <SelectItem value="stock_options">Stock Options</SelectItem>
                        <SelectItem value="gym_membership">Gym Membership</SelectItem>
                        <SelectItem value="parental_leave">Parental Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Input value={b.description} onChange={(e) => updateBenefit(i, "description", e.target.value)} placeholder="Describe benefit" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input type="number" value={b.value} onChange={(e) => updateBenefit(i, "value", e.target.value)} placeholder="15000" />
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeBenefit(i)} className="mt-5">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Any additional notes about this new hire..." rows={3} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/new-hires">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create New Hire"}
          </Button>
        </div>
      </form>
    </div>
  );
}
