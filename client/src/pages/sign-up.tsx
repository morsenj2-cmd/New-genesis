import { SignUp } from "@clerk/react";
import logoPath from "@assets/--._1772868829725.png";

export default function SignUpPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-col w-1/2 border-r border-border p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-16">
            <img
              src={logoPath}
              alt="Morse"
              className="h-10 w-10 rounded-xl object-cover dark:invert-0 invert"
            />
            <span className="text-xl font-semibold text-foreground tracking-tight">Morse</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-6">
              Get started with Morse.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Create an account to start building and managing your projects.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img
              src={logoPath}
              alt="Morse"
              className="h-9 w-9 rounded-xl object-cover dark:invert-0 invert"
            />
            <span className="text-lg font-semibold text-foreground tracking-tight">Morse</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Create your account</h2>
          <p className="text-muted-foreground mb-8">Sign up to get started</p>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl={`/sign-in?redirect=${encodeURIComponent(redirectUrl)}`}
            forceRedirectUrl={redirectUrl}
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-border bg-card rounded-xl p-6",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-border bg-background text-foreground rounded-lg font-medium",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground text-xs",
                formFieldLabel: "text-sm font-medium text-foreground",
                formFieldInput: "rounded-lg border-border bg-background text-foreground",
                formButtonPrimary: "bg-primary text-primary-foreground rounded-lg font-medium",
                footerActionLink: "text-primary font-medium",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
