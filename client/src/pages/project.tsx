import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { format } from "date-fns";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Hash,
  Clock,
  FileText,
  Dna,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import type { Project } from "@shared/schema";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      data-testid="button-copy-seed"
      className="h-7 w-7"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function SeedVisualization({ seed }: { seed: string }) {
  const chunks = seed.match(/.{1,8}/g) || [];
  return (
    <div className="font-mono text-xs grid grid-cols-4 gap-1.5">
      {chunks.map((chunk, i) => (
        <div
          key={i}
          className="bg-muted rounded px-2 py-1 text-center text-muted-foreground"
          style={{
            color: `hsl(${parseInt(chunk.slice(0, 2), 16) * 1.4}deg 60% 45%)`,
          }}
        >
          {chunk}
        </div>
      ))}
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ["/api/project", params.id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/project/${params.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load project");
      }
      return res.json();
    },
    enabled: !!params.id,
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back"
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : project ? (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
                <Badge variant="secondary" data-testid="badge-project-status">
                  Active
                </Badge>
              </div>
            ) : null}
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <ProjectSkeleton />
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full min-h-64 text-center">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Failed to load project</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : "Something went wrong"}
                </p>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Back to Dashboard
                </Button>
              </div>
            ) : project ? (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-4">
                    <Card data-testid="card-project-details">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          Project Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Name</p>
                          <p className="text-sm font-medium text-foreground" data-testid="text-project-name">
                            {project.name}
                          </p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Created</p>
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span data-testid="text-project-created">
                              {format(new Date(project.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Project ID</p>
                          <p className="text-xs font-mono text-muted-foreground break-all" data-testid="text-project-id">
                            {project.id}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          Prompt
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-foreground leading-relaxed" data-testid="text-project-prompt">
                          {project.prompt}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Dna className="h-3.5 w-3.5" />
                            Genome Seed
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Hash className="h-2.5 w-2.5" />
                              SHA-256
                            </Badge>
                            <CopyButton text={project.seed} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div
                          className="bg-muted rounded-lg p-4 font-mono text-xs text-muted-foreground break-all select-all"
                          data-testid="text-project-seed"
                        >
                          {project.seed}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-3">Seed Visualization</p>
                          <SeedVisualization seed={project.seed} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This deterministic seed was generated from a SHA-256 hash of your user ID, project ID, and creation timestamp. It will always produce the same outputs when used with compatible generative systems.
                        </p>
                      </CardContent>
                    </Card>

                    {(project.genomeJson || project.layoutJson) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Stored Configurations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {project.genomeJson && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Genome JSON</p>
                              <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto max-h-40">
                                {project.genomeJson}
                              </pre>
                            </div>
                          )}
                          {project.layoutJson && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Layout JSON</p>
                              <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto max-h-40">
                                {project.layoutJson}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
