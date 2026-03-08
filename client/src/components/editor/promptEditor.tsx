import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Brain, Zap, AlertCircle, CheckCircle } from "lucide-react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph } from "@shared/layoutEngine";
import type { NLContentPatch } from "@/components/NLDesigner";

interface IntentPreview {
  intentType: string;
  confidence: number;
  description: string;
  actions: Array<{ verb: string; target: string; value?: string }>;
}

interface PromptEditorProps {
  projectId: string;
  onApplied: (genome: DesignGenome, layout: LayoutGraph, contentPatch?: NLContentPatch) => void;
  className?: string;
}

const INTENT_LABELS: Record<string, string> = {
  style_change: "Style",
  layout_modification: "Layout",
  content_update: "Content",
  brand_rename: "Brand",
  context_correction: "Context",
  regenerate: "Regenerate",
  compound: "Multi",
  design_generation: "Generate",
};

const INTENT_COLORS: Record<string, string> = {
  style_change: "#8b5cf6",
  layout_modification: "#3b82f6",
  content_update: "#10b981",
  brand_rename: "#f59e0b",
  context_correction: "#ef4444",
  regenerate: "#6366f1",
  compound: "#ec4899",
  design_generation: "#06b6d4",
};

const EXAMPLE_PROMPTS = [
  "Make it more minimal with better spacing",
  "Change the primary color to teal",
  "Add a testimonials section",
  "Make it look more professional",
  "Rename the brand to Nexus",
  "Switch to a dark theme with bold typography",
];

export function PromptEditor({ projectId, onApplied, className = "" }: PromptEditorProps) {
  const { getToken } = useAuth();
  const [command, setCommand] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intentPreview, setIntentPreview] = useState<IntentPreview | null>(null);
  const [result, setResult] = useState<{ description: string[]; patchCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const analyzeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (analyzeTimeout.current) clearTimeout(analyzeTimeout.current);
    if (!command.trim() || command.trim().length < 4) {
      setIntentPreview(null);
      return;
    }
    setIsAnalyzing(true);
    analyzeTimeout.current = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/ai/interpret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ prompt: command.trim(), projectId }),
        });
        if (res.ok) {
          const data = await res.json();
          setIntentPreview({
            intentType: data.intent?.intentType ?? "style_change",
            confidence: Math.round((data.intent?.confidence ?? 0) * 100),
            description: data.description || "",
            actions: data.intent?.actions ?? [],
          });
        }
      } catch {}
      setIsAnalyzing(false);
    }, 500);
    return () => {
      if (analyzeTimeout.current) clearTimeout(analyzeTimeout.current);
    };
  }, [command, projectId]);

  async function handleApply() {
    if (!command.trim()) return;
    setIsPending(true);
    setResult(null);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/project/${projectId}/apply-nl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ commands: command.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to apply");
      }
      const data = await res.json();
      setResult({ description: data.description, patchCount: data.patchCount });
      if (data.project?.genomeJson && data.project?.layoutJson) {
        const newGenome: DesignGenome = JSON.parse(data.project.genomeJson);
        const newLayout: LayoutGraph = JSON.parse(data.project.layoutJson);
        onApplied(newGenome, newLayout, data.contentPatch ?? {});
      }
      setCommand("");
      setIntentPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setIsPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleApply();
    }
  }

  const intentColor = intentPreview ? (INTENT_COLORS[intentPreview.intentType] ?? "#6b7280") : null;

  return (
    <div className={`flex flex-col gap-3 ${className}`} data-testid="prompt-editor">
      <div className="relative">
        <Textarea
          data-testid="input-prompt-editor"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what to change... (⌘Enter to apply)"
          className="min-h-[72px] resize-none text-sm pr-4 bg-black/40 border-white/10 text-white placeholder:text-white/30 focus:border-white/20"
          disabled={isPending}
        />
        {isAnalyzing && (
          <div className="absolute top-2 right-2">
            <Brain className="w-3.5 h-3.5 text-white/30 animate-pulse" />
          </div>
        )}
      </div>

      {intentPreview && !isPending && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs border"
          style={{
            backgroundColor: `${intentColor}10`,
            borderColor: `${intentColor}30`,
          }}
          data-testid="intent-preview"
        >
          <div
            className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: intentColor ?? "#6b7280" }}
          />
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-[11px] uppercase tracking-wider"
                style={{ color: intentColor ?? "#fff" }}
              >
                {INTENT_LABELS[intentPreview.intentType] ?? intentPreview.intentType}
              </span>
              <span className="text-white/30 text-[10px]">
                {intentPreview.confidence}% confident
              </span>
            </div>
            {intentPreview.description && (
              <span className="text-white/60 truncate">{intentPreview.description}</span>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-emerald-500/10 border border-emerald-500/20" data-testid="apply-result">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-300">
            {Array.isArray(result.description) ? result.description.join(" · ") : result.description}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-red-500/10 border border-red-500/20" data-testid="apply-error">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {!command && EXAMPLE_PROMPTS.slice(0, 2).map((ex, i) => (
            <button
              key={i}
              data-testid={`example-prompt-${i}`}
              onClick={() => setCommand(ex)}
              className="text-[10px] text-white/30 hover:text-white/60 px-2 py-0.5 rounded border border-white/10 hover:border-white/20 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
        <Button
          data-testid="button-apply-prompt"
          size="sm"
          onClick={handleApply}
          disabled={isPending || !command.trim()}
          className="h-7 text-xs px-3 gap-1.5 shrink-0"
        >
          {isPending ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Applying...</>
          ) : (
            <><Zap className="w-3 h-3" /> Apply</>
          )}
        </Button>
      </div>
    </div>
  );
}
