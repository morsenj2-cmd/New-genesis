export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface StatItem {
  icon: string;
  value: string;
  label: string;
}

export interface TestimonialItem {
  text: string;
  author: string;
  role: string;
}

export interface ProductContent {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  secondaryCtaLabel: string;
  ctaHeadline: string;
  ctaBody: string;
  ctaButtonLabel: string;
  featureGridTitle: string;
  cardListTitle: string;
  footerTagline: string;
  features: FeatureItem[];
  stats: StatItem[];
  testimonials: TestimonialItem[];
  navLinks: string[];
}

const CONTENT_MAP: Record<string, ProductContent> = {
  cloud_storage: {
    headline: "Secure cloud storage built for modern teams",
    subheadline: "Store, sync, and collaborate on files from anywhere with enterprise-grade security and zero compromise on speed.",
    ctaLabel: "Start Uploading Free",
    secondaryCtaLabel: "See How It Works",
    ctaHeadline: "Start storing smarter today",
    ctaBody: "Join thousands of teams who manage their files with confidence. Free to start, scales as you grow.",
    ctaButtonLabel: "Start free trial",
    featureGridTitle: "Everything your files need",
    cardListTitle: "Built for how teams work",
    footerTagline: "Secure, fast, and reliable cloud storage for teams of every size.",
    navLinks: ["Files", "Storage", "Sharing", "Pricing"],
    features: [
      { icon: "settings", title: "End-to-end encryption", description: "Every file is encrypted in transit and at rest using AES-256." },
      { icon: "broadcast", title: "Real-time collaboration", description: "Multiple people can view and comment on the same file simultaneously." },
      { icon: "grid", title: "Version history", description: "Restore any previous version of a file with a single click." },
      { icon: "filter", title: "Access controls", description: "Set granular permissions per file, folder, or team member." },
      { icon: "play", title: "Instant sync", description: "Changes sync across all devices in under 50 milliseconds." },
      { icon: "search", title: "Smart search", description: "Find any file instantly with full-text search and AI-powered filters." },
    ],
    stats: [
      { icon: "settings", value: "99.99%", label: "Uptime SLA" },
      { icon: "grid", value: "256-bit", label: "Encryption" },
      { icon: "broadcast", value: "50ms", label: "Sync speed" },
      { icon: "play", value: "10TB+", label: "Max storage" },
    ],
    testimonials: [
      { text: "Finally, a storage platform that keeps our entire team in sync. We've eliminated version conflicts completely.", author: "Sarah M.", role: "Engineering Manager" },
      { text: "The access controls are exactly what we needed. Every file, every permission, fully auditable.", author: "James L.", role: "CTO" },
      { text: "Setup took 10 minutes and our whole company was onboarded by end of day. Incredible.", author: "Priya K.", role: "Operations Lead" },
    ],
  },
  chat_app: {
    headline: "Where teams communicate, collaborate, and create",
    subheadline: "Bring all your team conversations, files, and tools into one powerful workspace built for speed.",
    ctaLabel: "Launch Your Workspace",
    secondaryCtaLabel: "Explore Features",
    ctaHeadline: "Bring your team together",
    ctaBody: "Start free. Invite your team. Get things done faster than ever before.",
    ctaButtonLabel: "Create workspace",
    featureGridTitle: "Communication that actually works",
    cardListTitle: "All the tools your team needs",
    footerTagline: "Real-time messaging and collaboration for modern teams.",
    navLinks: ["Messages", "Channels", "Apps", "Pricing"],
    features: [
      { icon: "chat", title: "Real-time messaging", description: "Instant messages delivered in under 100ms across all devices." },
      { icon: "grid", title: "Organized channels", description: "Keep conversations focused with topic-based channels and threads." },
      { icon: "play", title: "Video & voice calls", description: "Jump from text to HD video call in a single click." },
      { icon: "settings", title: "Custom integrations", description: "Connect with 2,000+ tools your team already uses." },
      { icon: "search", title: "Full message search", description: "Find any message, file, or link shared in any channel instantly." },
      { icon: "filter", title: "Notification control", description: "Stay focused with smart notification scheduling and Do Not Disturb." },
    ],
    stats: [
      { icon: "broadcast", value: "100ms", label: "Message delivery" },
      { icon: "grid", value: "2,000+", label: "Integrations" },
      { icon: "settings", value: "99.99%", label: "Uptime" },
      { icon: "play", value: "4K", label: "Video quality" },
    ],
    testimonials: [
      { text: "Our team went from 150 emails a day to nearly zero. Everything happens in channels now.", author: "Alex R.", role: "Head of Product" },
      { text: "The search is incredible. I can find any conversation from 3 years ago in seconds.", author: "Maria S.", role: "Operations Director" },
      { text: "Video calls, file sharing, task tracking — it replaced four separate tools for us.", author: "Tom B.", role: "Team Lead" },
    ],
  },
  analytics_dashboard: {
    headline: "Turn data into decisions that drive results",
    subheadline: "Powerful analytics, beautiful dashboards, and actionable insights. Track every metric that drives your business forward.",
    ctaLabel: "Start Analyzing",
    secondaryCtaLabel: "View Demo",
    ctaHeadline: "Your data is waiting to be heard",
    ctaBody: "Connect your data sources and start seeing patterns in minutes. No SQL required.",
    ctaButtonLabel: "Start free trial",
    featureGridTitle: "Analytics built for speed",
    cardListTitle: "Reports that answer real questions",
    footerTagline: "Real-time analytics and business intelligence for data-driven teams.",
    navLinks: ["Dashboard", "Reports", "Insights", "Pricing"],
    features: [
      { icon: "broadcast", title: "Real-time dashboards", description: "See your data update live as events happen across your product." },
      { icon: "grid", title: "Custom reports", description: "Build any report with a drag-and-drop editor. No SQL needed." },
      { icon: "filter", title: "Smart alerts", description: "Get notified the moment a key metric moves outside normal range." },
      { icon: "settings", title: "Data connectors", description: "Connect to 200+ data sources including databases, APIs, and spreadsheets." },
      { icon: "search", title: "Cohort analysis", description: "Understand how different user groups behave over time." },
      { icon: "play", title: "Forecast modeling", description: "Predict future trends using historical data and ML-powered forecasts." },
    ],
    stats: [
      { icon: "broadcast", value: "< 1s", label: "Query speed" },
      { icon: "grid", value: "200+", label: "Data connectors" },
      { icon: "settings", value: "99.9%", label: "Uptime" },
      { icon: "filter", value: "10B+", label: "Events tracked daily" },
    ],
    testimonials: [
      { text: "We went from weekly reports to real-time dashboards. Our team makes better decisions every single day.", author: "Daniel C.", role: "VP Analytics" },
      { text: "The cohort analysis alone was worth it. We identified our retention problem within the first week.", author: "Lena P.", role: "Product Manager" },
      { text: "Setup was genuinely 15 minutes. Our entire data stack was connected and we were seeing charts immediately.", author: "Raj T.", role: "Data Engineer" },
    ],
  },
  ecommerce: {
    headline: "Everything your online store needs to grow",
    subheadline: "Launch, manage, and scale your e-commerce business from one powerful platform. Reach customers everywhere.",
    ctaLabel: "Open Your Store",
    secondaryCtaLabel: "Browse Features",
    ctaHeadline: "Your store is ready to launch",
    ctaBody: "Start selling today with zero setup fees. Your first 30 days are free.",
    ctaButtonLabel: "Start selling",
    featureGridTitle: "Tools built for e-commerce growth",
    cardListTitle: "Sell everywhere your customers are",
    footerTagline: "The e-commerce platform built for ambitious merchants.",
    navLinks: ["Shop", "Categories", "Deals", "Account"],
    features: [
      { icon: "tag", title: "Product management", description: "Add unlimited products with variants, bundles, and digital downloads." },
      { icon: "wallet", title: "Secure payments", description: "Accept cards, wallets, and local payment methods in 180+ countries." },
      { icon: "receipt", title: "Order automation", description: "Automate fulfilment, invoicing, and shipping label generation." },
      { icon: "settings", title: "Marketing tools", description: "Email campaigns, discount codes, and abandoned cart recovery built in." },
      { icon: "grid", title: "Inventory tracking", description: "Real-time stock levels across all warehouses and sales channels." },
      { icon: "broadcast", title: "Customer analytics", description: "Understand your buyers with lifetime value, retention, and cohort reports." },
    ],
    stats: [
      { icon: "tag", value: "180+", label: "Countries" },
      { icon: "wallet", value: "99.8%", label: "Payment success" },
      { icon: "settings", value: "0%", label: "Setup fee" },
      { icon: "receipt", value: "24/7", label: "Support" },
    ],
    testimonials: [
      { text: "We launched our store in a single afternoon and made our first sale the same day.", author: "Emma W.", role: "Store Owner" },
      { text: "The shipping integrations saved us 10 hours a week on order fulfilment alone.", author: "Carlos M.", role: "Operations Manager" },
      { text: "Going from 50 to 5,000 orders a month without changing any of our setup. That's real scalability.", author: "Nina H.", role: "Founder" },
    ],
  },
  project_management: {
    headline: "Ship projects faster. Together.",
    subheadline: "Plan, track, and deliver your best work. The project management platform designed for high-performing teams.",
    ctaLabel: "Start Free Trial",
    secondaryCtaLabel: "Watch Demo",
    ctaHeadline: "Your next project starts here",
    ctaBody: "Invite your team and set up your first project in under 5 minutes. No credit card required.",
    ctaButtonLabel: "Create your workspace",
    featureGridTitle: "Built for how teams actually work",
    cardListTitle: "Every tool your project needs",
    footerTagline: "Project management software that teams actually enjoy using.",
    navLinks: ["Projects", "Team", "Timeline", "Pricing"],
    features: [
      { icon: "grid", title: "Kanban & Scrum boards", description: "Visualise work in the format that suits your team's workflow." },
      { icon: "filter", title: "Task dependencies", description: "Link tasks, set blockers, and see the critical path automatically." },
      { icon: "broadcast", title: "Time tracking", description: "Log hours directly on tasks and generate timesheets automatically." },
      { icon: "settings", title: "Custom workflows", description: "Build approval flows, review stages, and automation rules." },
      { icon: "search", title: "Team workload", description: "See who is over-capacity and balance assignments in one view." },
      { icon: "play", title: "Milestone tracking", description: "Set project milestones and track progress toward delivery dates." },
    ],
    stats: [
      { icon: "grid", value: "40%", label: "Faster delivery" },
      { icon: "broadcast", value: "10K+", label: "Teams onboarded" },
      { icon: "settings", value: "99.9%", label: "Uptime" },
      { icon: "filter", value: "5 min", label: "To first project" },
    ],
    testimonials: [
      { text: "We cut missed deadlines by 60% in the first quarter. The dependency tracking alone changed how we work.", author: "Ben C.", role: "Engineering Lead" },
      { text: "I can see every project, every person, and every blocker on one screen. It changed my mornings.", author: "Kath D.", role: "Program Manager" },
      { text: "Clients love the progress dashboards we share. It's built so much trust in our delivery process.", author: "Iain S.", role: "Agency Director" },
    ],
  },
  crm: {
    headline: "Close more deals. Build stronger relationships.",
    subheadline: "The CRM that works the way your team does. Manage leads, track deals, and grow revenue without the complexity.",
    ctaLabel: "Try Free for 14 Days",
    secondaryCtaLabel: "See Features",
    ctaHeadline: "Your pipeline is waiting",
    ctaBody: "Set up your CRM in minutes, not months. Import your contacts and start closing today.",
    ctaButtonLabel: "Start free trial",
    featureGridTitle: "CRM that helps you sell smarter",
    cardListTitle: "Every tool your sales team needs",
    footerTagline: "The CRM built for modern sales teams who want to move fast.",
    navLinks: ["Pipeline", "Contacts", "Reports", "Pricing"],
    features: [
      { icon: "filter", title: "Pipeline view", description: "See every deal at every stage in one clear drag-and-drop board." },
      { icon: "mail", title: "Email tracking", description: "Know exactly when leads open your emails and click your links." },
      { icon: "broadcast", title: "Auto follow-ups", description: "Set automated follow-up sequences so no lead ever goes cold." },
      { icon: "grid", title: "Lead scoring", description: "Prioritise the leads most likely to close with built-in scoring." },
      { icon: "settings", title: "Revenue forecasts", description: "Predict quarterly revenue from your live pipeline with confidence." },
      { icon: "receipt", title: "Activity logging", description: "Log calls, meetings, and notes automatically from your email and calendar." },
    ],
    stats: [
      { icon: "filter", value: "35%", label: "Higher close rate" },
      { icon: "mail", value: "2x", label: "More meetings booked" },
      { icon: "settings", value: "99.9%", label: "Uptime" },
      { icon: "broadcast", value: "5 min", label: "Setup time" },
    ],
    testimonials: [
      { text: "Our close rate went up 35% in the first three months. The pipeline visibility changed everything.", author: "Grace O.", role: "Sales Director" },
      { text: "The email tracking alone made my team 30% more effective. They know exactly when to follow up.", author: "Mike F.", role: "Account Executive" },
      { text: "We migrated from Salesforce in a weekend. Best decision we made this year.", author: "Sophie T.", role: "Revenue Operations" },
    ],
  },
  social_media: {
    headline: "Connect with what matters most",
    subheadline: "Share moments, follow creators, and join communities that inspire you. Your world, your feed, your way.",
    ctaLabel: "Join the Community",
    secondaryCtaLabel: "Explore",
    ctaHeadline: "Start sharing today",
    ctaBody: "Join millions of people sharing ideas, stories, and moments. Free to join, always.",
    ctaButtonLabel: "Create account",
    featureGridTitle: "Express yourself fully",
    cardListTitle: "Tools built for creators",
    footerTagline: "The social platform that puts creators first.",
    navLinks: ["Home", "Explore", "Create", "Profile"],
    features: [
      { icon: "play", title: "Rich media posts", description: "Share photos, videos, audio, and long-form content in one place." },
      { icon: "broadcast", title: "Live streaming", description: "Go live to your audience instantly with HD video and real-time chat." },
      { icon: "grid", title: "Community groups", description: "Create and join communities around any topic or interest." },
      { icon: "filter", title: "Creator analytics", description: "Understand your audience growth, reach, and engagement in detail." },
      { icon: "wallet", title: "Monetization", description: "Earn from subscriptions, tips, and exclusive content for fans." },
      { icon: "settings", title: "Privacy controls", description: "Full control over who sees your content, always." },
    ],
    stats: [
      { icon: "broadcast", value: "50M+", label: "Active users" },
      { icon: "play", value: "1B+", label: "Posts daily" },
      { icon: "grid", value: "5M+", label: "Communities" },
      { icon: "wallet", value: "$100M+", label: "Creator earnings" },
    ],
    testimonials: [
      { text: "I grew my following from 500 to 50,000 in six months. The discovery tools actually work.", author: "Lisa M.", role: "Content Creator" },
      { text: "Finally a platform that lets me own my audience. The subscription tools changed my business.", author: "Dayo A.", role: "Independent Creator" },
      { text: "The community tools are unlike anything else. My group has become the best part of my week.", author: "Yi L.", role: "Community Builder" },
    ],
  },
  saas_generic: {
    headline: "The platform your team has been waiting for",
    subheadline: "Streamline your workflow, scale your output, and deliver results that matter — built for teams that refuse to settle.",
    ctaLabel: "Get Started Free",
    secondaryCtaLabel: "Book a Demo",
    ctaHeadline: "Ready to get more done?",
    ctaBody: "Start free. No credit card required. Set up in minutes and invite your whole team.",
    ctaButtonLabel: "Start for free",
    featureGridTitle: "Built for teams that move fast",
    cardListTitle: "Everything you need in one place",
    footerTagline: "The platform built for modern teams who want to move faster.",
    navLinks: ["Features", "Pricing", "Docs", "About"],
    features: [
      { icon: "settings", title: "Quick setup", description: "Get your team up and running in under 10 minutes with guided onboarding." },
      { icon: "grid", title: "Team collaboration", description: "Real-time collaboration tools that keep everyone aligned." },
      { icon: "broadcast", title: "API access", description: "Full REST API so you can connect to any tool in your stack." },
      { icon: "filter", title: "Role-based access", description: "Granular permissions ensure the right people see the right things." },
      { icon: "settings", title: "SSO & security", description: "Enterprise-grade security with SAML SSO, 2FA, and audit logs." },
      { icon: "play", title: "Analytics", description: "Track usage, adoption, and team performance in real time." },
    ],
    stats: [
      { icon: "broadcast", value: "99.9%", label: "Uptime" },
      { icon: "grid", value: "10 min", label: "Average setup" },
      { icon: "settings", value: "50K+", label: "Teams" },
      { icon: "play", value: "24/7", label: "Support" },
    ],
    testimonials: [
      { text: "Setup was faster than any platform we've tried. The whole team was onboarded in an hour.", author: "Chris P.", role: "CTO" },
      { text: "The API is clean and well-documented. We built our integration in an afternoon.", author: "Ana M.", role: "Lead Developer" },
      { text: "Finally a tool that does what it says without getting in our way. Highly recommended.", author: "Jake R.", role: "Product Lead" },
    ],
  },
  developer_tool: {
    headline: "Ship faster. Break nothing.",
    subheadline: "The developer platform designed for speed without sacrifice. Build, test, and deploy with confidence every time.",
    ctaLabel: "Start Building",
    secondaryCtaLabel: "Read the Docs",
    ctaHeadline: "Built by developers, for developers",
    ctaBody: "Read the docs, grab the SDK, and ship your first integration in under an hour.",
    ctaButtonLabel: "View documentation",
    featureGridTitle: "Tools built for developer productivity",
    cardListTitle: "Everything in your developer workflow",
    footerTagline: "The developer platform that ships faster and breaks less.",
    navLinks: ["Docs", "API", "SDK", "Pricing"],
    features: [
      { icon: "grid", title: "TypeScript SDK", description: "Fully typed SDK with autocomplete for every API endpoint." },
      { icon: "play", title: "REST & GraphQL", description: "Choose the API style that fits your architecture." },
      { icon: "settings", title: "CI/CD integration", description: "Native GitHub Actions, GitLab CI, and CircleCI support." },
      { icon: "broadcast", title: "Error monitoring", description: "Real-time error tracking with stack traces and context." },
      { icon: "filter", title: "Rate limiting", description: "Configurable rate limits with clear error messages and retry logic." },
      { icon: "search", title: "Local dev server", description: "Full local emulation so you can develop without touching production." },
    ],
    stats: [
      { icon: "settings", value: "< 50ms", label: "API latency (p99)" },
      { icon: "grid", value: "99.99%", label: "Uptime" },
      { icon: "broadcast", value: "10M+", label: "API calls daily" },
      { icon: "play", value: "100+", label: "SDK languages" },
    ],
    testimonials: [
      { text: "The SDK is the best-designed API wrapper I've used in 10 years of engineering.", author: "Dev P.", role: "Senior Engineer" },
      { text: "We went from integration to production in 4 hours. That never happens.", author: "Fiona K.", role: "Staff Engineer" },
      { text: "The local dev server changed how we work. No more staging environment for testing.", author: "Omar S.", role: "Backend Lead" },
    ],
  },
  video_platform: {
    headline: "Stream. Create. Grow.",
    subheadline: "Host, manage, and share video content with the world. Professional streaming infrastructure made simple.",
    ctaLabel: "Start Streaming",
    secondaryCtaLabel: "Explore Plans",
    ctaHeadline: "Your audience is ready",
    ctaBody: "Launch your video channel today. Unlimited bandwidth, global CDN, no technical setup required.",
    ctaButtonLabel: "Start free trial",
    featureGridTitle: "Streaming infrastructure built to scale",
    cardListTitle: "Everything video creators need",
    footerTagline: "Professional video hosting and streaming for creators and businesses.",
    navLinks: ["Videos", "Live", "Analytics", "Pricing"],
    features: [
      { icon: "play", title: "4K streaming", description: "Broadcast in 4K with adaptive bitrate for every connection speed." },
      { icon: "broadcast", title: "Live & on-demand", description: "Go live to thousands and automatically save every stream as VOD." },
      { icon: "grid", title: "Custom player", description: "Embed your branded player anywhere with full customization." },
      { icon: "settings", title: "DRM protection", description: "Protect premium content with enterprise-grade DRM." },
      { icon: "filter", title: "CDN delivery", description: "Global content delivery network with 200+ edge locations." },
      { icon: "receipt", title: "Viewer analytics", description: "Understand engagement, drop-off, and viewer retention per video." },
    ],
    stats: [
      { icon: "play", value: "4K", label: "Max resolution" },
      { icon: "broadcast", value: "200+", label: "CDN edge points" },
      { icon: "grid", value: "99.99%", label: "Uptime" },
      { icon: "settings", value: "1B+", label: "Videos served monthly" },
    ],
    testimonials: [
      { text: "Our livestream had 50,000 concurrent viewers and not a single buffering complaint.", author: "Rin T.", role: "Live Events Producer" },
      { text: "Migration from our old platform took a weekend. Quality went up, costs went down.", author: "Andre B.", role: "Head of Video" },
      { text: "The custom player let us keep our brand experience completely consistent.", author: "Nadia R.", role: "Creative Director" },
    ],
  },
  fintech: {
    headline: "Your money. Smarter.",
    subheadline: "Manage, grow, and protect your finances with intelligent tools built for the way you live and work today.",
    ctaLabel: "Open Account",
    secondaryCtaLabel: "Learn More",
    ctaHeadline: "Take control of your finances",
    ctaBody: "Open your account in minutes with zero fees and no minimum balance required.",
    ctaButtonLabel: "Get started",
    featureGridTitle: "Smart tools for smarter money",
    cardListTitle: "Everything financial, in one place",
    footerTagline: "Intelligent financial tools for modern individuals and businesses.",
    navLinks: ["Dashboard", "Cards", "Transfers", "Invest"],
    features: [
      { icon: "wallet", title: "Instant transfers", description: "Send money anywhere in the world in seconds, not days." },
      { icon: "receipt", title: "Spending insights", description: "Automatic categorisation and weekly summaries of where your money goes." },
      { icon: "broadcast", title: "Investment tools", description: "Access stocks, ETFs, and crypto from one unified dashboard." },
      { icon: "settings", title: "Bill automation", description: "Schedule and automate recurring payments so nothing ever gets missed." },
      { icon: "filter", title: "Smart budgeting", description: "Set budgets per category and get alerts before you overspend." },
      { icon: "grid", title: "Fraud protection", description: "Real-time transaction monitoring with instant card freeze controls." },
    ],
    stats: [
      { icon: "wallet", value: "$2.5B+", label: "Processed monthly" },
      { icon: "settings", value: "256-bit", label: "Encryption" },
      { icon: "broadcast", value: "2M+", label: "Active users" },
      { icon: "grid", value: "< 5s", label: "Transfer speed" },
    ],
    testimonials: [
      { text: "I finally understand where my money goes each month. The spending insights are genuinely useful.", author: "Chloe W.", role: "Freelancer" },
      { text: "The investment tools are accessible without being dumbed down. I actually feel in control.", author: "Marcus J.", role: "Small Business Owner" },
      { text: "International transfers that actually land in seconds. Game changer for our remote team.", author: "Yuki N.", role: "Finance Manager" },
    ],
  },
  healthcare: {
    headline: "Better care starts here",
    subheadline: "Connect with healthcare providers, manage your records, and take control of your wellbeing — all in one place.",
    ctaLabel: "Book Appointment",
    secondaryCtaLabel: "Find a Doctor",
    ctaHeadline: "Your health, your way",
    ctaBody: "Access care from anywhere. Book appointments, get results, talk to doctors — all from your phone.",
    ctaButtonLabel: "Book your first visit",
    featureGridTitle: "Healthcare that comes to you",
    cardListTitle: "Every step of your care journey",
    footerTagline: "Connecting patients and providers for better care, everywhere.",
    navLinks: ["Providers", "Appointments", "Records", "Prescriptions"],
    features: [
      { icon: "broadcast", title: "Video consultations", description: "See a doctor from home in under 15 minutes, any time of day." },
      { icon: "grid", title: "Health records", description: "All your medical history, results, and documents in one secure place." },
      { icon: "settings", title: "Prescription management", description: "Request repeats and track delivery without calling a pharmacy." },
      { icon: "filter", title: "Lab results", description: "Receive and understand your test results as soon as they're available." },
      { icon: "search", title: "Provider search", description: "Find and book with specialists in your area who accept your insurance." },
      { icon: "receipt", title: "Insurance claims", description: "Submit and track claims automatically without the paperwork." },
    ],
    stats: [
      { icon: "broadcast", value: "< 15 min", label: "Wait time" },
      { icon: "grid", value: "50K+", label: "Providers" },
      { icon: "settings", value: "HIPAA", label: "Compliant" },
      { icon: "filter", value: "4.9 / 5", label: "Patient rating" },
    ],
    testimonials: [
      { text: "I saw a doctor in 8 minutes from my couch. My prescription arrived the next morning.", author: "Helen R.", role: "Patient" },
      { text: "Having all my family's health records in one place has made managing care so much easier.", author: "David L.", role: "Patient" },
      { text: "Lab results straight to my phone with plain English explanations. This is what healthcare should be.", author: "Amara S.", role: "Patient" },
    ],
  },
  education: {
    headline: "Learn anything. Grow everywhere.",
    subheadline: "World-class courses taught by industry experts. Learn at your own pace and earn recognised certifications.",
    ctaLabel: "Explore Courses",
    secondaryCtaLabel: "Try for Free",
    ctaHeadline: "Your next skill is waiting",
    ctaBody: "Access thousands of expert-led courses. Start free, upgrade when you're ready.",
    ctaButtonLabel: "Browse courses",
    featureGridTitle: "Learning designed around you",
    cardListTitle: "Every resource your learning needs",
    footerTagline: "Expert-led education accessible to everyone, everywhere.",
    navLinks: ["Courses", "Instructors", "Certificates", "Pricing"],
    features: [
      { icon: "play", title: "Expert instructors", description: "Learn directly from industry practitioners with real-world experience." },
      { icon: "grid", title: "10,000+ courses", description: "From beginner fundamentals to advanced specialisations in every field." },
      { icon: "settings", title: "Certificates", description: "Earn accredited certificates recognised by leading employers worldwide." },
      { icon: "filter", title: "Progress tracking", description: "See exactly where you are in every course and what to tackle next." },
      { icon: "broadcast", title: "Offline access", description: "Download lessons and learn anywhere, even without an internet connection." },
      { icon: "search", title: "Community forums", description: "Ask questions and discuss ideas with fellow learners and instructors." },
    ],
    stats: [
      { icon: "play", value: "10K+", label: "Courses" },
      { icon: "grid", value: "50M+", label: "Learners" },
      { icon: "settings", value: "95%", label: "Completion rate" },
      { icon: "broadcast", value: "180+", label: "Countries" },
    ],
    testimonials: [
      { text: "I landed a new job three months after completing the data science course. Worth every minute.", author: "Jay T.", role: "Data Analyst" },
      { text: "The course quality is genuinely better than what I paid for at university.", author: "Fatima A.", role: "Software Engineer" },
      { text: "My whole team upskilled on cloud architecture over one quarter. The group licences are great.", author: "Paulo G.", role: "Engineering Manager" },
    ],
  },
  calendar_scheduling: {
    headline: "Time management, finally solved",
    subheadline: "Smart scheduling that works around you. Book meetings, manage availability, and eliminate the back-and-forth forever.",
    ctaLabel: "Get Your Booking Link",
    secondaryCtaLabel: "See Integrations",
    ctaHeadline: "Stop losing time to scheduling",
    ctaBody: "Share your link. Let people book. Focus on the meetings, not the logistics.",
    ctaButtonLabel: "Create free account",
    featureGridTitle: "Scheduling that just works",
    cardListTitle: "All the tools modern scheduling needs",
    footerTagline: "Smart scheduling tools for individuals, teams, and enterprises.",
    navLinks: ["Schedule", "Meetings", "Team", "Integrations"],
    features: [
      { icon: "broadcast", title: "One-click booking", description: "Share your personal booking link and let others pick a time that works." },
      { icon: "settings", title: "Calendar sync", description: "Connect Google, Outlook, and iCal to avoid double bookings automatically." },
      { icon: "grid", title: "Team scheduling", description: "Coordinate across entire teams with round-robin and collective availability." },
      { icon: "filter", title: "Buffer times", description: "Automatically add breathing room before and after every meeting." },
      { icon: "play", title: "Video conferencing", description: "Auto-generate Zoom, Meet, or Teams links for every booking." },
      { icon: "mail", title: "Smart reminders", description: "Automated email and SMS reminders to reduce no-shows by up to 80%." },
    ],
    stats: [
      { icon: "broadcast", value: "80%", label: "Fewer no-shows" },
      { icon: "settings", value: "5M+", label: "Meetings booked" },
      { icon: "grid", value: "70+", label: "Integrations" },
      { icon: "filter", value: "< 2 min", label: "Setup time" },
    ],
    testimonials: [
      { text: "I reclaim 3 hours a week that used to go on scheduling emails back and forth.", author: "Lucy B.", role: "Consultant" },
      { text: "Our sales team books 40% more demos since we started using this. No-shows dropped to almost zero.", author: "Ray K.", role: "VP Sales" },
      { text: "The team scheduling feature is exactly what we needed for client calls across 12 time zones.", author: "Sanna L.", role: "Customer Success Lead" },
    ],
  },
};

const DEFAULT_CONTENT: ProductContent = {
  headline: "Built for scale. Designed for teams.",
  subheadline: "The modern platform for every workflow. Fast, reliable, and beautifully designed for the teams that build great things.",
  ctaLabel: "Get Started",
  secondaryCtaLabel: "Learn More",
  ctaHeadline: "Start building today",
  ctaBody: "Free to start. No credit card required. Set up in minutes and invite your team.",
  ctaButtonLabel: "Get started free",
  featureGridTitle: "Everything your team needs",
  cardListTitle: "Built for how modern teams work",
  footerTagline: "The platform built for modern teams who want to move faster and build better.",
  navLinks: ["Features", "Pricing", "Docs", "About"],
  features: [
    { icon: "settings", title: "Quick setup", description: "Get your team up and running in under 10 minutes with guided onboarding." },
    { icon: "grid", title: "Team collaboration", description: "Work together in real time with shared workspaces and live updates." },
    { icon: "broadcast", title: "Powerful integrations", description: "Connect to the tools your team already uses with one-click integrations." },
    { icon: "filter", title: "Access controls", description: "Granular permissions keep the right people in the right places." },
    { icon: "search", title: "Search everything", description: "Find any file, message, or record instantly with full-text search." },
    { icon: "play", title: "Analytics", description: "Track team performance and usage trends with built-in dashboards." },
  ],
  stats: [
    { icon: "broadcast", value: "99.9%", label: "Uptime" },
    { icon: "grid", value: "50K+", label: "Teams" },
    { icon: "settings", value: "10 min", label: "Setup time" },
    { icon: "play", value: "24/7", label: "Support" },
  ],
  testimonials: [
    { text: "The fastest setup we've experienced. Our team was productive from day one.", author: "Chris P.", role: "CTO" },
    { text: "It replaced three tools we were paying for and works better than all of them combined.", author: "Ana M.", role: "Product Lead" },
    { text: "Support is incredible. Every question answered within the hour. Genuinely impressed.", author: "Jake R.", role: "Operations Manager" },
  ],
};

export function getProductContent(productType: string | null | undefined): ProductContent {
  if (!productType) return DEFAULT_CONTENT;
  return CONTENT_MAP[productType] ?? DEFAULT_CONTENT;
}

export function getNavLinks(productType: string | null | undefined): string[] {
  return getProductContent(productType).navLinks;
}
