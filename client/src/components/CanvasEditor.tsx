import { useState, useCallback, useRef } from "react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph, LayoutSection, SectionType } from "@shared/layoutEngine";
import { GenomePreview } from "@/components/genome-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  GripVertical,
  X,
  Plus,
  Trash2,
  Layout,
  Layers,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
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
  hero:        "Hero",
  featureGrid: "Feature Grid",
  cardList:    "Card List",
  stats:       "Stats Bar",
  testimonial: "Testimonials",
  cta:         "Call to Action",
  footer:      "Footer",
};

const SECTION_ICONS: Record<string, typeof Layout> = {
  hero:        Layout,
  featureGrid: Layers,
  cardList:    Layers,
  stats:       Layout,
  testimonial: Type,
  cta:         Type,
  footer:      Layout,
};

const ADDABLE_SECTIONS: { type: SectionType; label: string }[] = [
  { type: "featureGrid", label: "Feature Grid" },
  { type: "cardList",    label: "Card List" },
  { type: "stats",       label: "Stats Bar" },
  { type: "testimonial", label: "Testimonials" },
  { type: "cta",         label: "Call to Action" },
];

function makeSection(type: SectionType): LayoutSection {
  return {
    type,
    alignment: "center",
    imagePlacement: "none",
    orientation: "vertical",
    ...(type === "featureGrid" || type === "cardList" ? { columns: 3 } : {}),
    ...(type === "cardList" || type === "testimonial" ? { cardCount: 3 } : {}),
  };
}

function EditPanel({
  selectedSection,
  layout,
  contentOverrides,
  onContentChange,
  onLayoutChange,
  onDelete,
  onClose,
}: {
  selectedSection: number | null;
  layout: LayoutGraph;
  contentOverrides: ContentOverrides;
  onContentChange: (o: ContentOverrides) => void;
  onLayoutChange: (l: LayoutGraph) => void;
  onDelete: (idx: number) => void;
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
      <div className="p-4 text-center text-muted-foreground mt-2">
        <Layout className="h-6 w-6 mx-auto mb-2 opacity-20" />
        <p className="text-xs">Click a section to edit it.</p>
      </div>
    );
  }

  const section = layout.sections[selectedSection];
  if (!section) return null;

  const isHero = section.type === "hero";
  const isFeatureGrid = section.type === "featureGrid";
  const isCardList = section.type === "cardList";
  const isCta = section.type === "cta";
  const isDeletable = section.type !== "hero" && section.type !== "footer";

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5" />
          {SECTION_LABELS[section.type] ?? section.type}
        </p>
        <div className="flex items-center gap-1">
          {isDeletable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete(selectedSection)}
              title="Delete section"
              data-testid="canvas-delete-section"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
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
              placeholder="Supporting text…"
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
              className="text-xs h-7"
              data-testid="canvas-edit-cta-label"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Brand Name</label>
            <Input
              value={contentOverrides.brandName ?? ""}
              onChange={e => patchContent({ brandName: e.target.value })}
              placeholder="Your brand name…"
              className="text-xs h-7"
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
            className="text-xs h-7"
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
            className="text-xs h-7"
            data-testid="canvas-edit-card-list-title"
          />
        </div>
      )}

      {isCta && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">CTA Label</label>
          <Input
            value={contentOverrides.ctaLabel ?? ""}
            onChange={e => patchContent({ ctaLabel: e.target.value })}
            placeholder="Get Started"
            className="text-xs h-7"
            data-testid="canvas-edit-cta-label-2"
          />
        </div>
      )}

      <Separator />

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Alignment</p>
        <div className="flex gap-1">
          {([
            { value: "left",   Icon: AlignLeft },
            { value: "center", Icon: AlignCenter },
            { value: "right",  Icon: AlignRight },
          ] as const).map(({ value, Icon }) => (
            <Button
              key={value}
              variant={section.alignment === value ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 flex-1 gap-1"
              onClick={() => patchLayout({ alignment: value })}
              data-testid={`canvas-align-${value}`}
            >
              <Icon className="h-3 w-3" />
              <span className="text-xs">{value}</span>
            </Button>
          ))}
        </div>
      </div>

      {(isFeatureGrid || isCardList) && section.columns !== undefined && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Columns</p>
          <div className="flex gap-1">
            {[2, 3, 4].map(n => (
              <Button
                key={n}
                variant={section.columns === n ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 flex-1 text-xs"
                onClick={() => patchLayout({ columns: n })}
                data-testid={`canvas-columns-${n}`}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type EditorMode = "auto" | "canvas";

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
  const [mode, setMode] = useState<EditorMode>("canvas");
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // HTML5 drag-and-drop state
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx === null || fromIdx === targetIdx) {
      setDragOverIdx(null);
      return;
    }
    const newSections = [...layout.sections];
    const [moved] = newSections.splice(fromIdx, 1);
    newSections.splice(targetIdx, 0, moved);
    onLayoutChange({ ...layout, sections: newSections });
    setSelectedSectionIdx(targetIdx);
    dragIdx.current = null;
    setDragOverIdx(null);
  }, [layout, onLayoutChange]);

  const handleDragEnd = useCallback(() => {
    dragIdx.current = null;
    setDragOverIdx(null);
  }, []);

  const handleDeleteSection = useCallback((idx: number) => {
    const newSections = layout.sections.filter((_, i) => i !== idx);
    onLayoutChange({ ...layout, sections: newSections });
    setSelectedSectionIdx(null);
  }, [layout, onLayoutChange]);

  const handleAddSection = useCallback((type: SectionType) => {
    const footerIdx = layout.sections.findIndex(s => s.type === "footer");
    const insertAt = footerIdx >= 0 ? footerIdx : layout.sections.length;
    const newSections = [...layout.sections];
    newSections.splice(insertAt, 0, makeSection(type));
    onLayoutChange({ ...layout, sections: newSections });
    setSelectedSectionIdx(insertAt);
    setShowAddMenu(false);
  }, [layout, onLayoutChange]);

  const isCanvasMode = mode === "canvas";

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div
        className="w-56 shrink-0 border-r border-border overflow-y-auto bg-background flex flex-col"
        data-testid="canvas-edit-panel"
      >
        {/* Mode toggle */}
        <div className="p-2 border-b border-border shrink-0">
          <div className="flex rounded-md overflow-hidden border border-border">
            <button
              className={`flex-1 text-xs py-1.5 font-medium transition-colors ${
                mode === "auto"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => { setMode("auto"); setSelectedSectionIdx(null); }}
              data-testid="canvas-mode-auto"
            >
              Auto Design
            </button>
            <button
              className={`flex-1 text-xs py-1.5 font-medium transition-colors ${
                mode === "canvas"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setMode("canvas")}
              data-testid="canvas-mode-canvas"
            >
              Canvas
            </button>
          </div>
        </div>

        {isCanvasMode && (
          <>
            {/* Section count + add */}
            <div className="px-3 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs text-muted-foreground">{layout.sections.length} sections</span>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowAddMenu(v => !v)}
                  title="Add section"
                  data-testid="canvas-add-section-btn"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {showAddMenu && (
                  <div className="absolute right-0 top-7 z-50 bg-popover border border-border rounded-md shadow-lg py-1 w-40">
                    {ADDABLE_SECTIONS.map(({ type, label }) => (
                      <button
                        key={type}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                        onClick={() => handleAddSection(type)}
                        data-testid={`canvas-add-${type}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section list */}
            <div className="px-2 space-y-0.5 shrink-0">
              {layout.sections.map((section, i) => {
                const Icon = SECTION_ICONS[section.type] ?? Layout;
                const isDraggingOver = dragOverIdx === i && dragIdx.current !== null && dragIdx.current !== i;
                return (
                  <div
                    key={`${section.type}-${i}`}
                    draggable
                    onDragStart={e => handleDragStart(e, i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={e => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer text-xs transition-all select-none ${
                      selectedSectionIdx === i
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
                    } ${isDraggingOver ? "border-t-2 border-t-primary" : ""}`}
                    onClick={() => setSelectedSectionIdx(selectedSectionIdx === i ? null : i)}
                    data-testid={`canvas-section-${section.type}-${i}`}
                  >
                    <GripVertical className="h-3 w-3 shrink-0 opacity-40 cursor-grab" />
                    <Icon className="h-3 w-3 shrink-0 opacity-60" />
                    <span className="flex-1 truncate font-medium">
                      {SECTION_LABELS[section.type] ?? section.type}
                    </span>
                    {section.type !== "hero" && section.type !== "footer" && (
                      <button
                        className="h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                        onClick={e => { e.stopPropagation(); handleDeleteSection(i); }}
                        title="Remove"
                        data-testid={`canvas-remove-${i}`}
                        style={{ opacity: selectedSectionIdx === i ? 1 : undefined }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator className="my-2 shrink-0" />

            {/* Edit Panel */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <EditPanel
                selectedSection={selectedSectionIdx}
                layout={layout}
                contentOverrides={contentOverrides}
                onContentChange={onContentChange}
                onLayoutChange={onLayoutChange}
                onDelete={handleDeleteSection}
                onClose={() => setSelectedSectionIdx(null)}
              />
            </div>
          </>
        )}

        {!isCanvasMode && (
          <div className="p-4 text-center text-muted-foreground mt-4">
            <Layout className="h-7 w-7 mx-auto mb-2 opacity-20" />
            <p className="text-xs leading-relaxed">
              Auto Design mode — the AI manages your layout. Switch to Canvas to manually edit sections.
            </p>
          </div>
        )}
      </div>

      {/* ── Preview area ─────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        data-testid="canvas-preview-area"
        onClick={() => { if (showAddMenu) setShowAddMenu(false); }}
      >
        <GenomePreview
          genome={genome}
          layout={layout}
          projectName={projectName}
          projectPrompt={projectPrompt}
          projectLogoUrl={projectLogoUrl}
          productType={productType}
          contentOverrides={contentOverrides}
          selectedSectionIdx={isCanvasMode ? selectedSectionIdx : null}
          onSectionClick={isCanvasMode ? (idx) => setSelectedSectionIdx(idx) : undefined}
        />
      </div>
    </div>
  );
}
