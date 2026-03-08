import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePageTitle } from "@/hooks/use-page-title";
import spiralBg from "@assets/image_1772970592054.png";

export default function AboutPage() {
  usePageTitle("About Us");
  return (
    <SidebarProvider>
      <div
        className="relative flex h-screen w-full"
        style={{
          backgroundColor: "#000",
          backgroundImage: `url(${spiralBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <header className="flex items-center px-6 py-4 border-b border-white/[0.06] bg-transparent sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-lg font-semibold text-foreground">About Us</h1>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 flex justify-center">
            <div
              className="max-w-2xl w-full rounded-2xl p-8 border border-white/[0.08] overflow-hidden"
              style={{
                background: "rgba(12, 12, 12, 0.55)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                boxShadow:
                  "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06), 0 16px 48px rgba(0, 0, 0, 0.5)",
              }}
              data-testid="about-content"
            >
              <h2
                className="text-2xl font-bold text-white mb-6"
                style={{ fontFamily: "'Arimo', sans-serif" }}
                data-testid="text-about-title"
              >
                About Us
              </h2>
              <div
                className="space-y-4 text-white/80 text-sm leading-relaxed break-words"
                style={{ fontFamily: "'Arimo', sans-serif" }}
              >
                <p>
                  We started with a simple observation: Most vibecoded tools produce
                  the same or generic website designs. It's either spending expensive
                  credits to make it look slightly unique when it should be used for
                  building new features and fixing bugs or using complex design tools
                  which takes a long time to master.
                </p>
                <p>Our goal is to change that.</p>
                <p>
                  We focus on building products that make complex work feel simple.
                  Whether someone is running a growing company, managing operations,
                  or coordinating a team, the tools they rely on should help them move
                  faster, stay organized, and make better decisions without getting in
                  the way.
                </p>
                <p>
                  Our team brings together designers, engineers, and product thinkers
                  who care deeply about usability. We believe the best technology
                  feels intuitive from the moment you open it. Every interface we
                  create is shaped around clarity, thoughtful structure, and
                  real-world workflows.
                </p>
                <p>
                  Instead of chasing trends, we concentrate on building reliable
                  systems that people can trust to run important parts of their
                  business.
                </p>
                <p>
                  What drives us is the idea that good software quietly improves how
                  people work. When the tools are designed well, teams spend less time
                  fighting the interface and more time focusing on what actually
                  matters.
                </p>
                <p className="text-white/90 font-medium">
                  We are building technology that works the way people think.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
