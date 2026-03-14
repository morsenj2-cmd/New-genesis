import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph } from "@shared/layoutEngine";

export interface NLContentPatch {
  brandName?: string;
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
}

interface NLDesignerProps {
  projectId: string;
  onApplied: (genome: DesignGenome, layout: LayoutGraph, contentPatch?: NLContentPatch) => void;
}


export function NLDesigner({ projectId, onApplied }: NLDesignerProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [command, setCommand] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{
    description: string[];
    patchCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(err.message || "Failed to apply command");
      }
      const data = await res.json();
      setResult({ description: data.description, patchCount: data.patchCount });

      if (data.project?.genomeJson && data.project?.layoutJson) {
        const newGenome: DesignGenome = JSON.parse(data.project.genomeJson);
        const newLayout: LayoutGraph = JSON.parse(data.project.layoutJson);
        const contentPatch: NLContentPatch = data.contentPatch ?? {};
        onApplied(newGenome, newLayout, contentPatch);
      }
      // Invalidate project query so the new geminiStatus:"pending" is picked up
      // and the AI re-generation polling starts
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
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Wand2 className="h-3 w-3" /> Edit with natural language
      </p>
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
