import { SignUp } from "@clerk/react";
import { Layers } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Layers className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">Genome Studio</span>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-6">
              Start building<br />something unique.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Join thousands of developers using deterministic genome seeds to create reproducible generative projects.
            </p>
          </div>
          <div className="mt-16 space-y-4">
            {[
              "Deterministic seed generation from your project data",
              "Save and version your genome configurations",
              "Reproduce any generative output perfectly",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{feature}</span>
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Create your account</h2>
          <p className="text-muted-foreground mb-8">Start building in seconds — free forever</p>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            afterSignUpUrl="/dashboard"
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
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
