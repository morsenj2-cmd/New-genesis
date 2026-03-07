import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { format } from "date-fns";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Hash,
  Clock,
  FileText,
  Dna,
  Copy,
  Check,
  AlertCircle,
  Palette,
  Type,
  Image as ImageIcon,
  Ruler,
  Circle,
  Zap,
  MousePointer,
  LayoutTemplate,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Project } from "@shared/schema";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph, LayoutSection, SectionType } from "@shared/layoutEngine";
import {
  renderIconSvgContent,
  GROUP_ICONS,
  GROUP_LABELS,
  type GenomeIconStyle,
  type IconName,
  type IconGroup,
} from "@shared/iconGenerator";
import { GenomePreview } from "@/components/genome-ui";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      data-testid="button-copy-seed"
      className="h-7 w-7"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function SeedVisualization({ seed }: { seed: string }) {
  const chunks = seed.match(/.{1,8}/g) || [];
  return (
    <div className="font-mono text-xs grid grid-cols-4 gap-1.5">
      {chunks.map((chunk, i) => (
        <div
          key={i}
          className="bg-muted rounded px-2 py-1 text-center"
          style={{ color: `hsl(${parseInt(chunk.slice(0, 2), 16) * 1.4}deg 60% 45%)` }}
        >
          {chunk}
        </div>
      ))}
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="flex flex-col gap-1.5 group text-left"
      onClick={async () => {
        await navigator.clipboard.writeText(color);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title={`Copy ${color}`}
      data-testid={`swatch-genome-${label}`}
    >
      <div
        className="h-12 rounded-lg border border-white/10 transition-transform group-hover:scale-105"
        style={{ backgroundColor: color }}
      />
      <p className="text-xs font-medium text-foreground capitalize">{label}</p>
      <p className="text-xs text-muted-foreground font-mono leading-none">
        {copied ? "Copied!" : color}
      </p>
    </button>
  );
}

function SpacingBar({ label, value }: { label: string; value: string }) {
  const px = parseInt(value);
  const maxPx = 120;
  const width = Math.min(100, (px / maxPx) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">{value}</span>
    </div>
  );
}

function RadiusPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="h-10 w-10 bg-primary/20 border border-primary/40"
        style={{ borderRadius: value === "9999px" ? "9999px" : value }}
      />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs font-mono text-foreground">{value}</p>
    </div>
  );
}

function GenomePanel({ genome }: { genome: DesignGenome }) {
  return (
    <div className="space-y-4">
      <Card data-testid="card-genome-colors">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            Color System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(genome.colors)
              .filter(([k]) => k !== "hues")
              .map(([key, val]) => (
                <ColorSwatch key={key} label={key} color={val as string} />
              ))}
          </div>
          <div className="mt-4 flex gap-3 text-xs text-muted-foreground">
            <span>Primary hue: <strong className="text-foreground">{genome.colors.hues.primary}°</strong></span>
            <span>Secondary: <strong className="text-foreground">{genome.colors.hues.secondary}°</strong></span>
            <span>Accent: <strong className="text-foreground">{genome.colors.hues.accent}°</strong></span>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-genome-typography">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Type className="h-3.5 w-3.5" />
            Typography
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Heading</p>
              <p
                className="text-xl font-bold text-foreground leading-tight"
                style={{ fontFamily: `'${genome.typography.heading}', sans-serif` }}
                data-testid="text-genome-heading-font"
              >
                {genome.typography.heading}
              </p>
              <p
                className="text-sm text-muted-foreground mt-1"
                style={{ fontFamily: `'${genome.typography.heading}', sans-serif` }}
              >
                The quick brown fox
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Body</p>
              <p
                className="text-xl font-bold text-foreground leading-tight"
                style={{ fontFamily: `'${genome.typography.body}', sans-serif` }}
              >
                {genome.typography.body}
              </p>
              <p
                className="text-sm text-muted-foreground mt-1"
                style={{ fontFamily: `'${genome.typography.body}', sans-serif` }}
              >
                The quick brown fox
              </p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Monospace · {genome.typography.mono}</p>
            <p
              className="text-sm text-foreground"
              style={{ fontFamily: `'${genome.typography.mono}', monospace` }}
            >
              const genome = generateGenome(seed);
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              Type scale · ratio {genome.typography.scaleRatio}×
            </p>
            <div className="space-y-1">
              {Object.entries(genome.typography.sizes).map(([key, val]) => (
                <div key={key} className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-8">{key}</span>
                  <span
                    className="text-foreground leading-tight"
                    style={{
                      fontFamily: `'${genome.typography.heading}', sans-serif`,
                      fontSize: val,
                      lineHeight: 1.2,
                    }}
                  >
                    Aa
                  </span>
                  <span className="text-xs font-mono text-muted-foreground ml-auto">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card data-testid="card-genome-spacing">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5" />
              Spacing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <p className="text-xs text-muted-foreground">
              Base {genome.spacing.base}px · ratio {genome.spacing.ratio}×
            </p>
            {(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((key) => (
              <SpacingBar key={key} label={key} value={genome.spacing[key]} />
            ))}
          </CardContent>
        </Card>

        <Card data-testid="card-genome-radius">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Circle className="h-3.5 w-3.5" />
              Border Radius
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 flex-wrap">
              {(["sm", "md", "lg", "xl", "full"] as const).map((key) => (
                <RadiusPreview key={key} label={key} value={genome.radius[key]} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card data-testid="card-genome-icons">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MousePointer className="h-3.5 w-3.5" />
              Icon Style
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Variant</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {genome.iconStyle.variant}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Stroke Width</span>
              <span className="text-xs font-mono text-foreground">{genome.iconStyle.strokeWidth}px</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Geometry Bias</span>
              <Badge variant="outline" className="text-xs capitalize">
                {genome.iconStyle.geometryBias}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Corner Roundness</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full"
                    style={{ width: `${genome.iconStyle.cornerRoundness}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground">{genome.iconStyle.cornerRoundness}%</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              {(["chat", "search", "settings", "cart", "play"] as IconName[]).map((name) => (
                <ProjectIcon
                  key={name}
                  name={name}
                  style={{
                    strokeWidth: genome.iconStyle.strokeWidth,
                    cornerRoundness: genome.iconStyle.cornerRoundness,
                    geometryBias: genome.iconStyle.geometryBias,
                    variant: genome.iconStyle.variant,
                  }}
                  size={22}
                  color={genome.colors.primary}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-genome-motion">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Motion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Easing</span>
              <Badge variant="secondary" className="text-xs">{genome.motion.easingName}</Badge>
            </div>
            <Separator />
            {(["fast", "base", "slow"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">{key}</span>
                <span className="text-xs font-mono text-foreground">{genome.motion.duration[key]}</span>
              </div>
            ))}
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Easing curve</p>
              <p className="text-xs font-mono text-foreground break-all leading-relaxed">
                {genome.motion.easing}
              </p>
            </div>
            <div className="pt-1">
              <MotionPreview easing={genome.motion.easing} duration={genome.motion.duration.base} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MotionPreview({ easing, duration }: { easing: string; duration: string }) {
  const [active, setActive] = useState(false);
  return (
    <button
      className="w-full h-10 bg-muted rounded-lg overflow-hidden relative flex items-center px-2"
      onClick={() => {
        setActive(false);
        requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
      }}
      title="Click to preview"
      data-testid="button-motion-preview"
    >
      <div
        className="h-6 w-6 rounded-full bg-primary shrink-0"
        style={{
          transition: active ? `transform ${duration} ${easing}` : "none",
          transform: active ? "translateX(calc(100vw - 4rem))" : "translateX(0)",
          maxWidth: "calc(100% - 1.5rem)",
        }}
      />
      <span className="absolute right-2 text-xs text-muted-foreground">tap to preview</span>
    </button>
  );
}

function ProjectIcon({
  name,
  style,
  size = 24,
  color,
}: {
  name: IconName;
  style: GenomeIconStyle;
  size?: number;
  color?: string;
}) {
  const fill = style.variant === "filled" ? "currentColor" : "none";
  const lc = style.geometryBias === "organic" ? "round" : "square";
  const lj = style.geometryBias === "organic" ? "round" : "miter";
  const inner = renderIconSvgContent(name, style);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth={style.strokeWidth}
      strokeLinecap={lc as "round" | "square" | "butt" | "inherit"}
      strokeLinejoin={lj as "round" | "miter" | "bevel" | "inherit"}
      style={{ color: color ?? "currentColor" }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

function IconFamilyPanel({ iconStyle, primaryColor }: { iconStyle: DesignGenome["iconStyle"]; primaryColor: string }) {
  const style: GenomeIconStyle = {
    strokeWidth: iconStyle.strokeWidth,
    cornerRoundness: iconStyle.cornerRoundness,
    geometryBias: iconStyle.geometryBias,
    variant: iconStyle.variant,
  };

  const groups: IconGroup[] = ["communication", "navigation", "system", "commerce", "media"];

  return (
    <Card data-testid="card-icon-family">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <MousePointer className="h-3.5 w-3.5" />
          Icon Family
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
              {GROUP_LABELS[group]}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {GROUP_ICONS[group].map((name) => (
                <div
                  key={name}
                  className="flex flex-col items-center gap-1.5 group cursor-default"
                  title={name}
                  data-testid={`icon-${group}-${name}`}
                >
                  <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                    <ProjectIcon name={name} style={style} size={20} color={primaryColor} />
                  </div>
                  <span className="text-[9px] text-muted-foreground leading-none">{name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const SECTION_META: Record<
  SectionType,
  { label: string; color: string; description: string }
> = {
  hero:        { label: "Hero",         color: "bg-primary/20 border-primary/40 text-primary",             description: "Full-width intro section" },
  featureGrid: { label: "Feature Grid", color: "bg-blue-500/20 border-blue-500/40 text-blue-400",          description: "Grid of feature highlights" },
  cardList:    { label: "Card List",    color: "bg-violet-500/20 border-violet-500/40 text-violet-400",    description: "Row or grid of cards" },
  stats:       { label: "Stats",        color: "bg-amber-500/20 border-amber-500/40 text-amber-400",       description: "Key metrics and numbers" },
  testimonial: { label: "Testimonial",  color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400", description: "Quotes and social proof" },
  cta:         { label: "CTA",          color: "bg-rose-500/20 border-rose-500/40 text-rose-400",          description: "Call-to-action block" },
  footer:      { label: "Footer",       color: "bg-muted border-border text-muted-foreground",             description: "Site footer" },
};

function AlignIcon({ alignment }: { alignment: string }) {
  if (alignment === "center") return <AlignCenter className="h-3 w-3" />;
  if (alignment === "right") return <AlignRight className="h-3 w-3" />;
  return <AlignLeft className="h-3 w-3" />;
}

function SectionRow({ section, index }: { section: LayoutSection; index: number }) {
  const meta = SECTION_META[section.type];
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
      data-testid={`section-row-${index}`}
    >
      <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{index + 1}</span>
      <div className={`px-2 py-0.5 rounded text-xs font-medium border ${meta.color} shrink-0 min-w-[90px] text-center`}>
        {meta.label}
      </div>
      <div className="flex items-center gap-1 text-muted-foreground shrink-0" title={`Alignment: ${section.alignment}`}>
        <AlignIcon alignment={section.alignment} />
        <span className="text-xs">{section.alignment}</span>
      </div>
      {section.columns !== undefined && (
        <div className="flex items-center gap-1 text-muted-foreground shrink-0" title="Columns">
          <Columns className="h-3 w-3" />
          <span className="text-xs">{section.columns}col</span>
        </div>
      )}
      {section.cardCount !== undefined && (
        <Badge variant="outline" className="text-xs h-5">{section.cardCount} cards</Badge>
      )}
      {section.imagePlacement !== "none" && (
        <Badge variant="outline" className="text-xs h-5">img {section.imagePlacement}</Badge>
      )}
      <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{section.orientation}</span>
    </div>
  );
}

function WireframeBlock({ section }: { section: LayoutSection }) {
  const meta = SECTION_META[section.type];
  const isHero = section.type === "hero";
  const isFooter = section.type === "footer";

  return (
    <div
      className={`rounded border ${meta.color} flex flex-col gap-1 p-2 ${isHero ? "py-4" : ""} ${isFooter ? "py-2 opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-wider">{meta.label}</span>
        {section.columns && (
          <span className="text-[9px] opacity-70">{section.columns}×</span>
        )}
      </div>
      {section.imagePlacement !== "none" && (
        <div className={`flex gap-1 ${section.imagePlacement === "left" ? "flex-row" : section.imagePlacement === "right" ? "flex-row-reverse" : "flex-col"}`}>
          <div className="h-4 w-8 bg-current opacity-20 rounded-sm shrink-0" />
          <div className="h-1.5 flex-1 bg-current opacity-10 rounded-sm mt-1" />
        </div>
      )}
      {!isFooter && section.imagePlacement === "none" && (
        <div className="space-y-0.5">
          <div className={`h-1.5 bg-current opacity-20 rounded-sm ${section.alignment === "center" ? "mx-auto w-3/4" : section.alignment === "right" ? "ml-auto w-3/4" : "w-full"}`} />
          <div className={`h-1 bg-current opacity-10 rounded-sm ${section.alignment === "center" ? "mx-auto w-1/2" : section.alignment === "right" ? "ml-auto w-1/2" : "w-2/3"}`} />
        </div>
      )}
      {section.columns && section.columns > 1 && (
        <div className={`grid gap-0.5`} style={{ gridTemplateColumns: `repeat(${Math.min(section.columns, 4)}, 1fr)` }}>
          {Array.from({ length: section.columns }).map((_, i) => (
            <div key={i} className="h-2 bg-current opacity-10 rounded-sm" />
          ))}
        </div>
      )}
    </div>
  );
}

function LayoutPanel({ layout }: { layout: LayoutGraph }) {
  return (
    <Card data-testid="card-layout-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <LayoutTemplate className="h-3.5 w-3.5" />
          Layout Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="font-medium text-foreground">{layout.metadata.sectionCount}</span> sections
          </span>
          <span className="flex items-center gap-1">
            dominant: <Badge variant="secondary" className="text-xs h-4 ml-1">{layout.metadata.dominantAlignment}</Badge>
          </span>
          <span className="flex items-center gap-1">
            grid: <Badge variant="secondary" className="text-xs h-4 ml-1">{layout.metadata.gridStyle}</Badge>
          </span>
          {layout.metadata.hasMedia && (
            <Badge variant="outline" className="text-xs h-4">
              <ImageIcon className="h-2.5 w-2.5 mr-1" /> has media
            </Badge>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-2" data-testid="layout-wireframe">
          {layout.sections.map((section, i) => (
            <WireframeBlock key={i} section={section} />
          ))}
        </div>

        <Separator />

        <div className="space-y-2" data-testid="layout-section-list">
          {layout.sections.map((section, i) => (
            <SectionRow key={i} section={section} index={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ["/api/project", params.id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/project/${params.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load project");
      }
      return res.json();
    },
    enabled: !!params.id,
  });

  useEffect(() => {
    if (!project?.fontUrl) return;
    const style = document.createElement("style");
    style.id = `custom-font-${project.id}`;
    style.textContent = `@font-face { font-family: 'ProjectFont-${project.id}'; src: url('${project.fontUrl}'); }`;
    const existing = document.getElementById(`custom-font-${project.id}`);
    if (existing) existing.remove();
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [project?.fontUrl, project?.id]);

  const fontFamily = project?.fontUrl
    ? `'ProjectFont-${project.id}', sans-serif`
    : project?.font ? `'${project.font}', sans-serif` : undefined;

  const genome: DesignGenome | null = (() => {
    if (!project?.genomeJson) return null;
    try { return JSON.parse(project.genomeJson); } catch { return null; }
  })();

  const layout: LayoutGraph | null = (() => {
    if (!project?.layoutJson) return null;
    try { return JSON.parse(project.layoutJson); } catch { return null; }
  })();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back"
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : project ? (
              <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                {project.logoUrl && (
                  <img
                    src={project.logoUrl}
                    alt="Logo"
                    className="h-7 w-7 rounded-md object-contain border border-border shrink-0"
                  />
                )}
                <h1
                  className="text-lg font-semibold text-foreground truncate"
                  style={fontFamily ? { fontFamily } : {}}
                  data-testid="header-project-name"
                >
                  {project.name}
                </h1>
                {project.themeColor && (
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: project.themeColor }}
                    title="Theme color"
                  />
                )}
              </div>
            ) : null}
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <ProjectSkeleton />
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full min-h-64 text-center">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Failed to load project</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : "Something went wrong"}
                </p>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Back to Projects
                </Button>
              </div>
            ) : project ? (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-4">
                    <Card data-testid="card-project-details">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Name</p>
                          <p
                            className="text-sm font-medium text-foreground"
                            style={fontFamily ? { fontFamily } : {}}
                            data-testid="text-project-name"
                          >
                            {project.name}
                          </p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Created</p>
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span data-testid="text-project-created">
                              {format(new Date(project.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Project ID</p>
                          <p className="text-xs font-mono text-muted-foreground break-all">
                            {project.id}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {(project.logoUrl || project.font || project.themeColor) && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Palette className="h-3.5 w-3.5" />
                            Brand
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {project.logoUrl && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" /> Logo
                              </p>
                              <img
                                src={project.logoUrl}
                                alt="Project logo"
                                className="h-14 w-14 rounded-lg object-contain border border-border"
                                data-testid="img-project-logo"
                              />
                            </div>
                          )}
                          {project.font && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Type className="h-3 w-3" /> Font
                              </p>
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={fontFamily ? { fontFamily } : {}}
                                data-testid="badge-project-font"
                              >
                                {project.font}{project.fontUrl ? " (custom)" : ""}
                              </Badge>
                            </div>
                          )}
                          {project.themeColor && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Palette className="h-3 w-3" /> Theme Color
                              </p>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-6 w-6 rounded-full border border-border shrink-0"
                                  style={{ backgroundColor: project.themeColor }}
                                  data-testid="swatch-project-color"
                                />
                                <span className="text-xs font-mono text-muted-foreground">
                                  {project.themeColor}
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          Prompt
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-foreground leading-relaxed" data-testid="text-project-prompt">
                          {project.prompt}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Dna className="h-3.5 w-3.5" />
                            Genome Seed
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Hash className="h-2.5 w-2.5" />
                              SHA-256
                            </Badge>
                            <CopyButton text={project.seed} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div
                          className="bg-muted rounded-lg p-4 font-mono text-xs text-muted-foreground break-all select-all"
                          data-testid="text-project-seed"
                        >
                          {project.seed}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-3">Visualization</p>
                          <SeedVisualization seed={project.seed} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This deterministic seed is a SHA-256 hash generated from your account and project data at creation time. It produces the same output every time it&apos;s used.
                        </p>
                      </CardContent>
                    </Card>

                    {genome ? (
                      <>
                        <GenomePanel genome={genome} />
                        <IconFamilyPanel
                          iconStyle={genome.iconStyle}
                          primaryColor={genome.colors.primary}
                        />
                      </>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                          <Dna className="h-8 w-8 text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No genome data — this project was created before genome generation was added.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {layout ? (
                      <LayoutPanel layout={layout} />
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                          <LayoutTemplate className="h-8 w-8 text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No layout data — this project was created before layout generation was added.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {genome && layout && (
                  <div data-testid="section-website-preview">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <LayoutTemplate className="h-3.5 w-3.5" />
                          Website Preview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="overflow-y-auto max-h-[640px] rounded-lg">
                          <GenomePreview
                            genome={genome}
                            layout={layout}
                            projectName={project.name}
                            projectPrompt={project.prompt}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
