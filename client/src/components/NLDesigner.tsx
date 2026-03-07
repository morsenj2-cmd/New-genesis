import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wand2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph } from "@shared/layoutEngine";

interface NLDesignerProps {
  projectId: string;
  onApplied: (genome: DesignGenome, layout: LayoutGraph) => void;
}

const EXAMPLE_COMMANDS = [
  "use blue as primary",
  "make it more minimal",
  "reduce animations",
  "set industry to saas",
  "disable custom icons",
];

export function NLDesigner({ projectId, onApplied }: NLDesignerProps) {
  const { getToken } = useAuth();
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
        onApplied(newGenome, newLayout);
      }
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
        placeholder='Try: "use blue as primary" or "make it minimal"'
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
              {result.patchCount > 0 ? (
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <span className="text-foreground">{line}</span>
            </div>
          ))}
          {result.patchCount > 0 && (
            <Badge variant="outline" className="text-xs mt-1">
              {result.patchCount} patch{result.patchCount !== 1 ? "es" : ""} applied
            </Badge>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive" data-testid="nl-error">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      <Separator />
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Examples</p>
        <div className="flex flex-wrap gap-1">
          {EXAMPLE_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => setCommand(cmd)}
              className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              data-testid={`nl-example-${cmd.replace(/\s+/g, "-")}`}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
