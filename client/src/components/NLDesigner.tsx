import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, CheckCircle, AlertCircle, Loader2, Zap } from "lucide-react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph } from "@shared/layoutEngine";

export interface NLContentPatch {
  brandName?: string;
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
}

const CREDIT_LIMIT = 500;

interface NLDesignerProps {
  projectId: string;
  creditsUsed: number;
  onApplied: (genome: DesignGenome, layout: LayoutGraph, contentPatch?: NLContentPatch) => void;
}


export function NLDesigner({ projectId, creditsUsed: initialCreditsUsed, onApplied }: NLDesignerProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [command, setCommand] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(initialCreditsUsed);

  useEffect(() => {
    setCreditsUsed(initialCreditsUsed);
  }, [initialCreditsUsed]);

  const [result, setResult] = useState<{
    description: string[];
    patchCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const creditsRemaining = Math.max(0, CREDIT_LIMIT - creditsUsed);
  const isOutOfCredits = creditsRemaining <= 0;

  async function handleApply() {
    if (!command.trim() || isOutOfCredits) return;
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
        if (err.creditsUsed !== undefined) {
          setCreditsUsed(err.creditsUsed);
        }
        throw new Error(err.message || "Failed to apply command");
      }
      const data = await res.json();
      setResult({ description: data.description, patchCount: data.patchCount });

      if (data.creditsUsed !== undefined) {
        setCreditsUsed(data.creditsUsed);
      }

      if (data.project?.genomeJson && data.project?.layoutJson) {
        const newGenome: DesignGenome = JSON.parse(data.project.genomeJson);
        const newLayout: LayoutGraph = JSON.parse(data.project.layoutJson);
        const contentPatch: NLContentPatch = data.contentPatch ?? {};
        onApplied(newGenome, newLayout, contentPatch);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId] });
      setCommand("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Wand2 className="h-3 w-3" /> Edit with natural language
        </p>
        <div className="flex items-center gap-1 text-xs" data-testid="text-credits-remaining">
          <Zap className={`h-3 w-3 ${isOutOfCredits ? "text-destructive" : creditsRemaining <= 50 ? "text-yellow-500" : "text-muted-foreground"}`} />
          <span className={isOutOfCredits ? "text-destructive font-medium" : creditsRemaining <= 50 ? "text-yellow-500" : "text-muted-foreground"}>
            {creditsRemaining}/{CREDIT_LIMIT}
          </span>
        </div>
      </div>

      {isOutOfCredits ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-center" data-testid="credits-exhausted">
          <p className="text-xs text-destructive font-medium">Credit limit reached</p>
          <p className="text-xs text-muted-foreground mt-1">
            You've used all {CREDIT_LIMIT} free AI edits for this project.
          </p>
        </div>
      ) : (
        <>
          <Textarea
            placeholder='Try: "make it minimalist with white text" or "add a pricing section" or "use more rounded corners"'
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="text-xs resize-none min-h-[72px]"
            data-testid="input-nl-command"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleApply();
            }}
          />
          <Button
            className="w-full gap-2 text-xs h-8"
            variant="secondary"
            onClick={handleApply}
            disabled={isPending || !command.trim()}
            data-testid="button-apply-nl"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {isPending ? "Applying…" : "Apply"}
          </Button>
        </>
      )}

      {result && (
        <div
          className="space-y-1.5 rounded-md border border-border p-2.5"
          data-testid="nl-result"
        >
          {result.description.map((line, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              <span className="text-foreground">{line}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            <span>AI is rebuilding your app with this change…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive" data-testid="nl-error">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

    </div>
  );
}
