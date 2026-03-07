import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Upload, Check, X, Type } from "lucide-react";
import logoPath from "@assets/--._1772868829725.png";
import type { Project } from "@shared/schema";

const FONTS = [
  "Arimo", "Inter", "Plus Jakarta Sans", "Poppins", "Montserrat",
  "Space Grotesk", "Roboto", "DM Sans", "Outfit", "Geist",
  "Lora", "Playfair Display", "Merriweather", "Source Serif 4",
  "Fira Code", "JetBrains Mono", "Space Mono", "IBM Plex Mono",
];

const PRESET_COLORS = [
  "#3b82f6", "#7c3aed", "#10b981", "#f43f5e",
  "#f59e0b", "#0ea5e9", "#ec4899", "#8b5cf6",
  "#14b8a6", "#f97316", "#64748b", "#ffffff",
];

const detailsSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  prompt: z.string().min(1, "Prompt is required").max(2000),
  brandName: z.string().max(60).optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

function resizeImageToBase64(file: File, maxPx = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png", 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewProjectPage() {
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [selectedFont, setSelectedFont] = useState("Arimo");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [logoData, setLogoData] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [customFontData, setCustomFontData] = useState<string | null>(null);
  const [customFontName, setCustomFontName] = useState<string | null>(null);

  useEffect(() => {
    if (!customFontData) return;
    const style = document.createElement("style");
    style.id = "custom-font-preview";
    style.textContent = `@font-face { font-family: 'CustomUpload'; src: url('${customFontData}'); }`;
    const existing = document.getElementById("custom-font-preview");
    if (existing) existing.remove();
    document.head.appendChild(style);
    setSelectedFont("CustomUpload");
    return () => { style.remove(); };
  }, [customFontData]);

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 3MB.", variant: "destructive" });
      return;
    }
    try {
      const base64 = await resizeImageToBase64(file, 256);
      setLogoData(base64);
      setLogoName(file.name);
    } catch {
      toast({ title: "Upload failed", description: "Could not process the image.", variant: "destructive" });
    }
  };

  const handleFontUpload = async (file: File) => {
    const validTypes = [
      "font/ttf", "font/otf", "font/woff", "font/woff2",
      "application/x-font-ttf", "application/x-font-otf",
      "application/font-woff", "application/font-woff2",
      "application/octet-stream",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["ttf", "otf", "woff", "woff2"];
    if (!validTypes.includes(file.type) && !validExts.includes(ext || "")) {
      toast({ title: "Invalid file", description: "Please upload a .ttf, .otf, .woff, or .woff2 font file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Font file must be under 5MB.", variant: "destructive" });
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setCustomFontData(base64);
      setCustomFontName(file.name);
    } catch {
      toast({ title: "Upload failed", description: "Could not process the font file.", variant: "destructive" });
    }
  };

  const form = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", prompt: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DetailsForm) => {
      const token = await getToken();
      const isCustomFont = selectedFont === "CustomUpload";
      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...data,
          font: isCustomFont ? (customFontName?.replace(/\.\w+$/, "") || "Custom") : selectedFont,
          fontUrl: isCustomFont ? customFontData : undefined,
          themeColor: selectedColor,
          logoUrl: logoData || undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create project");
      }
      return res.json() as Promise<Project>;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/project/list"] });
      navigate(`/project/${project.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: DetailsForm) => createMutation.mutate(data);

  const fontDisplayName = selectedFont === "CustomUpload"
    ? (customFontName?.replace(/\.\w+$/, "") || "Custom")
    : selectedFont;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoPath}
            alt="Morse"
            className="h-8 w-8 rounded-lg object-cover dark:invert-0 invert"
          />
          <span className="text-base font-semibold text-foreground tracking-tight">Morse</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="gap-2 text-muted-foreground"
          data-testid="button-cancel"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-3 mb-10">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-sm ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s === 1 ? "Brand setup" : "Project details"}
                </span>
                {s < 2 && (
                  <div className={`flex-1 h-px mx-2 ${step > s ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Set up your brand</h1>
                <p className="text-muted-foreground text-sm">Configure the visual identity for your project.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-3">Logo</label>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleLogoUpload(file);
                  }}
                  className="border-2 border-dashed border-border rounded-xl p-8 cursor-pointer flex flex-col items-center gap-3 transition-colors hover:border-primary/50 hover:bg-accent/30"
                  data-testid="logo-dropzone"
                >
                  {logoData ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={logoData} alt="Logo preview" className="h-20 w-20 object-contain rounded-lg" />
                      <p className="text-xs text-muted-foreground">{logoName}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1 h-6"
                        onClick={(e) => { e.stopPropagation(); setLogoData(null); setLogoName(null); }}
                        data-testid="button-remove-logo"
                      >
                        <X className="h-3 w-3" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Upload your logo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 3MB</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid="input-logo"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-3">Font</label>
                <div
                  onClick={() => fontInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFontUpload(file);
                  }}
                  className="border-2 border-dashed border-border rounded-xl p-4 cursor-pointer flex items-center gap-4 transition-colors hover:border-primary/50 hover:bg-accent/30 mb-3"
                  data-testid="font-dropzone"
                >
                  {customFontData ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Type className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" style={{ fontFamily: "'CustomUpload', sans-serif" }}>
                          {customFontName}
                        </p>
                        <p className="text-xs text-muted-foreground" style={{ fontFamily: "'CustomUpload', sans-serif" }}>
                          The quick brown fox jumps over the lazy dog
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1 h-7 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomFontData(null);
                          setCustomFontName(null);
                          setSelectedFont("Arimo");
                          const el = document.getElementById("custom-font-preview");
                          if (el) el.remove();
                        }}
                        data-testid="button-remove-font"
                      >
                        <X className="h-3 w-3" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Upload a custom font</p>
                        <p className="text-xs text-muted-foreground">.ttf, .otf, .woff, .woff2 up to 5MB</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                  data-testid="input-font"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFontUpload(f); }}
                />
                {!customFontData && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">Or pick a preset:</p>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                      {FONTS.map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => setSelectedFont(font)}
                          className={`px-4 py-2.5 rounded-lg border text-left transition-all ${
                            selectedFont === font
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}
                          style={{ fontFamily: `'${font}', sans-serif` }}
                          data-testid={`font-option-${font}`}
                        >
                          <span className="text-sm font-medium">{font}</span>
                          <span className="text-xs block opacity-60 mt-0.5">Aa Bb Cc 123</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-3">Theme Color</label>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      data-testid="input-color-picker"
                    />
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: selectedColor }}
                    />
                  </div>
                  <Input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setSelectedColor(v);
                    }}
                    className="w-28 font-mono text-sm h-10"
                    placeholder="#000000"
                    data-testid="input-color-hex"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`relative h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none ${
                        color === "#ffffff" ? "border border-border" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`color-preset-${color.slice(1)}`}
                    >
                      {selectedColor === color && (
                        <Check className={`h-3.5 w-3.5 absolute inset-0 m-auto ${color === "#ffffff" ? "text-black" : "text-white"}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => setStep(2)}
                data-testid="button-next-step"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Describe your project</h1>
                <p className="text-muted-foreground text-sm">Give your project a name and a prompt to get started.</p>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-card-border">
                {logoData ? (
                  <img src={logoData} alt="Logo" className="h-10 w-10 rounded-lg object-contain shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">No logo</span>
                  </div>
                )}
                <div className="flex-1 flex items-center gap-3 flex-wrap">
                  <span
                    className="text-sm font-medium text-foreground"
                    style={{ fontFamily: selectedFont === "CustomUpload" ? "'CustomUpload', sans-serif" : `'${selectedFont}', sans-serif` }}
                  >
                    {fontDisplayName}
                  </span>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: selectedColor }} />
                    <span className="text-xs font-mono text-muted-foreground">{selectedColor}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs shrink-0"
                  data-testid="button-edit-brand"
                >
                  Edit
                </Button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. My Brand Website"
                            data-testid="input-project-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Acme, Notion, Stripe"
                            data-testid="input-brand-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what you want to build or generate..."
                            className="min-h-36 resize-none"
                            data-testid="input-project-prompt"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="gap-2"
                      data-testid="button-back-step"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 gap-2"
                      disabled={createMutation.isPending}
                      data-testid="button-create-project"
                    >
                      {createMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
