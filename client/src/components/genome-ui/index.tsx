import { useEffect } from "react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph, LayoutSection, SectionType } from "@shared/layoutEngine";
import {
  renderIconSvgContent,
  GROUP_ICONS,
  type GenomeIconStyle,
  type IconName,
} from "@shared/iconGenerator";

export interface GenomeTokens {
  genome: DesignGenome;
  projectName: string;
  projectPrompt: string;
}

function toIconStyle(genome: DesignGenome): GenomeIconStyle {
  return {
    strokeWidth: genome.iconStyle.strokeWidth,
    cornerRoundness: genome.iconStyle.cornerRoundness,
    geometryBias: genome.iconStyle.geometryBias,
    variant: genome.iconStyle.variant,
  };
}

function GIcon({
  name,
  genome,
  size = 20,
  color,
}: {
  name: IconName;
  genome: DesignGenome;
  size?: number;
  color?: string;
}) {
  const s = toIconStyle(genome);
  const fill = s.variant === "filled" ? "currentColor" : "none";
  const lc = s.geometryBias === "organic" ? "round" : "square";
  const lj = s.geometryBias === "organic" ? "round" : "miter";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth={s.strokeWidth}
      strokeLinecap={lc as "round" | "square"}
      strokeLinejoin={lj as "round" | "miter"}
      style={{ color: color ?? "currentColor", display: "inline-block", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: renderIconSvgContent(name, s) }}
    />
  );
}

function GenomeButton({
  genome,
  children,
  variant = "primary",
}: {
  genome: DesignGenome;
  children: string;
  variant?: "primary" | "outline";
}) {
  const bg = variant === "primary" ? genome.colors.primary : "transparent";
  const border = `1.5px solid ${genome.colors.primary}`;
  const color = variant === "primary" ? "#fff" : genome.colors.primary;
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: bg,
        border,
        color,
        borderRadius: genome.radius.md,
        padding: `${genome.spacing.xs} ${genome.spacing.md}`,
        fontFamily: `'${genome.typography.heading}', sans-serif`,
        fontSize: genome.typography.sizes.sm,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}

export function GenomeNavbar({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName } = tokens;
  const navLinks = ["Work", "Features", "Pricing", "About"];
  return (
    <nav
      data-testid="genome-navbar"
      style={{
        backgroundColor: genome.colors.surface,
        borderBottom: `1px solid ${genome.colors.primary}22`,
        padding: `${genome.spacing.sm} ${genome.spacing.xl}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: genome.spacing.lg,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.sm }}>
        <GIcon name="compass" genome={genome} size={22} color={genome.colors.primary} />
        <span
          style={{
            fontFamily: `'${genome.typography.heading}', sans-serif`,
            fontSize: genome.typography.sizes.lg,
            fontWeight: 700,
            color: genome.colors.primary,
            letterSpacing: "-0.02em",
          }}
        >
          {projectName}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.lg }}>
        {navLinks.map((link) => (
          <span
            key={link}
            style={{
              fontFamily: `'${genome.typography.body}', sans-serif`,
              fontSize: genome.typography.sizes.sm,
              color: genome.colors.secondary,
              cursor: "pointer",
              opacity: 0.85,
            }}
          >
            {link}
          </span>
        ))}
        <GenomeButton genome={genome} variant="primary">Get Started</GenomeButton>
      </div>
    </nav>
  );
}

export function GenomeHero({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome, projectName, projectPrompt } = tokens;
  const align = section.alignment;
  const hasImage = section.imagePlacement !== "none";
  const imgRight = section.imagePlacement === "right" || section.imagePlacement === "bottom";

  const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const flexDir: "row" | "row-reverse" | "column" =
    hasImage && section.imagePlacement === "left" ? "row" :
    hasImage && section.imagePlacement === "right" ? "row-reverse" :
    "column";

  const headlineWords = projectName.split(" ");
  const subtext = projectPrompt.length > 140 ? projectPrompt.slice(0, 140) + "…" : projectPrompt;

  return (
    <section
      data-testid="genome-hero"
      style={{
        backgroundColor: genome.colors.background,
        backgroundImage: `radial-gradient(ellipse at ${align === "right" ? "80%" : align === "center" ? "50%" : "20%"} 40%, ${genome.colors.primary}18 0%, transparent 65%)`,
        padding: `${genome.spacing["2xl"]} ${genome.spacing.xl}`,
        display: "flex",
        flexDirection: flexDir,
        alignItems: "center",
        gap: genome.spacing.xl,
        textAlign,
        minHeight: "220px",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: genome.spacing.md, alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: genome.spacing.xs,
            backgroundColor: `${genome.colors.accent}22`,
            border: `1px solid ${genome.colors.accent}44`,
            borderRadius: genome.radius.full,
            padding: `${genome.spacing.xs} ${genome.spacing.sm}`,
          }}
        >
          <GIcon name="broadcast" genome={genome} size={13} color={genome.colors.accent} />
          <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.xs, color: genome.colors.accent, fontWeight: 600 }}>
            AI-Generated Design
          </span>
        </div>
        <h1
          style={{
            fontFamily: `'${genome.typography.heading}', sans-serif`,
            fontSize: genome.typography.sizes["3xl"],
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          {headlineWords.slice(0, Math.ceil(headlineWords.length / 2)).join(" ")}{" "}
          <span style={{ color: genome.colors.primary }}>
            {headlineWords.slice(Math.ceil(headlineWords.length / 2)).join(" ")}
          </span>
        </h1>
        <p
          style={{
            fontFamily: `'${genome.typography.body}', sans-serif`,
            fontSize: genome.typography.sizes.base,
            color: genome.colors.secondary,
            lineHeight: 1.6,
            maxWidth: "480px",
            margin: 0,
          }}
        >
          {subtext}
        </p>
        <div style={{ display: "flex", gap: genome.spacing.sm, flexWrap: "wrap", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
          <GenomeButton genome={genome} variant="primary">Start Building</GenomeButton>
          <GenomeButton genome={genome} variant="outline">View Demo</GenomeButton>
        </div>
      </div>
      {hasImage && (
        <div
          style={{
            flex: "0 0 auto",
            width: "180px",
            height: "130px",
            borderRadius: genome.radius.lg,
            backgroundColor: `${genome.colors.primary}20`,
            border: `1px solid ${genome.colors.primary}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GIcon name="image" genome={genome} size={40} color={`${genome.colors.primary}60`} />
        </div>
      )}
    </section>
  );
}

const FEATURE_DATA = [
  { icon: "settings" as IconName, title: "Deterministic Seeds", text: "Every project gets a unique SHA-256 seed that drives all design decisions." },
  { icon: "grid" as IconName, title: "Design Genome", text: "Colors, typography, spacing, and motion generated in harmony." },
  { icon: "play" as IconName, title: "Instant Preview", text: "See your brand system come to life the moment a project is created." },
  { icon: "broadcast" as IconName, title: "AI-Powered", text: "Genome synthesis uses your project context to produce relevant aesthetics." },
];

export function GenomeFeatureGrid({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome } = tokens;
  const cols = section.columns ?? 3;
  const features = FEATURE_DATA.slice(0, Math.max(cols, 3));

  return (
    <section
      data-testid="genome-feature-grid"
      style={{
        backgroundColor: genome.colors.background,
        padding: `${genome.spacing["2xl"]} ${genome.spacing.xl}`,
      }}
    >
      <h2
        style={{
          fontFamily: `'${genome.typography.heading}', sans-serif`,
          fontSize: genome.typography.sizes["2xl"],
          fontWeight: 700,
          color: "#fff",
          textAlign: section.alignment === "center" ? "center" : section.alignment === "right" ? "right" : "left",
          marginBottom: genome.spacing.xl,
          letterSpacing: "-0.02em",
        }}
      >
        Built different
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(cols, features.length)}, 1fr)`,
          gap: genome.spacing.lg,
        }}
      >
        {features.map((f) => (
          <div
            key={f.title}
            style={{
              backgroundColor: genome.colors.surface,
              borderRadius: genome.radius.lg,
              border: `1px solid ${genome.colors.primary}20`,
              padding: genome.spacing.lg,
              display: "flex",
              flexDirection: section.orientation === "horizontal" ? "row" : "column",
              gap: genome.spacing.md,
              alignItems: section.orientation === "horizontal" ? "flex-start" : "flex-start",
            }}
          >
            <div
              style={{
                backgroundColor: `${genome.colors.primary}20`,
                borderRadius: genome.radius.md,
                padding: genome.spacing.sm,
                flexShrink: 0,
              }}
            >
              <GIcon name={f.icon} genome={genome} size={18} color={genome.colors.primary} />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: `'${genome.typography.heading}', sans-serif`,
                  fontSize: genome.typography.sizes.base,
                  fontWeight: 600,
                  color: "#fff",
                  marginBottom: genome.spacing.xs,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontFamily: `'${genome.typography.body}', sans-serif`,
                  fontSize: genome.typography.sizes.sm,
                  color: genome.colors.secondary,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {f.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const CARD_ICONS: IconName[] = ["chat", "mail", "search", "filter", "tag", "play"];
const CARD_TITLES = ["Design Tokens", "Genome Export", "Smart Search", "Advanced Filters", "Custom Tags", "Live Preview"];
const CARD_TEXTS = [
  "All colors, spacing, and radius values available as exportable tokens.",
  "Export your full design genome as JSON, CSS variables, or Figma tokens.",
  "Full-text search across all your projects and design systems.",
  "Filter by font family, color hue, spacing scale, and more.",
  "Tag projects with custom labels for better organization.",
  "See a live rendered preview of your genome before committing.",
];

export function GenomeCardList({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome } = tokens;
  const count = Math.min(section.cardCount ?? 3, 6);
  const cols = section.columns ?? Math.min(count, 3);

  return (
    <section
      data-testid="genome-card-list"
      style={{
        backgroundColor: genome.colors.surface,
        padding: `${genome.spacing["2xl"]} ${genome.spacing.xl}`,
      }}
    >
      <h2
        style={{
          fontFamily: `'${genome.typography.heading}', sans-serif`,
          fontSize: genome.typography.sizes["2xl"],
          fontWeight: 700,
          color: "#fff",
          textAlign: section.alignment === "center" ? "center" : section.alignment === "right" ? "right" : "left",
          marginBottom: genome.spacing.xl,
          letterSpacing: "-0.02em",
        }}
      >
        Everything you need
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: genome.spacing.md,
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            data-testid={`genome-card-${i}`}
            style={{
              backgroundColor: genome.colors.background,
              borderRadius: genome.radius.lg,
              border: `1px solid ${genome.colors.primary}18`,
              padding: genome.spacing.lg,
              display: "flex",
              flexDirection: "column",
              gap: genome.spacing.sm,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.sm }}>
              <GIcon name={CARD_ICONS[i % CARD_ICONS.length]} genome={genome} size={16} color={genome.colors.accent} />
              <span
                style={{
                  fontFamily: `'${genome.typography.heading}', sans-serif`,
                  fontSize: genome.typography.sizes.sm,
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {CARD_TITLES[i % CARD_TITLES.length]}
              </span>
            </div>
            <p
              style={{
                fontFamily: `'${genome.typography.body}', sans-serif`,
                fontSize: genome.typography.sizes.xs,
                color: genome.colors.secondary,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {CARD_TEXTS[i % CARD_TEXTS.length]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STAT_DATA = [
  { icon: "grid" as IconName, value: "25+", label: "Icon families" },
  { icon: "settings" as IconName, value: "∞", label: "Unique genomes" },
  { icon: "broadcast" as IconName, value: "6", label: "Genome tokens" },
  { icon: "play" as IconName, value: "100%", label: "Deterministic" },
];

export function GenomeStats({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome } = tokens;
  const cols = section.columns ?? 4;

  return (
    <section
      data-testid="genome-stats"
      style={{
        backgroundColor: genome.colors.background,
        borderTop: `1px solid ${genome.colors.primary}20`,
        borderBottom: `1px solid ${genome.colors.primary}20`,
        padding: `${genome.spacing["2xl"]} ${genome.spacing.xl}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(cols, STAT_DATA.length)}, 1fr)`,
          gap: genome.spacing.lg,
          textAlign: "center",
        }}
      >
        {STAT_DATA.slice(0, cols).map((stat) => (
          <div
            key={stat.label}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: genome.spacing.xs }}
          >
            <GIcon name={stat.icon} genome={genome} size={20} color={genome.colors.primary} />
            <span
              style={{
                fontFamily: `'${genome.typography.heading}', sans-serif`,
                fontSize: genome.typography.sizes["2xl"],
                fontWeight: 800,
                color: genome.colors.primary,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontFamily: `'${genome.typography.body}', sans-serif`,
                fontSize: genome.typography.sizes.xs,
                color: genome.colors.secondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GenomeTestimonial({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome } = tokens;
  const count = Math.min(section.cardCount ?? 2, 3);
  const quotes = [
    { text: "The genome system generated a color palette that perfectly matched our brand intuition.", author: "Alex R.", role: "Design Lead" },
    { text: "I've never seen typography pairing done this intelligently from a single seed value.", author: "Sam K.", role: "Frontend Dev" },
    { text: "Every project feels distinct yet consistent. The spacing tokens alone saved us hours.", author: "Jordan M.", role: "Product Designer" },
  ];

  return (
    <section
      data-testid="genome-testimonial"
      style={{
        backgroundColor: genome.colors.surface,
        padding: `${genome.spacing["2xl"]} ${genome.spacing.xl}`,
      }}
    >
      <h2
        style={{
          fontFamily: `'${genome.typography.heading}', sans-serif`,
          fontSize: genome.typography.sizes["2xl"],
          fontWeight: 700,
          color: "#fff",
          textAlign: "center",
          marginBottom: genome.spacing.xl,
          letterSpacing: "-0.02em",
        }}
      >
        What teams say
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${count}, 1fr)`,
          gap: genome.spacing.lg,
        }}
      >
        {quotes.slice(0, count).map((q, i) => (
          <div
            key={i}
            style={{
              backgroundColor: genome.colors.background,
              borderRadius: genome.radius.lg,
              border: `1px solid ${genome.colors.primary}20`,
              padding: genome.spacing.lg,
            }}
          >
            <GIcon name="chat" genome={genome} size={18} color={genome.colors.accent} />
            <p
              style={{
                fontFamily: `'${genome.typography.body}', sans-serif`,
                fontSize: genome.typography.sizes.sm,
                color: genome.colors.secondary,
                lineHeight: 1.6,
                margin: `${genome.spacing.sm} 0`,
                fontStyle: "italic",
              }}
            >
              &ldquo;{q.text}&rdquo;
            </p>
            <div>
              <span style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.sm, fontWeight: 600, color: "#fff" }}>
                {q.author}
              </span>
              <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.xs, color: genome.colors.primary, marginLeft: "8px" }}>
                {q.role}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GenomeCTA({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome, projectName } = tokens;
  const align = section.alignment;
  const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";

  return (
    <section
      data-testid="genome-cta"
      style={{
        background: `linear-gradient(135deg, ${genome.colors.primary} 0%, ${genome.colors.accent} 100%)`,
        padding: `${genome.spacing["2xl"]} ${genome.spacing.xl}`,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        textAlign,
        gap: genome.spacing.md,
      }}
    >
      <h2
        style={{
          fontFamily: `'${genome.typography.heading}', sans-serif`,
          fontSize: genome.typography.sizes["2xl"],
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        Ready to build {projectName}?
      </h2>
      <p
        style={{
          fontFamily: `'${genome.typography.body}', sans-serif`,
          fontSize: genome.typography.sizes.base,
          color: "rgba(255,255,255,0.8)",
          margin: 0,
          maxWidth: "440px",
        }}
      >
        Your unique design genome is waiting. Start a new project and get a complete design system in seconds.
      </p>
      <span
        style={{
          display: "inline-block",
          backgroundColor: "#fff",
          color: genome.colors.primary,
          borderRadius: genome.radius.md,
          padding: `${genome.spacing.sm} ${genome.spacing.lg}`,
          fontFamily: `'${genome.typography.heading}', sans-serif`,
          fontSize: genome.typography.sizes.base,
          fontWeight: 700,
          cursor: "pointer",
          marginTop: genome.spacing.xs,
        }}
      >
        Create your genome →
      </span>
    </section>
  );
}

export function GenomeFooter({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName } = tokens;
  const footerLinks = [
    { group: "Product", links: ["Features", "Pricing", "Changelog"] },
    { group: "Docs", links: ["API", "Tokens", "Guides"] },
    { group: "Company", links: ["About", "Blog", "Contact"] },
  ];

  return (
    <footer
      data-testid="genome-footer"
      style={{
        backgroundColor: genome.colors.surface,
        borderTop: `1px solid ${genome.colors.primary}20`,
        padding: `${genome.spacing.xl} ${genome.spacing.xl} ${genome.spacing.lg}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: genome.spacing.xl,
          marginBottom: genome.spacing.xl,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.sm, marginBottom: genome.spacing.sm }}>
            <GIcon name="compass" genome={genome} size={18} color={genome.colors.primary} />
            <span
              style={{
                fontFamily: `'${genome.typography.heading}', sans-serif`,
                fontSize: genome.typography.sizes.base,
                fontWeight: 700,
                color: genome.colors.primary,
              }}
            >
              {projectName}
            </span>
          </div>
          <p
            style={{
              fontFamily: `'${genome.typography.body}', sans-serif`,
              fontSize: genome.typography.sizes.xs,
              color: genome.colors.secondary,
              lineHeight: 1.6,
              maxWidth: "220px",
              margin: 0,
            }}
          >
            Deterministic design genome synthesis for generative AI projects.
          </p>
        </div>
        {footerLinks.map((col) => (
          <div key={col.group}>
            <p
              style={{
                fontFamily: `'${genome.typography.heading}', sans-serif`,
                fontSize: genome.typography.sizes.xs,
                fontWeight: 700,
                color: "#fff",
                marginBottom: genome.spacing.sm,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {col.group}
            </p>
            {col.links.map((link) => (
              <p
                key={link}
                style={{
                  fontFamily: `'${genome.typography.body}', sans-serif`,
                  fontSize: genome.typography.sizes.sm,
                  color: genome.colors.secondary,
                  marginBottom: genome.spacing.xs,
                  cursor: "pointer",
                  opacity: 0.8,
                }}
              >
                {link}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          borderTop: `1px solid ${genome.colors.primary}15`,
          paddingTop: genome.spacing.md,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: `'${genome.typography.body}', sans-serif`,
            fontSize: genome.typography.sizes.xs,
            color: genome.colors.secondary,
            opacity: 0.6,
          }}
        >
          © {new Date().getFullYear()} {projectName}. All rights reserved.
        </span>
        <div style={{ display: "flex", gap: genome.spacing.md }}>
          {(["chat", "broadcast", "mail"] as IconName[]).map((icon) => (
            <GIcon key={icon} name={icon} genome={genome} size={15} color={genome.colors.secondary} />
          ))}
        </div>
      </div>
    </footer>
  );
}

const SECTION_RENDERERS: Partial<Record<SectionType, (tokens: GenomeTokens, section: LayoutSection) => JSX.Element>> = {
  hero: (t, s) => <GenomeHero tokens={t} section={s} />,
  featureGrid: (t, s) => <GenomeFeatureGrid tokens={t} section={s} />,
  cardList: (t, s) => <GenomeCardList tokens={t} section={s} />,
  stats: (t, s) => <GenomeStats tokens={t} section={s} />,
  testimonial: (t, s) => <GenomeTestimonial tokens={t} section={s} />,
  cta: (t, s) => <GenomeCTA tokens={t} section={s} />,
  footer: (t) => <GenomeFooter tokens={t} />,
};

export function renderSection(
  type: SectionType,
  tokens: GenomeTokens,
  section: LayoutSection
): JSX.Element | null {
  const renderer = SECTION_RENDERERS[type];
  if (!renderer) return null;
  return renderer(tokens, section);
}

function useGenomeFonts(genome: DesignGenome) {
  useEffect(() => {
    const fonts = [genome.typography.heading, genome.typography.body].filter(Boolean);
    const id = "genome-font-import";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const style = document.createElement("style");
    style.id = id;
    style.textContent = fonts
      .map((f) => `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;500;600;700;800&display=swap');`)
      .join("\n");
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [genome.typography.heading, genome.typography.body]);
}

export function GenomePreview({
  genome,
  layout,
  projectName,
  projectPrompt,
}: {
  genome: DesignGenome;
  layout: LayoutGraph;
  projectName: string;
  projectPrompt: string;
}) {
  const tokens: GenomeTokens = { genome, projectName, projectPrompt };
  useGenomeFonts(genome);

  return (
    <div
      data-testid="genome-preview"
      style={{
        backgroundColor: genome.colors.background,
        overflow: "hidden",
        minHeight: "100%",
      }}
    >
      <GenomeNavbar tokens={tokens} />
      {layout.sections.map((section, i) => (
        <div key={`${section.type}-${i}`}>
          {renderSection(section.type, tokens, section)}
        </div>
      ))}
    </div>
  );
}
