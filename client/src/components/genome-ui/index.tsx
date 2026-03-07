import { useEffect } from "react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph, LayoutSection, SectionType } from "@shared/layoutEngine";
import { renderProductSection } from "./ProductComponents";
import { getProductContent, getNavLinks } from "@shared/contentGenerator";
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
  projectLogoUrl?: string | null;
  productType?: string | null;
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
  const { genome, projectName, projectLogoUrl, productType } = tokens;
  const navLinks = getNavLinks(productType);
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
        {projectLogoUrl ? (
          <img
            src={projectLogoUrl}
            alt={projectName}
            style={{ width: 28, height: 28, objectFit: "contain", borderRadius: genome.radius.sm }}
          />
        ) : (
          <GIcon name="compass" genome={genome} size={22} color={genome.colors.primary} />
        )}
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
  const { genome, projectName, productType } = tokens;
  const content = getProductContent(productType);
  const align = section.alignment;
  const hasImage = section.imagePlacement !== "none";

  const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const flexDir: "row" | "row-reverse" | "column" =
    hasImage && section.imagePlacement === "left" ? "row" :
    hasImage && section.imagePlacement === "right" ? "row-reverse" :
    "column";

  const headlineWords = content.headline.split(" ");
  const midpoint = Math.ceil(headlineWords.length / 2);

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
            {projectName}
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
          {headlineWords.slice(0, midpoint).join(" ")}{" "}
          <span style={{ color: genome.colors.primary }}>
            {headlineWords.slice(midpoint).join(" ")}
          </span>
        </h1>
        <p
          style={{
            fontFamily: `'${genome.typography.body}', sans-serif`,
            fontSize: genome.typography.sizes.base,
            color: genome.colors.secondary,
            lineHeight: 1.6,
            maxWidth: "520px",
            margin: 0,
          }}
        >
          {content.subheadline}
        </p>
        <div style={{ display: "flex", gap: genome.spacing.sm, flexWrap: "wrap", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
          <GenomeButton genome={genome} variant="primary">{content.ctaLabel}</GenomeButton>
          <GenomeButton genome={genome} variant="outline">{content.secondaryCtaLabel}</GenomeButton>
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

export function GenomeFeatureGrid({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome, productType } = tokens;
  const content = getProductContent(productType);
  const cols = Math.min(section.columns ?? 3, content.features.length);
  const features = content.features.slice(0, Math.max(cols, 3));
  const textAlign = section.alignment === "center" ? "center" : section.alignment === "right" ? "right" : "left";

  return (
    <section
      data-testid="genome-feature-grid"
      style={{
        backgroundColor: genome.colors.background,
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: `'${genome.typography.heading}', sans-serif`,
            fontSize: genome.typography.sizes["2xl"],
            fontWeight: 700,
            color: "#fff",
            textAlign,
            marginBottom: "48px",
            letterSpacing: "-0.02em",
          }}
        >
          {content.featureGridTitle}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`,
            gap: "24px",
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                backgroundColor: genome.colors.surface,
                borderRadius: genome.radius.lg,
                border: `1px solid ${genome.colors.primary}20`,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  backgroundColor: `${genome.colors.primary}20`,
                  borderRadius: genome.radius.md,
                  padding: "10px",
                  width: "fit-content",
                }}
              >
                <GIcon name={f.icon as IconName} genome={genome} size={18} color={genome.colors.primary} />
              </div>
              <h3
                style={{
                  fontFamily: `'${genome.typography.heading}', sans-serif`,
                  fontSize: genome.typography.sizes.base,
                  fontWeight: 600,
                  color: "#fff",
                  margin: 0,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontFamily: `'${genome.typography.body}', sans-serif`,
                  fontSize: genome.typography.sizes.sm,
                  color: genome.colors.secondary,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GenomeCardList({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome, productType } = tokens;
  const content = getProductContent(productType);
  const count = Math.min(section.cardCount ?? 3, content.features.length);
  const textAlign = section.alignment === "center" ? "center" : section.alignment === "right" ? "right" : "left";

  return (
    <section
      data-testid="genome-card-list"
      style={{
        backgroundColor: genome.colors.surface,
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: `'${genome.typography.heading}', sans-serif`,
            fontSize: genome.typography.sizes["2xl"],
            fontWeight: 700,
            color: "#fff",
            textAlign,
            marginBottom: "48px",
            letterSpacing: "-0.02em",
          }}
        >
          {content.cardListTitle}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
            gap: "16px",
          }}
        >
          {content.features.slice(0, count).map((f, i) => (
            <div
              key={i}
              data-testid={`genome-card-${i}`}
              style={{
                backgroundColor: genome.colors.background,
                borderRadius: genome.radius.lg,
                border: `1px solid ${genome.colors.primary}18`,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <GIcon name={f.icon as IconName} genome={genome} size={16} color={genome.colors.accent} />
                <span
                  style={{
                    fontFamily: `'${genome.typography.heading}', sans-serif`,
                    fontSize: genome.typography.sizes.sm,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {f.title}
                </span>
              </div>
              <p
                style={{
                  fontFamily: `'${genome.typography.body}', sans-serif`,
                  fontSize: genome.typography.sizes.xs,
                  color: genome.colors.secondary,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GenomeStats({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome, productType } = tokens;
  const content = getProductContent(productType);
  const cols = Math.min(section.columns ?? 4, content.stats.length);

  return (
    <section
      data-testid="genome-stats"
      style={{
        backgroundColor: genome.colors.background,
        borderTop: `1px solid ${genome.colors.primary}20`,
        borderBottom: `1px solid ${genome.colors.primary}20`,
        padding: "64px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
          gap: "32px",
          textAlign: "center",
        }}
      >
        {content.stats.slice(0, cols).map((stat) => (
          <div
            key={stat.label}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
          >
            <GIcon name={stat.icon as IconName} genome={genome} size={20} color={genome.colors.primary} />
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
  const { genome, productType } = tokens;
  const content = getProductContent(productType);
  const count = Math.min(section.cardCount ?? 2, content.testimonials.length);

  return (
    <section
      data-testid="genome-testimonial"
      style={{
        backgroundColor: genome.colors.surface,
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: `'${genome.typography.heading}', sans-serif`,
            fontSize: genome.typography.sizes["2xl"],
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            marginBottom: "48px",
            letterSpacing: "-0.02em",
          }}
        >
          What our customers say
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
            gap: "24px",
          }}
        >
          {content.testimonials.slice(0, count).map((q, i) => (
            <div
              key={i}
              style={{
                backgroundColor: genome.colors.background,
                borderRadius: genome.radius.lg,
                border: `1px solid ${genome.colors.primary}20`,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <GIcon name="chat" genome={genome} size={18} color={genome.colors.accent} />
              <p
                style={{
                  fontFamily: `'${genome.typography.body}', sans-serif`,
                  fontSize: genome.typography.sizes.sm,
                  color: genome.colors.secondary,
                  lineHeight: 1.65,
                  margin: 0,
                  fontStyle: "italic",
                  flex: 1,
                }}
              >
                &ldquo;{q.text}&rdquo;
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: `${genome.colors.primary}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: "12px", fontWeight: 700, color: genome.colors.primary }}>
                    {q.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <span style={{ display: "block", fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.sm, fontWeight: 600, color: "#fff" }}>
                    {q.author}
                  </span>
                  <span style={{ display: "block", fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.xs, color: genome.colors.primary }}>
                    {q.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GenomeCTA({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome, productType } = tokens;
  const content = getProductContent(productType);
  const align = section.alignment;
  const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const alignItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <section
      data-testid="genome-cta"
      style={{
        background: `linear-gradient(135deg, ${genome.colors.primary} 0%, ${genome.colors.accent} 100%)`,
        padding: "80px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems,
          textAlign,
          gap: "20px",
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
          {content.ctaHeadline}
        </h2>
        <p
          style={{
            fontFamily: `'${genome.typography.body}', sans-serif`,
            fontSize: genome.typography.sizes.base,
            color: "rgba(255,255,255,0.85)",
            margin: 0,
            maxWidth: "480px",
            lineHeight: 1.6,
          }}
        >
          {content.ctaBody}
        </p>
        <span
          style={{
            display: "inline-block",
            backgroundColor: "#fff",
            color: genome.colors.primary,
            borderRadius: genome.radius.md,
            padding: "12px 28px",
            fontFamily: `'${genome.typography.heading}', sans-serif`,
            fontSize: genome.typography.sizes.base,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {content.ctaButtonLabel} →
        </span>
      </div>
    </section>
  );
}

export function GenomeFooter({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, productType } = tokens;
  const content = getProductContent(productType);
  const footerLinks = [
    { group: "Product", links: ["Features", "Pricing", "Changelog"] },
    { group: "Resources", links: ["Docs", "API", "Guides"] },
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
            {content.footerTagline}
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
  if (section.componentType) {
    const productResult = renderProductSection(section.componentType, tokens, section);
    if (productResult) return productResult as JSX.Element;
  }
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
  projectLogoUrl,
  productType,
}: {
  genome: DesignGenome;
  layout: LayoutGraph;
  projectName: string;
  projectPrompt: string;
  projectLogoUrl?: string | null;
  productType?: string | null;
}) {
  const tokens: GenomeTokens = { genome, projectName, projectPrompt, projectLogoUrl, productType };
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
