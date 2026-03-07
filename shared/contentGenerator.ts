export interface ProductContent {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  secondaryCtaLabel: string;
  features: string[];
  navLinks: string[];
}

const CONTENT_MAP: Record<string, ProductContent> = {
  cloud_storage: {
    headline: "Secure cloud storage built for modern teams",
    subheadline: "Store, sync, and collaborate on files from anywhere. Enterprise-grade security with zero compromise on speed.",
    ctaLabel: "Start Uploading Free",
    secondaryCtaLabel: "See How It Works",
    features: ["End-to-end encryption", "Instant file sync", "Team collaboration", "Version history", "Access controls", "99.99% uptime"],
    navLinks: ["Files", "Storage", "Sharing", "Pricing"],
  },
  chat_app: {
    headline: "Where teams communicate, collaborate and create",
    subheadline: "Bring all your team conversations, files, and tools into one powerful workspace. Real-time messaging for the modern team.",
    ctaLabel: "Launch Your Workspace",
    secondaryCtaLabel: "Explore Features",
    features: ["Real-time messaging", "File sharing", "Video calls", "Thread replies", "Integrations", "Search history"],
    navLinks: ["Messages", "Channels", "Apps", "Pricing"],
  },
  analytics_dashboard: {
    headline: "Turn data into decisions that matter",
    subheadline: "Powerful analytics, beautiful dashboards, actionable insights. Track every metric that drives your business forward.",
    ctaLabel: "Start Analyzing",
    secondaryCtaLabel: "View Demo",
    features: ["Real-time dashboards", "Custom reports", "Trend analysis", "Team sharing", "Data exports", "Alert system"],
    navLinks: ["Dashboard", "Reports", "Insights", "Pricing"],
  },
  ecommerce: {
    headline: "Shop smarter. Live better.",
    subheadline: "Discover thousands of quality products at unbeatable prices. Fast delivery, easy returns, trusted by millions.",
    ctaLabel: "Shop Now",
    secondaryCtaLabel: "View Catalogue",
    features: ["Free shipping", "Easy returns", "Secure checkout", "Price match", "Customer reviews", "24/7 support"],
    navLinks: ["Shop", "Categories", "Deals", "Account"],
  },
  project_management: {
    headline: "Ship projects faster. Together.",
    subheadline: "Plan, track, and deliver your best work. The project management platform designed for high-performing teams.",
    ctaLabel: "Start Free Trial",
    secondaryCtaLabel: "Watch Demo",
    features: ["Kanban & Scrum", "Time tracking", "Team workload", "Milestone tracking", "Custom workflows", "Integrations"],
    navLinks: ["Projects", "Team", "Timeline", "Pricing"],
  },
  crm: {
    headline: "Close more deals. Build stronger relationships.",
    subheadline: "The CRM that works the way your team does. Manage leads, track deals, and grow revenue without the complexity.",
    ctaLabel: "Try Free for 14 Days",
    secondaryCtaLabel: "See Features",
    features: ["Lead management", "Pipeline view", "Email tracking", "Auto-follow ups", "Revenue forecasts", "Team reports"],
    navLinks: ["Pipeline", "Contacts", "Reports", "Pricing"],
  },
  social_media: {
    headline: "Connect with what matters most",
    subheadline: "Share moments, follow creators, and join communities that inspire you. Your world, your feed, your way.",
    ctaLabel: "Join the Community",
    secondaryCtaLabel: "Explore",
    features: ["Creator tools", "Live streaming", "Community groups", "Analytics", "Monetization", "Privacy controls"],
    navLinks: ["Home", "Explore", "Create", "Profile"],
  },
  saas_generic: {
    headline: "The platform your team deserves",
    subheadline: "Streamline your workflow, scale your output, and deliver results that matter. Built for teams that refuse to settle.",
    ctaLabel: "Get Started Free",
    secondaryCtaLabel: "Book a Demo",
    features: ["Quick setup", "Team collaboration", "API access", "SSO & security", "Custom integrations", "Priority support"],
    navLinks: ["Features", "Pricing", "Docs", "About"],
  },
  developer_tool: {
    headline: "Ship faster. Break nothing.",
    subheadline: "The developer platform designed for speed without sacrifice. Build, test, and deploy with confidence every time.",
    ctaLabel: "Start Building",
    secondaryCtaLabel: "Read the Docs",
    features: ["TypeScript SDK", "REST & GraphQL", "CI/CD integration", "Error monitoring", "Team workspaces", "99.9% uptime"],
    navLinks: ["Docs", "API", "SDK", "Pricing"],
  },
  video_platform: {
    headline: "Stream. Create. Grow.",
    subheadline: "Host, manage, and share video content with the world. Professional streaming infrastructure made simple.",
    ctaLabel: "Start Streaming",
    secondaryCtaLabel: "Explore Plans",
    features: ["4K streaming", "Live & on-demand", "Custom player", "Analytics", "DRM protection", "CDN delivery"],
    navLinks: ["Videos", "Live", "Analytics", "Pricing"],
  },
  fintech: {
    headline: "Your money. Smarter.",
    subheadline: "Manage, grow, and protect your finances with intelligent tools built for the way you live and work today.",
    ctaLabel: "Open Account",
    secondaryCtaLabel: "Learn More",
    features: ["Instant transfers", "Spending insights", "Investment tools", "Bill automation", "Budgeting", "Bank-grade security"],
    navLinks: ["Dashboard", "Cards", "Transfers", "Invest"],
  },
  healthcare: {
    headline: "Better care starts here",
    subheadline: "Connect with healthcare providers, manage your records, and take control of your wellbeing — all in one place.",
    ctaLabel: "Book Appointment",
    secondaryCtaLabel: "Find a Doctor",
    features: ["Instant booking", "Video consultations", "Health records", "Prescription management", "Lab results", "Insurance claims"],
    navLinks: ["Providers", "Appointments", "Records", "Prescriptions"],
  },
  education: {
    headline: "Learn anything. Grow everywhere.",
    subheadline: "World-class courses taught by industry experts. Learn at your pace, earn recognized certifications.",
    ctaLabel: "Explore Courses",
    secondaryCtaLabel: "Try for Free",
    features: ["10,000+ courses", "Expert instructors", "Certificates", "Offline access", "Progress tracking", "Community forums"],
    navLinks: ["Courses", "Instructors", "Certificates", "Pricing"],
  },
  calendar_scheduling: {
    headline: "Time management, finally solved",
    subheadline: "Smart scheduling that works around you. Book meetings, manage availability, and eliminate the scheduling back-and-forth.",
    ctaLabel: "Get Your Link",
    secondaryCtaLabel: "See Integrations",
    features: ["One-click booking", "Calendar sync", "Team scheduling", "Buffer times", "Reminders", "Video call links"],
    navLinks: ["Schedule", "Meetings", "Team", "Integrations"],
  },
};

const DEFAULT_CONTENT: ProductContent = {
  headline: "Built for scale. Designed for teams.",
  subheadline: "The modern platform for every workflow. Fast, reliable, and beautifully designed.",
  ctaLabel: "Get Started",
  secondaryCtaLabel: "Learn More",
  features: ["Blazing fast", "Built to scale", "Team collaboration", "Enterprise security", "Always available", "24/7 support"],
  navLinks: ["Features", "Pricing", "Docs", "About"],
};

export function getProductContent(productType: string | null | undefined): ProductContent {
  if (!productType) return DEFAULT_CONTENT;
  return CONTENT_MAP[productType] ?? DEFAULT_CONTENT;
}

export function getNavLinks(productType: string | null | undefined): string[] {
  return getProductContent(productType).navLinks;
}
