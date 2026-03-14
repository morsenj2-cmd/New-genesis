import { useParams, useLocation } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { format } from "date-fns";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
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
  RefreshCw,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Download,
  Trash2,
  Lock,
  Unlock,
  LayoutTemplate as LayoutIcon,
  Wand2,
  PenLine,
  Loader2,
  Bot,
  Code2,
  Eye,
  Plug,
  Plus,
  X as XIcon,
  KeyRound,
  Crown,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Project } from "@shared/schema";
import type { DesignGenome } from "@shared/genomeGenerator";
import { generateGenome } from "@shared/genomeGenerator";
import { mergeDesignSources } from "@shared/designMerger";
import type { LayoutGraph, LayoutSection, SectionType } from "@shared/layoutEngine";
import { generateLayout } from "@shared/layoutEngine";
import {
  renderIconSvgContent,
  GROUP_ICONS,
  GROUP_LABELS,
  type GenomeIconStyle,
  type IconName,
  type IconGroup,
} from "@shared/iconGenerator";
import { GenomePreview } from "@/components/genome-ui";
import { NLDesigner } from "@/components/NLDesigner";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { CanvasEditor, type ContentOverrides } from "@/components/CanvasEditor";
import type { NLContentPatch } from "@/components/NLDesigner";

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

async function deriveSeed(baseSeed: string, iteration: number): Promise<string> {
  const text = `${baseSeed}:${iteration}`;
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  featureGrid: "Feature Grid",
  cardList: "Card List",
  stats: "Stats",
  testimonial: "Testimonials",
  cta: "Call to Action",
  footer: "Footer",
};

const SECTION_COLORS: Record<string, string> = {
  hero: "#6366f1",
  featureGrid: "#8b5cf6",
  cardList: "#a78bfa",
  stats: "#f59e0b",
  testimonial: "#10b981",
  cta: "#ef4444",
  footer: "#6b7280",
};

interface IntegrationItem {
  name: string;
  key: string;
  value: string;
}

function IntegrationsDialog({
  projectId,
  initialIntegrations,
}: {
  projectId: string;
  initialIntegrations: IntegrationItem[];
}) {
  const [open, setOpen] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(initialIntegrations);
  const { toast } = useToast();

  useEffect(() => {
    setIntegrations(initialIntegrations);
  }, [initialIntegrations]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/project/${projectId}/integrations`, { integrations });
    },
    onSuccess: () => {
      toast({ title: "Integrations saved", description: "Regenerate your app to apply them." });
      queryClient.invalidateQueries({ queryKey: ["/api/project", projectId] });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const addIntegration = () => setIntegrations([...integrations, { name: "", key: "key", value: "" }]);
  const removeIntegration = (i: number) => setIntegrations(integrations.filter((_, idx) => idx !== i));
  const updateIntegration = (i: number, field: keyof IntegrationItem, val: string) => {
    const updated = [...integrations];
    updated[i] = { ...updated[i], [field]: val };
    setIntegrations(updated);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-8" data-testid="button-open-integrations">
          <Plug className="h-3.5 w-3.5" />
          Integrations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Add public API keys for services (Clerk, Stripe, Firebase, etc.). The AI will include their initialization code when generating your app.
        </p>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {integrations.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              No integrations yet. Add one below.
            </div>
          )}
          {integrations.map((ig, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2 relative">
              <button
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => removeIntegration(i)}
                data-testid={`button-remove-integration-${i}`}
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
              <div>
                <Label className="text-xs mb-1 block">Service Name</Label>
                <Input
                  placeholder="e.g. Clerk Auth, Stripe, Firebase Analytics"
                  value={ig.name}
                  onChange={e => updateIntegration(i, "name", e.target.value)}
                  className="h-8 text-xs"
                  data-testid={`input-integration-name-${i}`}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 flex items-center gap-1 text-muted-foreground">
                  <KeyRound className="h-3 w-3" /> Publishable / Public API Key
                </Label>
                <Input
                  placeholder="pk_test_... or your public key"
                  value={ig.value}
                  onChange={e => updateIntegration(i, "value", e.target.value)}
                  className="h-8 text-xs font-mono"
                  data-testid={`input-integration-value-${i}`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={addIntegration} data-testid="button-add-integration">
            <Plus className="h-3.5 w-3.5" /> Add Integration
          </Button>
          <Button
            className="flex-1"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save-integrations"
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeftPanel({
  project,
  activeGenome,
  activeLayout,
  activeSeed,
  iteration,
  isRegenerating,
  isRegeneratingLayout,
  fontFamily,
  onRegenerateStyle,
  onRegenerateLayout,
  onToggleLayoutLock,
  onNLApplied,
  integrations,
  subscription,
}: {
  project: Project;
  activeGenome: DesignGenome | null;
  activeLayout: LayoutGraph | null;
  activeSeed: string;
  iteration: number;
  isRegenerating: boolean;
  isRegeneratingLayout: boolean;
  fontFamily: string | undefined;
  onRegenerateStyle: () => void;
  onRegenerateLayout: () => void;
  onToggleLayoutLock: () => void;
  onNLApplied: (genome: DesignGenome, layout: LayoutGraph, contentPatch?: NLContentPatch | Record<string, string>) => void;
  integrations: IntegrationItem[];
  subscription?: { plan: string; active: boolean; totalCredits: number; creditsUsedAcrossProjects: number; hasExhaustedProject: boolean; perProjectLimit: number };
}) {
  const [showTokens, setShowTokens] = useState(false);
  const isLocked = !!project.layoutLocked;

  return (
    <div className="w-72 border-r border-border flex flex-col overflow-hidden bg-background">
      <div className="p-4 border-b border-border space-y-3">
        <Button
          className="w-full gap-2 font-medium"
          onClick={onRegenerateStyle}
          disabled={isRegenerating || isRegeneratingLayout}
          data-testid="button-regenerate-style"
          variant="default"
        >
          <Wand2 className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
          {isRegenerating ? "Generating…" : "Regenerate Style"}
        </Button>
        <div className="flex gap-2">
          <Button
            className="flex-1 gap-1.5 font-medium text-xs"
            onClick={onRegenerateLayout}
            disabled={isLocked || isRegenerating || isRegeneratingLayout}
            data-testid="button-regenerate-layout"
            variant="outline"
            size="sm"
          >
            <LayoutIcon className={`h-3.5 w-3.5 ${isRegeneratingLayout ? "animate-spin" : ""}`} />
            {isRegeneratingLayout ? "…" : "Regenerate Layout"}
          </Button>
          <Button
            size="sm"
            variant={isLocked ? "default" : "outline"}
            onClick={onToggleLayoutLock}
            data-testid="button-layout-lock"
            title={isLocked ? "Unlock layout" : "Lock layout"}
            className="px-3"
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <Separator />
        <NLDesigner
          projectId={project.id}
          creditsUsed={project.nlCreditsUsed ?? 0}
          creditLimit={subscription?.perProjectLimit ?? 500}
          userPlan={subscription?.plan ?? "free"}
          onApplied={onNLApplied}
        />
        <IntegrationsDialog projectId={project.id} initialIntegrations={integrations} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Dna className="h-3 w-3" /> Active Seed
          </p>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground bg-muted rounded px-2 py-1 truncate flex-1" data-testid="text-active-seed">
              {activeSeed.slice(0, 20)}…
            </span>
            <CopyButton text={activeSeed} />
          </div>
          {iteration === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Original seed</p>
          )}
        </div>

        {activeLayout && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Layout · {activeLayout.sections.length} sections
              </p>
              <div className="space-y-1.5">
                {activeLayout.sections.map((section, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
                    style={{ backgroundColor: `${SECTION_COLORS[section.type] || "#6b7280"}18` }}
                    data-testid={`section-item-${section.type}-${i}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: SECTION_COLORS[section.type] || "#6b7280" }}
                    />
                    <span className="text-foreground font-medium flex-1">
                      {SECTION_LABELS[section.type] || section.type}
                    </span>
                    {section.columns && (
                      <span className="text-muted-foreground tabular-nums">{section.columns}col</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeGenome && (
          <>
            <Separator />
            <div>
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                onClick={() => setShowTokens(!showTokens)}
                data-testid="button-toggle-tokens"
              >
                <Palette className="h-3 w-3" /> Design Tokens
                {showTokens ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
              </button>
              {showTokens && (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Colors</p>
                    <div className="flex gap-1.5">
                      {Object.entries(activeGenome.colors)
                        .filter(([k]) => k !== "hues")
                        .map(([key, val]) => (
                          <div
                            key={key}
                            className="h-6 flex-1 rounded"
                            style={{ backgroundColor: val as string }}
                            title={`${key}: ${val}`}
                          />
                        ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Heading</p>
                      <p className="text-foreground truncate font-medium">{activeGenome.typography.heading}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Body</p>
                      <p className="text-foreground truncate font-medium">{activeGenome.typography.body}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Radius</p>
                      <p className="text-foreground font-medium">{activeGenome.radius.md}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Spacing</p>
                      <p className="text-foreground font-medium">×{activeGenome.spacing.ratio}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Motion</p>
                      <p className="text-foreground font-medium truncate">{activeGenome.motion.easingName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Icons</p>
                      <p className="text-foreground font-medium capitalize">{activeGenome.iconStyle.geometryBias}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Project
              </p>
              {project.logoUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={project.logoUrl}
                    alt="Logo"
                    className="h-8 w-8 rounded object-contain border border-border"
                    data-testid="img-sidebar-logo"
                  />
                  <span className="text-xs text-muted-foreground">Custom logo</span>
                </div>
              )}
              {project.font && (
                <div className="flex items-center gap-2">
                  <Type className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="text-xs" style={fontFamily ? { fontFamily } : {}}>
                    {project.font}
                  </Badge>
                </div>
              )}
              {project.themeColor && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: project.themeColor }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">{project.themeColor}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span data-testid="text-project-created">
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </>
        )}

        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Hash className="h-3 w-3" /> Original Seed
          </p>
          <SeedVisualization seed={project.seed} />
        </div>
      </div>
    </div>
  );
}

function SidebarAutoCollapse({ canvasMode }: { canvasMode: boolean }) {
  const { setOpen } = useSidebar();
  const prevCanvasRef = useRef(false);
  useEffect(() => {
    if (canvasMode && !prevCanvasRef.current) {
      setOpen(false);
    }
    prevCanvasRef.current = canvasMode;
  }, [canvasMode, setOpen]);
  return null;
}

export default function ProjectPage() {
  usePageTitle("Project");
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();

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

  const { data: subscription } = useQuery<{
    plan: string;
    active: boolean;
    totalCredits: number;
    creditsUsedAcrossProjects: number;
    hasExhaustedProject: boolean;
    perProjectLimit: number;
  }>({
    queryKey: ["/api/user/subscription"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/user/subscription", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
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

  const baseGenome = useMemo<DesignGenome | null>(() => {
    if (!project?.seed) return null;
    if (project.genomeJson) {
      try { return JSON.parse(project.genomeJson); } catch {}
    }
    return generateGenome(project.seed);
  }, [project?.seed, project?.genomeJson]);

  const baseLayout = useMemo<LayoutGraph | null>(() => {
    if (!project?.seed) return null;
    if (project.layoutJson) {
      try { return JSON.parse(project.layoutJson); } catch {}
    }
    return generateLayout(project.seed);
  }, [project?.seed, project?.layoutJson]);

  const [activeSeed, setActiveSeed] = useState<string>("");
  const [activeGenome, setActiveGenome] = useState<DesignGenome | null>(null);
  const [activeLayout, setActiveLayout] = useState<LayoutGraph | null>(null);
  const [nlColorOverride, setNlColorOverride] = useState<string | null>(null);
  const [iteration, setIteration] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRegeneratingLayout, setIsRegeneratingLayout] = useState(false);
  const [canvasMode, setCanvasMode] = useState(false);
  const [contentOverrides, setContentOverrides] = useState<ContentOverrides>({});
  const [geminiStatus, setGeminiStatus] = useState<"none" | "pending" | "ready" | "failed">("none");
  const [geminiAppHtml, setGeminiAppHtml] = useState<string | null>(null);
  const [showCodeView, setShowCodeView] = useState(false);
  const [localHtml, setLocalHtml] = useState<string>("");

  // Inject navigation interceptor so anchor links scroll within the iframe
  // instead of navigating the parent Morse page
  const safeGeminiHtml = useMemo(() => {
    if (!geminiAppHtml) return null;
    let html = geminiAppHtml;
    html = html.replace(
      /h([1-6])\s*\{[^}]*?max-width\s*:\s*[\d.]+rem[^}]*?\}/g,
      (match: string, level: string) => {
        const sizes: Record<string, string> = { "1": "2.5rem", "2": "1.75rem", "3": "1.25rem", "4": "1.1rem", "5": "1rem", "6": "0.875rem" };
        return match.replace(/max-width\s*:\s*[\d.]+rem/, `font-size: ${sizes[level] || "1rem"}`);
      }
    );
    if (html.includes("__safeNav")) return html;
    const script = `<script>
(function(){
  try{Object.defineProperty(window,'__safeNav',{value:true,writable:false});}catch(e){}
  window.open=function(){return null;};
  document.addEventListener('click',function(e){
    var el=e.target;
    for(var i=0;i<6&&el&&el!==document.body;i++,el=el.parentElement){
      if(!el||!el.tagName)continue;
      var tag=el.tagName.toUpperCase();
      if(tag==='A'){
        var href=el.getAttribute&&el.getAttribute('href');
        if(href&&!href.startsWith('#')&&!href.startsWith('javascript')){
          e.preventDefault();e.stopImmediatePropagation();
          var dest=document.querySelector('[id*="contact"]')||document.querySelector('[id*="donate"]')||document.querySelector('[id*="signup"]')||document.querySelector('[id*="settings"]')||document.querySelector('section:not(.active)');
          if(dest){document.querySelectorAll('section.active,.view.active,.page.active,[data-view].active').forEach(function(p){p.classList.remove('active');p.style.display='none';});dest.classList.add('active');dest.style.display='block';dest.scrollIntoView({behavior:'smooth'});}
          return;
        }
      }
      if(tag==='BUTTON'||tag==='A'||tag==='INPUT'){
        var oc=el.getAttribute&&el.getAttribute('onclick');
        if(oc&&(oc.includes('window.location')||oc.includes('location.href')||oc.includes('location.assign')||oc.includes('location.replace')||oc.includes('window.open'))){
          e.preventDefault();e.stopImmediatePropagation();
          var s=document.querySelector('[id*="donate"],[id*="contact"],[id*="signup"],[id*="action"]');
          if(s){s.style.display='block';s.scrollIntoView({behavior:'smooth'});}
          return;
        }
      }
    }
  },true);
  function initNav(){
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){e.preventDefault();var t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});});
    });
    document.querySelectorAll('a[href^="http"],a[href^="//"],a[href^="www"]').forEach(function(a){a.removeAttribute('href');a.style.cursor='pointer';});
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initNav);}else{initNav();}
  var ob=new MutationObserver(initNav);if(document.body)ob.observe(document.body,{childList:true,subtree:true});
})();
</script>`;
    if (html.includes("</body>")) return html.replace("</body>", script + "\n</body>");
    return html + script;
  }, [geminiAppHtml]);

  useEffect(() => {
    if (project?.seed && baseGenome && baseLayout) {
      setActiveSeed(project.seed);
      setActiveGenome(baseGenome);
      setActiveLayout(baseLayout);
      setIteration(0);
    }
  }, [project?.seed, baseGenome, baseLayout]);

  useEffect(() => {
    if (project?.settingsJson) {
      try {
        const s = JSON.parse(project.settingsJson);
        const pc = s.promptContent;
        const patch: Record<string, unknown> = {};
        if (s.brandName) patch.brandName = s.brandName;
        if (pc) {
          if (pc.headline)           patch.headline           = pc.headline;
          if (pc.subheadline)        patch.subheadline        = pc.subheadline;
          if (pc.ctaLabel)           patch.ctaLabel           = pc.ctaLabel;
          if (pc.secondaryCtaLabel)  patch.secondaryCtaLabel  = pc.secondaryCtaLabel;
          if (pc.ctaHeadline)        patch.ctaHeadline        = pc.ctaHeadline;
          if (pc.ctaBody)            patch.ctaBody            = pc.ctaBody;
          if (pc.ctaButtonLabel)     patch.ctaButtonLabel     = pc.ctaButtonLabel;
          if (pc.featureGridTitle)   patch.featureGridTitle   = pc.featureGridTitle;
          if (pc.cardListTitle)      patch.cardListTitle      = pc.cardListTitle;
          if (pc.footerTagline)      patch.footerTagline      = pc.footerTagline;
          if (pc.aboutMission)       patch.aboutMission       = pc.aboutMission;
          if (Array.isArray(pc.features) && pc.features.length > 0)           patch.features      = pc.features;
          if (Array.isArray(pc.stats) && pc.stats.length > 0)                 patch.stats         = pc.stats;
          if (Array.isArray(pc.testimonials) && pc.testimonials.length > 0)   patch.testimonials  = pc.testimonials;
          if (Array.isArray(pc.navLinks) && pc.navLinks.length > 0)           patch.navLinks      = pc.navLinks;
        }
        if (Object.keys(patch).length > 0) {
          setContentOverrides(prev => ({ ...prev, ...patch } as typeof prev));
        }
      } catch {}
    }
  }, [project?.settingsJson]);

  // Parse AI status, generated HTML, and integrations from settingsJson
  useEffect(() => {
    if (project?.settingsJson) {
      try {
        const s = JSON.parse(project.settingsJson);
        setGeminiStatus(s.geminiStatus ?? "none");
        if (s.geminiAppHtml) {
          setGeminiAppHtml(s.geminiAppHtml);
          setLocalHtml(s.geminiAppHtml);
        }
      } catch {}
    }
  }, [project?.settingsJson]);

  const projectIntegrations: IntegrationItem[] = useMemo(() => {
    try {
      const s = project?.settingsJson ? JSON.parse(project.settingsJson) : {};
      return s.integrations ?? [];
    } catch { return []; }
  }, [project?.settingsJson]);

  // Poll while Gemini is pending
  useEffect(() => {
    if (geminiStatus !== "pending" || !params.id) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", params.id] });
    }, 4000);
    return () => clearInterval(interval);
  }, [geminiStatus, params.id]);

  const generateAppMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/project/${params.id}/generate-app`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Generation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setGeminiStatus("pending");
      toast({ title: "AI generation started", description: "Your app is being generated. This takes about 30 seconds." });
    },
    onError: (err) => {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const effectiveProductType = useMemo<string | null>(() => {
    if (!project) return null;
    if (project.productType) return project.productType;
    if (project.settingsJson) {
      try {
        const s = JSON.parse(project.settingsJson);
        return s.productType ?? null;
      } catch {}
    }
    return null;
  }, [project?.productType, project?.settingsJson]);

  const displayGenome = useMemo<DesignGenome | null>(() => {
    if (!activeGenome || !project) return activeGenome;
    const merged = mergeDesignSources(activeGenome, {
      selectedFont: project.font,
      selectedPrimaryColor: nlColorOverride ?? project.themeColor,
      uploadedLogoUrl: project.logoUrl,
      productType: effectiveProductType,
    });
    // If user uploaded a custom font, patch typography to the loaded font-face name
    // so the preview actually renders the custom font instead of falling back
    if (project.fontUrl) {
      const customFamilyName = `ProjectFont-${project.id}`;
      merged.typography.heading = customFamilyName;
      merged.typography.body = customFamilyName;
    }
    return merged;
  }, [activeGenome, project?.font, project?.themeColor, project?.logoUrl, project?.fontUrl, project?.id, effectiveProductType, nlColorOverride]);

  const handleRegenerateStyle = useCallback(async () => {
    if (!project?.id) return;
    setIsRegenerating(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/project/${project.id}/regenerate-style`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const newGenome = data.genome ?? (data.project?.genomeJson ? JSON.parse(data.project.genomeJson) : null);
        if (newGenome) {
          setActiveGenome(newGenome);
          setNlColorOverride(null);
          setActiveSeed(data.styleSeed ?? data.project?.styleSeed ?? project.seed);
          setIteration(prev => prev + 1);
          queryClient.invalidateQueries({ queryKey: ["/api/project", params.id] });
        }
      } else if (res.status === 429) {
        const errData = await res.json();
        toast({ title: "Credit limit reached", description: errData.message, variant: "destructive" });
      }
    } catch (err) {
      console.error("Style regeneration failed:", err);
    } finally {
      setIsRegenerating(false);
    }
  }, [project?.id, params.id, getToken]);

  const handleRegenerateLayout = useCallback(async () => {
    if (!project?.id || !project?.seed || project.layoutLocked) return;
    setIsRegeneratingLayout(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/project/${project.id}/regenerate-layout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.layout) {
          setActiveLayout(data.layout);
        }
        setIteration(prev => prev + 1);
        queryClient.invalidateQueries({ queryKey: ["/api/project", params.id] });
      } else if (res.status === 429) {
        const errData = await res.json();
        toast({ title: "Credit limit reached", description: errData.message, variant: "destructive" });
      }
    } catch (err) {
      console.error("Layout regeneration failed:", err);
    } finally {
      setIsRegeneratingLayout(false);
    }
  }, [project?.id, project?.seed, project?.layoutLocked, params.id, getToken]);

  const layoutLockMutation = useMutation({
    mutationFn: async (locked: boolean) => {
      const token = await getToken();
      const res = await fetch(`/api/project/${params.id}/layout-lock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ locked }),
      });
      if (!res.ok) throw new Error("Failed to toggle layout lock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project", params.id] });
    },
  });

  const updateHtmlMutation = useMutation({
    mutationFn: async (html: string) => {
      await apiRequest("POST", `/api/project/${params.id}/update-html`, { html });
    },
    onSuccess: (_, html) => {
      setGeminiAppHtml(html);
      setShowCodeView(false);
      queryClient.invalidateQueries({ queryKey: ["/api/project", params.id] });
      toast({ title: "Code applied", description: "Your changes are now live in the preview." });
    },
    onError: () => {
      toast({ title: "Failed to apply code", variant: "destructive" });
    },
  });

  const handleNLApplied = useCallback((genome: DesignGenome, layout: LayoutGraph, contentPatch?: NLContentPatch | Record<string, string>) => {
    setActiveGenome(genome);
    setActiveLayout(layout);
    setIteration(0);
    if (project?.seed) setActiveSeed(project.seed);
    if (contentPatch && Object.keys(contentPatch).length > 0) {
      setContentOverrides(prev => ({ ...prev, ...contentPatch }));
    }
    // Override themeColor with NL-patched color so mergeDesignSources doesn't clobber it
    if (genome.colors?.primary) {
      setNlColorOverride(genome.colors.primary);
    }
  }, [project?.seed]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/project/${params.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete project");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project/list"] });
      toast({ title: "Project deleted", description: "Your project has been permanently removed." });
      navigate("/dashboard");
    },
    onError: (err) => {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const [showExportUpgrade, setShowExportUpgrade] = useState(false);

  const handleExport = useCallback(async () => {
    if (subscription?.plan !== "morse_black") {
      setShowExportUpgrade(true);
      return;
    }
    const token = await getToken();
    const url = `/api/export/project/${params.id}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) {
      try {
        const err = await res.json();
        if (err.requiresUpgrade) {
          setShowExportUpgrade(true);
          return;
        }
        toast({ title: "Export failed", description: err.message || "Could not generate the project zip.", variant: "destructive" });
      } catch {
        toast({ title: "Export failed", description: "Could not generate the project zip.", variant: "destructive" });
      }
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "morse-export"}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [params.id, getToken, project?.name, toast, subscription?.plan]);

  return (
  <>
    <SidebarProvider>
      <SidebarAutoCollapse canvasMode={canvasMode} />
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm z-10 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back"
              className="h-8 w-8 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {isLoading ? (
              <Skeleton className="h-5 w-40 flex-1" />
            ) : project ? (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {project.logoUrl && (
                    <img
                      src={project.logoUrl}
                      alt="Logo"
                      className="h-6 w-6 rounded object-contain border border-border shrink-0"
                    />
                  )}
                  <h1
                    className="text-sm font-semibold text-foreground truncate"
                    style={fontFamily ? { fontFamily } : {}}
                    data-testid="header-project-name"
                  >
                    {project.name}
                  </h1>
                  {project.themeColor && (
                    <div
                      className="h-3.5 w-3.5 rounded-full shrink-0 border border-border/50"
                      style={{ backgroundColor: project.themeColor }}
                    />
                  )}
                  <Badge variant="outline" className="text-xs gap-1 shrink-0 ml-1 hidden sm:flex">
                    <Hash className="h-2.5 w-2.5" />
                    SHA-256
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant={canvasMode ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => setCanvasMode(!canvasMode)}
                    data-testid="button-canvas-mode"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    {canvasMode ? "Exit Canvas" : "Canvas"}
                  </Button>
                  {geminiStatus === "ready" && (
                    <Button
                      variant={showCodeView ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => {
                        setLocalHtml(geminiAppHtml ?? "");
                        setShowCodeView(!showCodeView);
                      }}
                      data-testid="button-code-view"
                    >
                      {showCodeView ? <Eye className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                      {showCodeView ? "Preview" : "Code"}
                    </Button>
                  )}
                  {geminiStatus === "pending" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="gemini-status-pending">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating AI app…
                    </span>
                  )}
                  {geminiStatus === "ready" && (
                    <Badge variant="outline" className="gap-1 text-xs border-emerald-500/40 text-emerald-400" data-testid="gemini-status-ready">
                      <Bot className="h-3 w-3" />
                      AI Ready
                    </Badge>
                  )}
                  {(geminiStatus === "none" || geminiStatus === "failed") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => generateAppMutation.mutate()}
                      disabled={generateAppMutation.isPending}
                      data-testid="button-generate-ai-app"
                    >
                      {generateAppMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                      {geminiStatus === "failed" ? "Retry AI" : "Generate AI App"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={handleExport}
                    data-testid="button-export-project"
                  >
                    {subscription?.plan !== "morse_black" ? (
                      <Crown className="h-3.5 w-3.5 text-yellow-500" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Export App
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        data-testid="button-delete-project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{project.name}</strong> will be permanently deleted. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate()}
                          data-testid="button-confirm-delete"
                        >
                          {deleteMutation.isPending ? "Deleting…" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            ) : null}
          </header>

          {isLoading ? (
            <main className="flex-1 overflow-y-auto p-6">
              <ProjectSkeleton />
            </main>
          ) : error ? (
            <main className="flex-1 flex items-center justify-center p-6">
              <div className="flex flex-col items-center text-center max-w-sm">
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
            </main>
          ) : project ? (
            <div className="flex flex-1 overflow-hidden" data-testid="editor-layout">
              <LeftPanel
                project={project}
                activeGenome={displayGenome}
                activeLayout={activeLayout}
                activeSeed={activeSeed || project.seed}
                iteration={iteration}
                isRegenerating={isRegenerating}
                isRegeneratingLayout={isRegeneratingLayout}
                fontFamily={fontFamily}
                onRegenerateStyle={handleRegenerateStyle}
                onRegenerateLayout={handleRegenerateLayout}
                onToggleLayoutLock={() => layoutLockMutation.mutate(!project.layoutLocked)}
                onNLApplied={handleNLApplied}
                integrations={projectIntegrations}
                subscription={subscription}
              />

              <main className="flex-1 overflow-hidden bg-muted/10 flex flex-col" data-testid="section-website-preview">
                {canvasMode && displayGenome && activeLayout ? (
                  <CanvasEditor
                    genome={displayGenome}
                    layout={activeLayout}
                    projectName={project.name}
                    projectPrompt={project.prompt}
                    projectLogoUrl={project.logoUrl}
                    productType={effectiveProductType}
                    contentOverrides={contentOverrides}
                    onContentChange={setContentOverrides}
                    onLayoutChange={(newLayout) => setActiveLayout(newLayout)}
                    creditsUsed={project.nlCreditsUsed ?? 0}
                    creditLimit={subscription?.perProjectLimit ?? 500}
                    userPlan={subscription?.plan ?? "free"}
                    geminiAppHtml={safeGeminiHtml}
                  />
                ) : geminiStatus === "pending" ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8" data-testid="ai-generating-state">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Bot className="h-10 w-10 text-primary" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                    <div className="text-center max-w-xs">
                      <h3 className="font-semibold text-foreground text-lg mb-1">Building your app…</h3>
                      <p className="text-sm text-muted-foreground">
                        AI is generating a fully interactive application from your prompt. This takes about 30–60 seconds.
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 w-6 rounded-full bg-primary/30 animate-pulse"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : geminiStatus === "ready" && safeGeminiHtml ? (
                  showCodeView ? (
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0" data-testid="code-editor-view">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 shrink-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Code2 className="h-3.5 w-3.5" />
                          <span>HTML Source — edit directly and apply</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={async () => {
                              await navigator.clipboard.writeText(localHtml);
                              toast({ title: "Copied to clipboard" });
                            }}
                            data-testid="button-copy-html"
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => updateHtmlMutation.mutate(localHtml)}
                            disabled={updateHtmlMutation.isPending}
                            data-testid="button-apply-code"
                          >
                            {updateHtmlMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Apply Changes
                          </Button>
                        </div>
                      </div>
                      <textarea
                        value={localHtml}
                        onChange={e => setLocalHtml(e.target.value)}
                        className="flex-1 w-full font-mono text-xs resize-none border-0 outline-none bg-[#0d1117] text-[#e6edf3] leading-relaxed p-4 min-h-0"
                        spellCheck={false}
                        data-testid="textarea-html-editor"
                        style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}
                      />
                    </div>
                  ) : (
                    <iframe
                      srcDoc={safeGeminiHtml}
                      sandbox="allow-scripts allow-forms allow-popups"
                      className="flex-1 w-full border-0"
                      title="AI Generated App"
                      data-testid="ai-app-preview"
                    />
                  )
                ) : displayGenome && activeLayout ? (
                  <div className="flex-1 overflow-y-auto">
                    <GenomePreview
                      genome={displayGenome}
                      layout={activeLayout}
                      projectName={project.name}
                      projectPrompt={project.prompt}
                      projectLogoUrl={project.logoUrl}
                      productType={effectiveProductType}
                      contentOverrides={contentOverrides}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-64 p-8 text-center">
                    <Dna className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Preview loading…
                    </p>
                  </div>
                )}
              </main>
            </div>
          ) : null}
        </div>
      </div>
    </SidebarProvider>
    <UpgradeDialog open={showExportUpgrade} onOpenChange={setShowExportUpgrade} />
  </>
  );
}
