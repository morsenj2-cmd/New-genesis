import { SignIn } from "@clerk/react";
import { Layers } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Layers className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">Genome Studio</span>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-6">
              Build. Generate.<br />Evolve.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Create and manage generative AI projects with deterministic seeds and reproducible genome structures.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-4">
            {[
              { label: "Projects Created", value: "10K+" },
              { label: "Unique Seeds", value: "∞" },
              { label: "Developers", value: "2K+" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card/50 rounded-lg p-4 border border-card-border">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Genome Studio</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-card-border bg-card rounded-xl p-6",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-border bg-background hover:bg-accent text-foreground rounded-lg font-medium",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground text-xs",
                formFieldLabel: "text-sm font-medium text-foreground",
                formFieldInput: "rounded-lg border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary",
                formButtonPrimary: "bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90",
                footerActionLink: "text-primary font-medium",
                identityPreviewText: "text-foreground",
                identityPreviewEditButton: "text-primary",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
