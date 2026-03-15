import { useEffect, useState, useCallback } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Hash, Clock, ChevronRight, X, Info, Crown, Users } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Project } from "@shared/schema";
import spiralBg from "../assets/spiral-bg.png";

function ProjectCard({ project }: { project: Project }) {
  const fontLabel = project.font || "Arimo";
  return (
    <Link href={`/project/${project.id}`}>
      <Card
        className="cursor-pointer hover-elevate transition-all duration-200 group h-full"
        data-testid={`card-project-${project.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {project.logoUrl ? (
                <img
                  src={project.logoUrl}
                  alt="Logo"
                  className="h-9 w-9 rounded-lg object-contain shrink-0 border border-border"
                />
              ) : (
                <div
                  className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: project.themeColor ? `${project.themeColor}20` : undefined }}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.themeColor || "#3b82f6" }}
                  />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1" style={{ fontFamily: `'${fontLabel}', sans-serif` }}>
                  {project.prompt}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs gap-1 font-mono">
              <Hash className="h-3 w-3" />
              {project.seed.slice(0, 10)}...
            </Badge>
            {project.font && (
              <Badge variant="outline" className="text-xs" style={{ fontFamily: `'${project.font}', sans-serif` }}>
                {project.font}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(project.createdAt), "MMM d, yyyy")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


function GuestHero() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full min-h-96 text-center px-4">
      <div className="relative z-10">
        <h2
          className="text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight max-w-2xl"
          style={{ fontFamily: "'Arimo', sans-serif" }}
          data-testid="text-hero-tagline"
        >
          Make your vibecoded app stand out in minutes!
        </h2>
        <p
          className="text-lg text-muted-foreground"
          style={{ fontFamily: "'Arimo', sans-serif" }}
          data-testid="text-hero-sub"
        >
          No code needed!
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full min-h-96 text-center px-4">
      <div className="relative z-10">
        <h2
          className="text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight max-w-2xl"
          style={{ fontFamily: "'Arimo', sans-serif" }}
          data-testid="text-hero-tagline-auth"
        >
          Make your vibecoded app stand out in minutes!
        </h2>
        <p
          className="text-lg text-muted-foreground mb-8"
          style={{ fontFamily: "'Arimo', sans-serif" }}
        >
          No code needed!
        </p>
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mx-auto">
          Create your first project to get started. Set up your brand and describe what you want to build.
        </p>
      </div>
    </div>
  );
}

function ProjectGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1.5" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-5 w-28 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const { user, isLoaded } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoaded || !user || !isSignedIn) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;
    getToken().then((token) => {
      fetch("/api/user/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      }).catch(console.error);
    });
  }, [isLoaded, user, isSignedIn]);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/project/list"],
    enabled: !!isSignedIn,
  });

  const { data: subscription } = useQuery<{ plan: string; active: boolean; totalCredits: number; creditsUsed: number; creditsRemaining: number }>({
    queryKey: ["/api/user/subscription"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/user/subscription", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
  });

  const isMorseBlack = subscription?.plan === "morse_black" && subscription?.active;

  const { data: sharedProjects } = useQuery<(Project & { collaboratorRole: string })[]>({
    queryKey: ["/api/project/shared"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/project/shared", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch shared projects");
      return res.json();
    },
  });

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleCreateClick = () => {
    if (isSignedIn) {
      setShowDisclaimer(true);
    } else {
      navigate("/sign-in?redirect=%2Fnew");
    }
  };

  const handleDisclaimerClose = useCallback(() => {
    setShowDisclaimer(false);
    navigate("/new");
  }, [navigate]);

  const projectCount = projects?.length ?? 0;

  return (
    <SidebarProvider>
      <div
        className="relative flex h-screen w-full"
        data-testid="spiral-background"
        style={{
          backgroundColor: "#000",
          backgroundImage: `url(${spiralBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {showDisclaimer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            data-testid="disclaimer-overlay"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={handleDisclaimerClose}
            />
            <div
              className="relative z-10 max-w-md w-full mx-4 rounded-2xl p-6 border border-white/[0.08]"
              style={{
                background: "rgba(12, 12, 12, 0.55)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                boxShadow:
                  "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06), 0 16px 48px rgba(0, 0, 0, 0.5)",
              }}
              data-testid="disclaimer-modal"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <Info className="h-5 w-5 text-white/70" />
                </div>
                <button
                  onClick={handleDisclaimerClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
                  data-testid="button-disclaimer-close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p
                className="text-white/90 text-sm leading-relaxed mb-6"
                style={{ fontFamily: "'Arimo', sans-serif" }}
                data-testid="text-disclaimer"
              >
                Morse makes better landing page designs than complex application
                interfaces such as dashboards. Work is underway to expand its
                capabilities in these areas.
              </p>
              <Button
                onClick={handleDisclaimerClose}
                className="w-full"
                data-testid="button-disclaimer-continue"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
        <AppSidebar onNewProject={() => setShowDisclaimer(true)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-transparent sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-foreground">Your work</h1>
                  {isMorseBlack && (
                    <Badge
                      className="gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/15 text-[10px] px-1.5 py-0"
                      data-testid="badge-morse-black-header"
                    >
                      <Crown className="h-3 w-3" />
                      BLACK
                    </Badge>
                  )}
                </div>
                {isSignedIn && (
                  <p className="text-xs text-muted-foreground">
                    {isLoading ? "Loading..." : `${projectCount} project${projectCount !== 1 ? "s" : ""}`}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={handleCreateClick}
              data-testid="button-new-project"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </header>

          <main className="flex-1 overflow-y-auto p-6 relative">
            {!isSignedIn && isLoaded ? (
              <GuestHero />
            ) : isLoading ? (
              <ProjectGridSkeleton />
            ) : !projects || projects.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}

            {sharedProjects && sharedProjects.length > 0 && (
              <div className="mt-8" data-testid="shared-projects-section">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Shared with you</h2>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {sharedProjects.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedProjects.map((project) => (
                    <div key={project.id} className="relative">
                      <ProjectCard project={project} />
                      <Badge
                        variant="outline"
                        className="absolute top-2 right-2 text-[10px] capitalize"
                        data-testid={`badge-role-${project.id}`}
                      >
                        {project.collaboratorRole}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
