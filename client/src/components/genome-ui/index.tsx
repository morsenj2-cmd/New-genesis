import { useEffect, useState } from "react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph, LayoutSection, SectionType } from "@shared/layoutEngine";
import { renderProductSection } from "./ProductComponents";
import { getProductContent } from "@shared/contentGenerator";
import type { FeatureItem, StatItem, TestimonialItem } from "@shared/contentGenerator";
import {
  renderIconSvgContent,
  GROUP_ICONS,
  type GenomeIconStyle,
  type IconName,
} from "@shared/iconGenerator";

export interface ContentOverrides {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  secondaryCtaLabel?: string;
  ctaHeadline?: string;
  ctaBody?: string;
  ctaButtonLabel?: string;
  brandName?: string;
  featureGridTitle?: string;
  cardListTitle?: string;
  footerTagline?: string;
  features?: FeatureItem[];
  stats?: StatItem[];
  testimonials?: TestimonialItem[];
  navLinks?: string[];
  aboutMission?: string;
}

export type PreviewPage = "home" | "features" | "pricing" | "about" | "blog" | "contact";

export interface GenomeTokens {
  genome: DesignGenome;
  projectName: string;
  projectPrompt: string;
  projectLogoUrl?: string | null;
  productType?: string | null;
  contentOverrides?: ContentOverrides;
  activePage?: PreviewPage;
  onNavigate?: (page: PreviewPage) => void;
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

const PAGE_NAV_LINKS: { label: string; page: PreviewPage }[] = [
  { label: "Features", page: "features" },
  { label: "Pricing", page: "pricing" },
  { label: "Blog", page: "blog" },
  { label: "About", page: "about" },
];

export function GenomeNavbar({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, projectLogoUrl, productType, contentOverrides, activePage, onNavigate } = tokens;
  const content = getProductContent(productType);
  const logoColor = (genome as any).branding?.logoColor ?? genome.colors.primary;
  const logoFont = (genome as any).branding?.logoFont ?? genome.typography.heading;
  const logoWeight = (genome as any).branding?.logoWeight ?? 700;
  const displayBrandName = contentOverrides?.brandName || projectName || content.brandName;
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
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: genome.spacing.sm, cursor: "pointer" }}
        onClick={() => onNavigate?.("home")}
      >
        {projectLogoUrl ? (
          <img
            src={projectLogoUrl}
            alt={displayBrandName}
            style={{ width: 28, height: 28, objectFit: "contain", borderRadius: genome.radius.sm }}
          />
        ) : (
          <GIcon name="compass" genome={genome} size={22} color={logoColor} />
        )}
        <span
          style={{
            fontFamily: `'${logoFont}', sans-serif`,
            fontSize: genome.typography.sizes.lg,
            fontWeight: logoWeight,
            color: logoColor,
            letterSpacing: "-0.02em",
          }}
        >
          {displayBrandName}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.lg }}>
        {PAGE_NAV_LINKS.map(({ label, page }, i) => (
          <span
            key={page}
            onClick={() => onNavigate?.(page)}
            style={{
              fontFamily: `'${genome.typography.body}', sans-serif`,
              fontSize: genome.typography.sizes.sm,
              color: activePage === page ? genome.colors.primary : genome.colors.secondary,
              cursor: "pointer",
              opacity: 0.9,
              fontWeight: activePage === page ? 600 : 400,
              borderBottom: activePage === page ? `2px solid ${genome.colors.primary}` : "2px solid transparent",
              paddingBottom: "2px",
              transition: "color 0.15s",
            }}
          >
            {contentOverrides?.navLinks?.[i] ?? label}
          </span>
        ))}
        <GenomeButton genome={genome} variant="primary">Get Started</GenomeButton>
      </div>
    </nav>
  );
}

export function GenomeHero({ tokens, section }: { tokens: GenomeTokens; section: LayoutSection }) {
  const { genome, projectName, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const align = section.alignment;
  const hasImage = section.imagePlacement !== "none";

  const textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  const flexDir: "row" | "row-reverse" | "column" =
    hasImage && section.imagePlacement === "left" ? "row" :
    hasImage && section.imagePlacement === "right" ? "row-reverse" :
    "column";

  const effectiveHeadline = contentOverrides?.headline || content.headline;
  const effectiveSubheadline = contentOverrides?.subheadline || content.subheadline;
  const effectiveCtaLabel = contentOverrides?.ctaLabel || content.ctaLabel;
  const effectiveSecondaryCtaLabel = contentOverrides?.secondaryCtaLabel || content.secondaryCtaLabel;
  const headlineWords = effectiveHeadline.split(" ");
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
          {effectiveSubheadline}
        </p>
        <div style={{ display: "flex", gap: genome.spacing.sm, flexWrap: "wrap", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
          <GenomeButton genome={genome} variant="primary">{effectiveCtaLabel}</GenomeButton>
          <GenomeButton genome={genome} variant="outline">{effectiveSecondaryCtaLabel}</GenomeButton>
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
  const { genome, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const effectiveFeatures = contentOverrides?.features ?? content.features;
  const cols = Math.min(section.columns ?? 3, effectiveFeatures.length);
  const features = effectiveFeatures.slice(0, Math.max(cols, 3));
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
          {contentOverrides?.featureGridTitle ?? content.featureGridTitle}
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
  const { genome, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const effectiveFeatures = contentOverrides?.features ?? content.features;
  const count = Math.min(section.cardCount ?? 3, effectiveFeatures.length);
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
          {contentOverrides?.cardListTitle ?? content.cardListTitle}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
            gap: "16px",
          }}
        >
          {effectiveFeatures.slice(0, count).map((f, i) => (
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
  const { genome, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const effectiveStats = contentOverrides?.stats ?? content.stats;
  const cols = Math.min(section.columns ?? 4, effectiveStats.length);

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
        {effectiveStats.slice(0, cols).map((stat) => (
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
  const { genome, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const effectiveTestimonials = contentOverrides?.testimonials ?? content.testimonials;
  const count = Math.min(section.cardCount ?? 2, effectiveTestimonials.length);

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
          {effectiveTestimonials.slice(0, count).map((q, i) => (
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
  const { genome, productType, contentOverrides } = tokens;
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
          {contentOverrides?.ctaHeadline ?? content.ctaHeadline}
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
          {contentOverrides?.ctaBody ?? content.ctaBody}
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
          {contentOverrides?.ctaButtonLabel ?? content.ctaButtonLabel} →
        </span>
      </div>
    </section>
  );
}

export function GenomeFooter({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, projectLogoUrl, productType, contentOverrides, onNavigate } = tokens;
  const content = getProductContent(productType);
  const logoColor = (genome as any).branding?.logoColor ?? genome.colors.primary;
  const displayBrandName = contentOverrides?.brandName || projectName || content.brandName;
  const footerLinks = [
    { group: "Product", links: ["Features", "Pricing", "Changelog"], pages: ["features", "pricing", null] as (PreviewPage | null)[] },
    { group: "Resources", links: ["Docs", "API", "Guides"], pages: [null, null, null] as (PreviewPage | null)[] },
    { group: "Company", links: ["About", "Blog", "Contact"], pages: ["about", "blog", "contact"] as (PreviewPage | null)[] },
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
          <div style={{ display: "flex", alignItems: "center", gap: genome.spacing.sm, marginBottom: genome.spacing.sm, cursor: "pointer" }} onClick={() => onNavigate?.("home")}>
            {projectLogoUrl ? (
              <img src={projectLogoUrl} alt={displayBrandName} style={{ width: 22, height: 22, objectFit: "contain", borderRadius: genome.radius.sm }} />
            ) : (
              <GIcon name="compass" genome={genome} size={18} color={logoColor} />
            )}
            <span
              style={{
                fontFamily: `'${genome.typography.heading}', sans-serif`,
                fontSize: genome.typography.sizes.base,
                fontWeight: 700,
                color: logoColor,
              }}
            >
              {displayBrandName}
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
            {contentOverrides?.footerTagline ?? content.footerTagline}
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
            {col.links.map((link, idx) => (
              <p
                key={link}
                onClick={() => { const pg = col.pages[idx]; if (pg) onNavigate?.(pg); }}
                style={{
                  fontFamily: `'${genome.typography.body}', sans-serif`,
                  fontSize: genome.typography.sizes.sm,
                  color: genome.colors.secondary,
                  marginBottom: genome.spacing.xs,
                  cursor: col.pages[idx] ? "pointer" : "default",
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
          © {new Date().getFullYear()} {displayBrandName}. All rights reserved.
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

// ── Page components ──────────────────────────────────────────────────────────

function GenomeFeaturesPage({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const displayBrandName = contentOverrides?.brandName || projectName || content.brandName;
  return (
    <div style={{ backgroundColor: genome.colors.background, minHeight: "100vh" }}>
      <section style={{ padding: "80px 48px 60px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Features</span>
          <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: "#fff", marginTop: "12px", marginBottom: "16px", letterSpacing: "-0.03em" }}>
            Everything {displayBrandName} offers
          </h1>
          <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.base, color: genome.colors.secondary, maxWidth: "560px", margin: "0 auto", lineHeight: 1.6 }}>
            {content.featureGridTitle} — designed to make your team more productive from day one.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          {content.features.map((feat, i) => (
            <div key={i} style={{ backgroundColor: genome.colors.surface, borderRadius: genome.radius.lg, border: `1px solid ${genome.colors.primary}18`, padding: "28px 32px" }}>
              <div style={{ width: 44, height: 44, borderRadius: genome.radius.md, backgroundColor: `${genome.colors.primary}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <GIcon name={feat.icon as IconName} genome={genome} size={22} color={genome.colors.primary} />
              </div>
              <h3 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.lg, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>{feat.title}</h3>
              <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, lineHeight: 1.65, margin: 0 }}>{feat.description}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "80px", backgroundColor: genome.colors.surface, borderRadius: genome.radius.xl, padding: "48px", border: `1px solid ${genome.colors.primary}20`, textAlign: "center" }}>
          <h2 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["2xl"], fontWeight: 700, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
            Ready to get started?
          </h2>
          <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.base, color: genome.colors.secondary, margin: "0 0 24px" }}>Join thousands of teams using {displayBrandName} every day.</p>
          <GenomeButton genome={genome} variant="primary">{content.ctaLabel}</GenomeButton>
        </div>
      </section>
      <GenomeFooter tokens={tokens} />
    </div>
  );
}

function GenomePricingPage({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const displayBrandName = contentOverrides?.brandName || projectName || content.brandName;
  const plans = content.pricingPlans;
  const faqs = [
    { q: "Is there a free trial?", a: "Yes — all paid plans include a 14-day free trial. No credit card required to start." },
    { q: "Can I change plans later?", a: "Absolutely. You can upgrade, downgrade, or cancel at any time directly from your account settings." },
    { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and bank transfer for annual enterprise plans." },
    { q: "Is my data secure?", a: "Yes. All data is encrypted in transit and at rest. We're SOC 2 Type II certified and GDPR compliant." },
  ];
  return (
    <div style={{ backgroundColor: genome.colors.background, minHeight: "100vh" }}>
      <section style={{ padding: "80px 48px 60px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pricing</span>
          <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: "#fff", marginTop: "12px", marginBottom: "16px", letterSpacing: "-0.03em" }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.base, color: genome.colors.secondary, maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            Start free. Scale as you grow. No hidden fees.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "80px" }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{ backgroundColor: plan.highlighted ? genome.colors.primary : genome.colors.surface, borderRadius: genome.radius.xl, border: plan.highlighted ? "none" : `1px solid ${genome.colors.primary}20`, padding: "36px 28px", position: "relative", transform: plan.highlighted ? "scale(1.03)" : "none" }}>
              {plan.highlighted && (
                <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: genome.colors.accent, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "4px 14px", borderRadius: genome.radius.full, fontFamily: `'${genome.typography.body}', sans-serif`, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Most Popular
                </div>
              )}
              <p style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.base, fontWeight: 700, color: plan.highlighted ? "#fff" : "#fff", margin: "0 0 8px" }}>{plan.name}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                <span style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: plan.highlighted ? "#fff" : genome.colors.primary }}>{plan.price}</span>
                {plan.price !== "Custom" && <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.xs, color: plan.highlighted ? "rgba(255,255,255,0.7)" : genome.colors.secondary }}>{plan.period}</span>}
              </div>
              <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: plan.highlighted ? "rgba(255,255,255,0.8)" : genome.colors.secondary, margin: "0 0 24px", lineHeight: 1.5 }}>{plan.description}</p>
              <div style={{ marginBottom: "24px" }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ color: plan.highlighted ? "#fff" : genome.colors.accent, fontSize: "14px", fontWeight: 700 }}>✓</span>
                    <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: plan.highlighted ? "rgba(255,255,255,0.9)" : genome.colors.secondary }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "inline-block", backgroundColor: plan.highlighted ? "#fff" : genome.colors.primary, color: plan.highlighted ? genome.colors.primary : "#fff", borderRadius: genome.radius.md, padding: `${genome.spacing.xs} ${genome.spacing.md}`, fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.sm, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "center", boxSizing: "border-box" as const }}>
                {plan.cta}
              </div>
            </div>
          ))}
        </div>
        <h2 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["2xl"], fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "40px", letterSpacing: "-0.02em" }}>Frequently asked questions</h2>
        <div style={{ maxWidth: "700px", margin: "0 auto", display: "grid", gap: "16px" }}>
          {faqs.map((faq) => (
            <div key={faq.q} style={{ backgroundColor: genome.colors.surface, borderRadius: genome.radius.lg, border: `1px solid ${genome.colors.primary}18`, padding: "20px 24px" }}>
              <p style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.base, fontWeight: 600, color: "#fff", margin: "0 0 8px" }}>{faq.q}</p>
              <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
      <GenomeFooter tokens={tokens} />
    </div>
  );
}

function GenomeAboutPage({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, projectLogoUrl, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const displayBrandName = contentOverrides?.brandName || projectName || content.brandName;
  const logoColor = (genome as any).branding?.logoColor ?? genome.colors.primary;
  return (
    <div style={{ backgroundColor: genome.colors.background, minHeight: "100vh" }}>
      <section style={{ padding: "80px 48px 60px", maxWidth: "900px", margin: "0 auto" }}>
        <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>About</span>
        <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: "#fff", marginTop: "12px", marginBottom: "24px", letterSpacing: "-0.03em" }}>
          About {displayBrandName}
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center", marginBottom: "72px" }}>
          <div>
            <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.lg, color: genome.colors.secondary, lineHeight: 1.7, margin: "0 0 20px" }}>
              {content.aboutMission}
            </p>
            <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.base, color: genome.colors.secondary, lineHeight: 1.7, opacity: 0.8, margin: 0 }}>
              {content.footerTagline}
            </p>
          </div>
          <div style={{ backgroundColor: genome.colors.surface, borderRadius: genome.radius.xl, padding: "40px", border: `1px solid ${genome.colors.primary}20`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
            {projectLogoUrl ? (
              <img src={projectLogoUrl} alt={displayBrandName} style={{ width: 64, height: 64, objectFit: "contain", borderRadius: genome.radius.lg }} />
            ) : (
              <GIcon name="compass" genome={genome} size={48} color={logoColor} />
            )}
            <span style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["2xl"], fontWeight: 800, color: logoColor, letterSpacing: "-0.02em" }}>{displayBrandName}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "72px" }}>
          {content.stats.map((stat) => (
            <div key={stat.label} style={{ backgroundColor: genome.colors.surface, borderRadius: genome.radius.lg, border: `1px solid ${genome.colors.primary}18`, padding: "28px 24px", textAlign: "center" }}>
              <p style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["2xl"], fontWeight: 800, color: genome.colors.primary, margin: "0 0 4px" }}>{stat.value}</p>
              <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, margin: 0 }}>{stat.label}</p>
            </div>
          ))}
        </div>
        <h2 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["2xl"], fontWeight: 700, color: "#fff", marginBottom: "32px", letterSpacing: "-0.02em" }}>What our users say</h2>
        <div style={{ display: "grid", gap: "16px" }}>
          {content.testimonials.map((t, i) => (
            <div key={i} style={{ backgroundColor: genome.colors.surface, borderRadius: genome.radius.lg, border: `1px solid ${genome.colors.primary}15`, padding: "24px 28px" }}>
              <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.base, color: genome.colors.secondary, lineHeight: 1.65, margin: "0 0 12px", fontStyle: "italic" }}>"{t.text}"</p>
              <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.primary, margin: 0, fontWeight: 600 }}>{t.author} · {t.role}</p>
            </div>
          ))}
        </div>
      </section>
      <GenomeFooter tokens={tokens} />
    </div>
  );
}

function GenomeBlogPage({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const displayBrandName = contentOverrides?.brandName || projectName || content.brandName;
  const posts = content.blogPosts;
  return (
    <div style={{ backgroundColor: genome.colors.background, minHeight: "100vh" }}>
      <section style={{ padding: "80px 48px 60px", maxWidth: "960px", margin: "0 auto" }}>
        <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Blog</span>
        <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: "#fff", marginTop: "12px", marginBottom: "16px", letterSpacing: "-0.03em" }}>
          {displayBrandName} Blog
        </h1>
        <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.base, color: genome.colors.secondary, margin: "0 0 56px", lineHeight: 1.6 }}>
          Guides, updates, and insights from the {displayBrandName} team.
        </p>
        <div style={{ display: "grid", gap: "20px" }}>
          {posts.map((post, i) => (
            <div key={post.slug} style={{ backgroundColor: genome.colors.surface, borderRadius: genome.radius.xl, border: `1px solid ${genome.colors.primary}18`, padding: "32px 36px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "start", gap: "24px", cursor: "pointer" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ backgroundColor: `${genome.colors.accent}22`, color: genome.colors.accent, borderRadius: genome.radius.full, padding: "3px 12px", fontSize: "11px", fontWeight: 700, fontFamily: `'${genome.typography.body}', sans-serif`, textTransform: "uppercase", letterSpacing: "0.05em" }}>{post.tag}</span>
                  <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.xs, color: genome.colors.secondary, opacity: 0.6 }}>{post.date} · {post.readTime}</span>
                </div>
                <h2 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes.xl, fontWeight: 700, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.01em", lineHeight: 1.3 }}>{post.title}</h2>
                <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, margin: 0, lineHeight: 1.65, opacity: 0.85 }}>{post.excerpt}</p>
              </div>
              <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.primary, fontWeight: 600, whiteSpace: "nowrap", marginTop: "4px" }}>Read →</span>
            </div>
          ))}
        </div>
      </section>
      <GenomeFooter tokens={tokens} />
    </div>
  );
}

function GenomeContactPage({ tokens }: { tokens: GenomeTokens }) {
  const { genome, projectName, productType, contentOverrides } = tokens;
  const content = getProductContent(productType);
  const displayBrandName = contentOverrides?.brandName || projectName || content.brandName;
  const inputStyle = {
    width: "100%",
    backgroundColor: genome.colors.surface,
    border: `1px solid ${genome.colors.primary}30`,
    borderRadius: genome.radius.md,
    padding: "12px 16px",
    fontFamily: `'${genome.typography.body}', sans-serif`,
    fontSize: genome.typography.sizes.sm,
    color: "#fff",
    outline: "none",
    boxSizing: "border-box" as const,
  };
  return (
    <div style={{ backgroundColor: genome.colors.background, minHeight: "100vh" }}>
      <section style={{ padding: "80px 48px 60px", maxWidth: "760px", margin: "0 auto" }}>
        <span style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Contact</span>
        <h1 style={{ fontFamily: `'${genome.typography.heading}', sans-serif`, fontSize: genome.typography.sizes["3xl"], fontWeight: 800, color: "#fff", marginTop: "12px", marginBottom: "16px", letterSpacing: "-0.03em" }}>
          Get in touch
        </h1>
        <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.base, color: genome.colors.secondary, margin: "0 0 48px", lineHeight: 1.6 }}>
          Have a question or want to work with us? The {displayBrandName} team typically replies within one business day.
        </p>
        <div style={{ backgroundColor: genome.colors.surface, borderRadius: genome.radius.xl, border: `1px solid ${genome.colors.primary}20`, padding: "48px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, display: "block", marginBottom: "6px" }}>Name</label>
              <input style={inputStyle} placeholder="Your name" readOnly />
            </div>
            <div>
              <label style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, display: "block", marginBottom: "6px" }}>Email</label>
              <input style={inputStyle} placeholder="you@company.com" readOnly />
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, display: "block", marginBottom: "6px" }}>Subject</label>
            <input style={inputStyle} placeholder="How can we help?" readOnly />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.sm, color: genome.colors.secondary, display: "block", marginBottom: "6px" }}>Message</label>
            <textarea style={{ ...inputStyle, height: "140px", resize: "none" }} placeholder="Tell us more..." readOnly />
          </div>
          <GenomeButton genome={genome} variant="primary">Send message</GenomeButton>
          <p style={{ fontFamily: `'${genome.typography.body}', sans-serif`, fontSize: genome.typography.sizes.xs, color: genome.colors.secondary, margin: "16px 0 0", opacity: 0.6 }}>
            Or email us directly at hello@{displayBrandName.toLowerCase().replace(/\s+/g, "")}.com
          </p>
        </div>
      </section>
      <GenomeFooter tokens={tokens} />
    </div>
  );
}

// ── Section renderers ─────────────────────────────────────────────────────────
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
    // Skip Google Fonts loading for custom uploaded fonts (they are loaded via @font-face elsewhere)
    const googleFonts = [genome.typography.heading, genome.typography.body]
      .filter(Boolean)
      .filter((f) => !f.startsWith("ProjectFont-"));
    if (googleFonts.length === 0) return;
    const id = "genome-font-import";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const style = document.createElement("style");
    style.id = id;
    style.textContent = googleFonts
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
  contentOverrides,
  selectedSectionIdx,
  onSectionClick,
}: {
  genome: DesignGenome;
  layout: LayoutGraph;
  projectName: string;
  projectPrompt: string;
  projectLogoUrl?: string | null;
  productType?: string | null;
  contentOverrides?: ContentOverrides;
  selectedSectionIdx?: number | null;
  onSectionClick?: (idx: number) => void;
}) {
  const [activePage, setActivePage] = useState<PreviewPage>("home");
  const tokens: GenomeTokens = { genome, projectName, projectPrompt, projectLogoUrl, productType, contentOverrides, activePage, onNavigate: setActivePage };
  useGenomeFonts(genome);

  function renderPageContent() {
    switch (activePage) {
      case "features": return <GenomeFeaturesPage tokens={tokens} />;
      case "pricing": return <GenomePricingPage tokens={tokens} />;
      case "about": return <GenomeAboutPage tokens={tokens} />;
      case "blog": return <GenomeBlogPage tokens={tokens} />;
      case "contact": return <GenomeContactPage tokens={tokens} />;
      default:
        return (
          <>
            {layout.sections.map((section, i) => {
              const isSelected = selectedSectionIdx === i && onSectionClick != null;
              return (
                <div
                  key={`${section.type}-${i}`}
                  data-testid={`preview-section-${section.type}-${i}`}
                  onClick={onSectionClick ? () => onSectionClick(i) : undefined}
                  style={{
                    position: "relative",
                    outline: isSelected ? `2px solid ${genome.colors.primary}` : "none",
                    outlineOffset: "-2px",
                    cursor: onSectionClick ? "pointer" : "default",
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      padding: "4px 10px",
                      backgroundColor: genome.colors.primary,
                      zIndex: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      pointerEvents: "none",
                    }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
                        {section.type}
                      </span>
                    </div>
                  )}
                  {renderSection(section.type, tokens, section)}
                </div>
              );
            })}
          </>
        );
    }
  }

  return (
    <div
      data-testid="genome-preview"
      style={{
        backgroundColor: genome.colors.background,
        overflow: "auto",
        minHeight: "100%",
      }}
    >
      <GenomeNavbar tokens={tokens} />
      {renderPageContent()}
    </div>
  );
}
