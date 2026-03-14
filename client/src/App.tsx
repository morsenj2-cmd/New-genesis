import { ClerkProvider, useAuth, AuthenticateWithRedirectCallback } from "@clerk/react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import DashboardPage from "@/pages/dashboard";
import ProjectPage from "@/pages/project";
import NewProjectPage from "@/pages/new-project";
import BlogPage from "@/pages/blog";
import AboutPage from "@/pages/about";
import { Loader2 } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate(`/sign-in?redirect=${encodeURIComponent(location)}`);
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <LoadingScreen />;
  return <Component />;
}

function AuthRedirect({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const params = new URLSearchParams(window.location.search);
      navigate(params.get("redirect") || "/dashboard", { replace: true });
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <LoadingScreen />;
  return <Component />;
}

function RootRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (window.location.pathname === "/") {
      setLocation("/dashboard");
    }
  }, []);

  return <LoadingScreen />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/sign-in" component={() => <AuthRedirect component={SignInPage} />} />
      <Route path="/sign-up" component={() => <AuthRedirect component={SignUpPage} />} />
      <Route path="/sign-in/sso-callback" component={() => <AuthenticateWithRedirectCallback />} />
      <Route path="/sign-up/sso-callback" component={() => <AuthenticateWithRedirectCallback />} />
      <Route path="/sign-in/factor-one" component={() => <AuthRedirect component={SignInPage} />} />
      <Route path="/sign-in/factor-two" component={() => <AuthRedirect component={SignInPage} />} />
      <Route path="/sign-up/verify-email-address" component={() => <AuthRedirect component={SignUpPage} />} />
      <Route path="/sign-up/continue" component={() => <AuthRedirect component={SignUpPage} />} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/new" component={NewProjectPage} />
      <Route path="/project/:id" component={() => <ProtectedRoute component={ProjectPage} />} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App({ publishableKey }: { publishableKey: string }) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
