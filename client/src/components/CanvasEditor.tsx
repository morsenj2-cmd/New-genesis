import { useState, useCallback } from "react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph, LayoutSection } from "@shared/layoutEngine";
import { GenomePreview } from "@/components/genome-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ChevronUp,
  ChevronDown,
  Type,
  Layout,
  GripVertical,
  X,
} from "lucide-react";

export interface ContentOverrides {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  brandName?: string;
  featureGridTitle?: string;
  cardListTitle?: string;
}

interface CanvasEditorProps {
  genome: DesignGenome;
  layout: LayoutGraph;
  projectName: string;
  projectPrompt: string;
  projectLogoUrl?: string | null;
  productType?: string | null;
  contentOverrides: ContentOverrides;
  onContentChange: (overrides: ContentOverrides) => void;
  onLayoutChange: (layout: LayoutGraph) => void;
}

const SECTION_LABELS: Record<string, string> = {
  hero:        "Hero Section",
  featureGrid: "Feature Grid",
  cardList:    "Card List",
  stats:       "Stats Bar",
  testimonial: "Testimonials",
  cta:         "Call to Action",
  footer:      "Footer",
};

function EditPanel({
  selectedSection,
  layout,
  contentOverrides,
  onContentChange,
  onLayoutChange,
  onClose,
}: {
  selectedSection: number | null;
  layout: LayoutGraph;
  contentOverrides: ContentOverrides;
  onContentChange: (o: ContentOverrides) => void;
  onLayoutChange: (l: LayoutGraph) => void;
  onClose: () => void;
}) {
  const patchContent = useCallback((updates: Partial<ContentOverrides>) => {
    onContentChange({ ...contentOverrides, ...updates });
  }, [contentOverrides, onContentChange]);

  const patchLayout = useCallback((updates: Partial<LayoutSection>) => {
    if (selectedSection === null) return;
    const newSections = [...layout.sections];
    newSections[selectedSection] = { ...newSections[selectedSection], ...updates };
    onLayoutChange({ ...layout, sections: newSections });
  }, [layout, selectedSection, onLayoutChange]);

  if (selectedSection === null) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm mt-2">
        <Layout className="h-7 w-7 mx-auto mb-2 opacity-25" />
        <p className="text-xs">Select a section to edit its content.</p>
      </div>
    );
  }

  const section = layout.sections[selectedSection];
  if (!section) return null;

  const isHero = section.type === "hero";
  const isFeatureGrid = section.type === "featureGrid";
  const isCardList = section.type === "cardList";

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5" />
          {SECTION_LABELS[section.type] ?? section.type}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          data-testid="canvas-deselect"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {isHero && (
        <>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Headline</label>
            <Textarea
              value={contentOverrides.headline ?? ""}
              onChange={e => patchContent({ headline: e.target.value })}
              placeholder="Hero headline…"
              className="text-xs h-16 resize-none"
              data-testid="canvas-edit-headline"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subheadline</label>
            <Textarea
              value={contentOverrides.subheadline ?? ""}
              onChange={e => patchContent({ subheadline: e.target.value })}
              placeholder="Hero subheadline…"
              className="text-xs h-14 resize-none"
              data-testid="canvas-edit-subheadline"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">CTA Label</label>
            <Input
              value={contentOverrides.ctaLabel ?? ""}
              onChange={e => patchContent({ ctaLabel: e.target.value })}
              placeholder="Get Started"
              className="text-xs h-8"
              data-testid="canvas-edit-cta-label"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Brand Name</label>
            <Input
              value={contentOverrides.brandName ?? ""}
              onChange={e => patchContent({ brandName: e.target.value })}
              placeholder="Your brand name…"
              className="text-xs h-8"
              data-testid="canvas-edit-brand-name"
            />
          </div>
        </>
      )}

      {isFeatureGrid && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Section Title</label>
          <Input
            value={contentOverrides.featureGridTitle ?? ""}
            onChange={e => patchContent({ featureGridTitle: e.target.value })}
            placeholder="Feature section title…"
            className="text-xs h-8"
            data-testid="canvas-edit-feature-grid-title"
          />
        </div>
      )}

      {isCardList && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Section Title</label>
          <Input
            value={contentOverrides.cardListTitle ?? ""}
            onChange={e => patchContent({ cardListTitle: e.target.value })}
            placeholder="Card list title…"
            className="text-xs h-8"
            data-testid="canvas-edit-card-list-title"
          />
        </div>
      )}

      <Separator />
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Alignment</p>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map(align => (
            <Button
              key={align}
              variant={section.alignment === align ? "default" : "outline"}
              size="sm"
              className="h-6 text-xs px-2 flex-1"
              onClick={() => patchLayout({ alignment: align })}
              data-testid={`canvas-align-${align}`}
            >
              {align}
            </Button>
          ))}
        </div>
      </div>

      {!isHero && !isFeatureGrid && !isCardList && (
        <p className="text-xs text-muted-foreground italic pt-1">
          Select the hero section to edit page copy.
        </p>
      )}
    </div>
  );
}

export function CanvasEditor({
  genome,
  layout,
  projectName,
  projectPrompt,
  projectLogoUrl,
  productType,
  contentOverrides,
  onContentChange,
  onLayoutChange,
}: CanvasEditorProps) {
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const newSections = [...layout.sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    onLayoutChange({ ...layout, sections: newSections });
    setSelectedSectionIdx(index - 1);
  }, [layout, onLayoutChange]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= layout.sections.length - 1) return;
    const newSections = [...layout.sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    onLayoutChange({ ...layout, sections: newSections });
    setSelectedSectionIdx(index + 1);
  }, [layout, onLayoutChange]);

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <div
        className="w-56 shrink-0 border-r border-border overflow-y-auto bg-background flex flex-col"
        data-testid="canvas-edit-panel"
      >
        <div className="p-3 border-b border-border shrink-0">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            Canvas Editor
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {layout.sections.length} sections · reorder &amp; edit
          </p>
        </div>

        <div className="p-2 space-y-0.5 shrink-0">
          {layout.sections.map((section, i) => (
            <div
              key={`${section.type}-${i}`}
              className={`flex items-center gap-1 p-1.5 rounded cursor-pointer text-xs transition-colors ${
                selectedSectionIdx === i
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSelectedSectionIdx(selectedSectionIdx === i ? null : i)}
              data-testid={`canvas-section-${section.type}-${i}`}
            >
              <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
              <span className="flex-1 truncate">{SECTION_LABELS[section.type] ?? section.type}</span>
              <div className="flex gap-0.5 shrink-0">
                {i > 0 && (
                  <button
                    className="h-4 w-4 flex items-center justify-center rounded hover:bg-background"
                    onClick={e => { e.stopPropagation(); handleMoveUp(i); }}
                    title="Move up"
                    data-testid={`canvas-sidebar-up-${i}`}
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </button>
                )}
                {i < layout.sections.length - 1 && (
                  <button
                    className="h-4 w-4 flex items-center justify-center rounded hover:bg-background"
                    onClick={e => { e.stopPropagation(); handleMoveDown(i); }}
                    title="Move down"
                    data-testid={`canvas-sidebar-down-${i}`}
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />
        <div className="flex-1 overflow-y-auto">
          <EditPanel
            selectedSection={selectedSectionIdx}
            layout={layout}
            contentOverrides={contentOverrides}
            onContentChange={onContentChange}
            onLayoutChange={onLayoutChange}
            onClose={() => setSelectedSectionIdx(null)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" data-testid="canvas-preview-area">
        <GenomePreview
          genome={genome}
          layout={layout}
          projectName={projectName}
          projectPrompt={projectPrompt}
          projectLogoUrl={projectLogoUrl}
          productType={productType}
          contentOverrides={contentOverrides}
        />
      </div>
    </div>
  );
}
