import { useLocation, Link } from "wouter";
import { useAuth, UserButton } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus, LogIn, BookOpen, Info, Crown } from "lucide-react";
import logoPath from "../assets/logo.png";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Project", url: "/new", icon: Plus },
  { title: "Blog", url: "/blog", icon: BookOpen },
  { title: "About Us", url: "/about", icon: Info },
];

export function AppSidebar({ onNewProject }: { onNewProject?: () => void } = {}) {
  const [location, navigate] = useLocation();
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const { data: subscription } = useQuery<{ plan: string; active: boolean; totalCredits: number; creditsUsedAcrossProjects: number }>({
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

  const handleNewProject = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      navigate("/sign-in?redirect=%2Fnew");
    } else if (onNewProject) {
      onNewProject();
    } else {
      navigate("/new");
    }
  };

  return (
    <Sidebar className="liquid-glass-sidebar">
      <SidebarHeader className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/[0.08] backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/[0.06]">
            <img
              src={logoPath}
              alt="Morse"
              className="h-5 w-5 object-cover dark:invert-0 invert"
            />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">Morse</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      className={
                        isActive
                          ? "bg-white/[0.08] text-sidebar-accent-foreground backdrop-blur-sm border border-white/[0.06] shadow-[0_0_12px_rgba(255,255,255,0.03)]"
                          : "hover:bg-white/[0.05] border border-transparent transition-all duration-200"
                      }
                    >
                      <Link
                        href={item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                        onClick={item.url === "/new" ? handleNewProject : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/[0.06]">
        {isLoaded && isSignedIn ? (
          <div className="space-y-2">
            {isMorseBlack && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 border border-yellow-500/20"
                style={{
                  background: "linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(251,191,36,0.04) 100%)",
                }}
                data-testid="badge-morse-black"
              >
                <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                <span className="text-xs font-semibold text-yellow-500">Morse Black</span>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 bg-white/[0.04]">
              <UserButton
                signInUrl="/sign-in"
                appearance={{ elements: { avatarBox: "h-8 w-8" } }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">Account</p>
                <p className="text-xs text-muted-foreground">Manage profile</p>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.1] backdrop-blur-sm"
            onClick={() => navigate("/sign-in")}
            data-testid="button-sidebar-signin"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
