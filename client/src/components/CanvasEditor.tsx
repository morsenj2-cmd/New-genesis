import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph, LayoutSection, SectionType } from "@shared/layoutEngine";
import { GenomePreview } from "@/components/genome-ui";
import ElementCanvas, { type ElementCanvasHandle, type ElementCanvasState } from "@/components/ElementCanvas";
import { ELEMENT_TYPE_LABELS, EDITABLE_TYPES } from "@shared/elementCanvas";
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
  ChevronUp,
  MousePointer2,
  Lock,
  Unlock,
  Save,
  Zap,
  Copy,
  Undo2,
  Redo2,
  Crown,
} from "lucide-react";

interface IframeSelectedElement {
  tag: string;
  text: string;
  xpath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const IFRAME_EDITOR_SCRIPT = `
<script data-morse-editor>
(function(){
  var selected = null;
  var overlay = null;
  var isDragging = false;
  var dragOffX = 0, dragOffY = 0;
  var hasChanges = false;
  var undoStack = [];
  var redoStack = [];

  function getXPath(el) {
    if (!el || el === document.body) return '/body';
    var sib = el.parentNode ? el.parentNode.children : [];
    var idx = 0;
    for (var i = 0; i < sib.length; i++) {
      if (sib[i] === el) { idx = i + 1; break; }
    }
    return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + idx + ']';
  }

  function elFromXPath(xpath) {
    try {
      var r = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return r.singleNodeValue;
    } catch(e) { return null; }
  }

  function createOverlay() {
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = '__morse_overlay';
    overlay.style.cssText = 'position:absolute;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);z-index:999999;transition:all 0.15s ease;';
    document.body.appendChild(overlay);
  }

  function positionOverlay(el) {
    if (!overlay || !el) return;
    var r = el.getBoundingClientRect();
    overlay.style.left = (r.left + window.scrollX) + 'px';
    overlay.style.top = (r.top + window.scrollY) + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  }

  function sendState() {
    if (!selected) {
      window.parent.postMessage({ type: 'morse-editor-select', element: null, hasChanges: hasChanges }, '*');
      return;
    }
    var r = selected.getBoundingClientRect();
    window.parent.postMessage({
      type: 'morse-editor-select',
      element: {
        tag: selected.tagName.toLowerCase(),
        text: selected.textContent ? selected.textContent.substring(0, 200) : '',
        xpath: getXPath(selected),
        x: Math.round(r.left + window.scrollX),
        y: Math.round(r.top + window.scrollY),
        width: Math.round(r.width),
        height: Math.round(r.height)
      },
      hasChanges: hasChanges
    }, '*');
  }

  function saveUndo() {
    undoStack.push(document.body.innerHTML);
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
    hasChanges = true;
    window.parent.postMessage({ type: 'morse-editor-changes', hasChanges: true, canUndo: undoStack.length > 0, canRedo: false }, '*');
  }

  function selectEl(el) {
    if (!el || el === document.body || el === document.documentElement || el.id === '__morse_overlay') return;
    // skip tiny/invisible elements
    var r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) { el = el.parentElement; if(!el) return; }
    selected = el;
    if (!overlay) createOverlay();
    positionOverlay(el);
    overlay.style.display = 'block';
    sendState();
  }

  function deselectEl() {
    selected = null;
    if (overlay) overlay.style.display = 'none';
    sendState();
  }

  // hover highlight
  var hoverEl = null;
  document.addEventListener('mousemove', function(e) {
    if (isDragging) return;
    var el = e.target;
    if (el.id === '__morse_overlay' || el === document.body || el === document.documentElement) return;
    if (el !== hoverEl) {
      if (hoverEl && hoverEl !== selected) hoverEl.style.outline = '';
      hoverEl = el;
      if (hoverEl !== selected) hoverEl.style.outline = '1px dashed rgba(59,130,246,0.4)';
    }
  });

  document.addEventListener('mouseleave', function() {
    if (hoverEl && hoverEl !== selected) hoverEl.style.outline = '';
    hoverEl = null;
  });

  // click to select
  document.addEventListener('click', function(e) {
    if (isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (el.id === '__morse_overlay') return;
    selectEl(el);
  }, true);

  // drag to move
  document.addEventListener('mousedown', function(e) {
    if (!selected || e.target.id === '__morse_overlay') return;
    if (e.target !== selected && !selected.contains(e.target)) return;
    e.preventDefault();
    isDragging = true;
    var r = selected.getBoundingClientRect();
    dragOffX = e.clientX - r.left;
    dragOffY = e.clientY - r.top;
    saveUndo();
    selected.style.position = selected.style.position || 'relative';
    if (!selected.style.position || selected.style.position === 'static') selected.style.position = 'relative';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging || !selected) return;
    e.preventDefault();
    var cs = getComputedStyle(selected);
    var curLeft = parseFloat(cs.left) || 0;
    var curTop = parseFloat(cs.top) || 0;
    var r = selected.getBoundingClientRect();
    var dx = e.clientX - (r.left + dragOffX);
    var dy = e.clientY - (r.top + dragOffY);
    selected.style.left = (curLeft + dx) + 'px';
    selected.style.top = (curTop + dy) + 'px';
    positionOverlay(selected);
  });

  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      if (selected) { positionOverlay(selected); sendState(); }
    }
  });

  // double click to edit text
  document.addEventListener('dblclick', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (el.id === '__morse_overlay') el = selected;
    if (!el || el === document.body) return;
    selectEl(el);
    if (el.children.length === 0 || (el.children.length <= 2 && el.textContent.length < 500)) {
      saveUndo();
      el.contentEditable = 'true';
      el.focus();
      el.style.outline = '2px solid #3b82f6';
      el.style.minHeight = '1em';
      var done = function() {
        el.contentEditable = 'false';
        el.style.outline = '';
        hasChanges = true;
        sendState();
      };
      el.addEventListener('blur', done, { once: true });
      el.addEventListener('keydown', function(ke) {
        if (ke.key === 'Escape' || ke.key === 'Enter') { ke.preventDefault(); el.blur(); }
      });
    }
  }, true);

  // delete key
  document.addEventListener('keydown', function(e) {
    if (document.querySelector('[contenteditable="true"]')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      e.preventDefault();
      saveUndo();
      selected.remove();
      selected = null;
      if (overlay) overlay.style.display = 'none';
      sendState();
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey && undoStack.length > 0) {
      e.preventDefault();
      redoStack.push(document.body.innerHTML);
      document.body.innerHTML = undoStack.pop();
      createOverlay();
      selected = null;
      sendState();
      window.parent.postMessage({ type: 'morse-editor-changes', hasChanges: true, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }, '*');
    }
    if (((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) && redoStack.length > 0) {
      e.preventDefault();
      undoStack.push(document.body.innerHTML);
      document.body.innerHTML = redoStack.pop();
      createOverlay();
      selected = null;
      sendState();
      window.parent.postMessage({ type: 'morse-editor-changes', hasChanges: true, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }, '*');
    }
  });

  // listen for parent commands
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.source !== 'morse-editor-cmd') return;
    if (e.data.cmd === 'undo' && undoStack.length > 0) {
      redoStack.push(document.body.innerHTML);
      document.body.innerHTML = undoStack.pop();
      createOverlay(); selected = null; sendState();
      window.parent.postMessage({ type: 'morse-editor-changes', hasChanges: true, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }, '*');
    }
    if (e.data.cmd === 'redo' && redoStack.length > 0) {
      undoStack.push(document.body.innerHTML);
      document.body.innerHTML = redoStack.pop();
      createOverlay(); selected = null; sendState();
      window.parent.postMessage({ type: 'morse-editor-changes', hasChanges: true, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 }, '*');
    }
    if (e.data.cmd === 'delete' && selected) {
      saveUndo(); selected.remove(); selected = null;
      if (overlay) overlay.style.display = 'none'; sendState();
    }
    if (e.data.cmd === 'select' && e.data.xpath) {
      var el = elFromXPath(e.data.xpath);
      if (el) selectEl(el);
    }
    if (e.data.cmd === 'getHtml') {
      if (overlay) overlay.remove();
      document.querySelectorAll('[contenteditable]').forEach(function(el) { el.removeAttribute('contenteditable'); });
      document.querySelectorAll('[style]').forEach(function(el) {
        var s = el.style;
        if (s.outline) s.outline = '';
        if (s.minHeight === '1em') s.minHeight = '';
        if (!el.getAttribute('style')) el.removeAttribute('style');
      });
      var scripts = document.querySelectorAll('script[data-morse-editor]');
      scripts.forEach(function(s){s.remove();});
      var html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
      createOverlay();
      window.parent.postMessage({ type: 'morse-editor-html', html: html }, '*');
    }
    if (e.data.cmd === 'updateText' && selected && e.data.text !== undefined) {
      saveUndo();
      selected.textContent = e.data.text;
      positionOverlay(selected);
      sendState();
    }
  });

  createOverlay();
  overlay.style.display = 'none';
  window.parent.postMessage({ type: 'morse-editor-ready' }, '*');
})();
</script>`;

export interface ContentOverrides {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  brandName?: string;
  featureGridTitle?: string;
  cardListTitle?: string;
  ctaHeadline?: string;
  ctaBody?: string;
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
  creditsUsed?: number;
  creditLimit?: number;
  userPlan?: string;
  geminiAppHtml?: string | null;
  onSaveHtml?: (html: string) => void;
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

type EditorMode = "auto" | "canvas" | "elements";

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
  creditsUsed = 0,
  creditLimit = 500,
  userPlan = "free",
  geminiAppHtml,
  onSaveHtml,
}: CanvasEditorProps) {
  const [mode, setMode] = useState<EditorMode>("canvas");
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const elementCanvasRef = useRef<ElementCanvasHandle>(null);
  const [elementState, setElementState] = useState<ElementCanvasState>({ selectedEl: null, scale: 0.65, hasChanges: false, canUndo: false, canRedo: false });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isElementsMode = mode === "elements";

  const iframeEditorRef = useRef<HTMLIFrameElement>(null);
  const [iframeSelectedEl, setIframeSelectedEl] = useState<IframeSelectedElement | null>(null);
  const [iframeHasChanges, setIframeHasChanges] = useState(false);
  const [iframeCanUndo, setIframeCanUndo] = useState(false);
  const [iframeCanRedo, setIframeCanRedo] = useState(false);
  const [iframeEditText, setIframeEditText] = useState("");
  const htmlSaveResolve = useRef<((html: string) => void) | null>(null);

  const editableHtml = useMemo(() => {
    if (!geminiAppHtml || !isElementsMode) return null;
    let html = geminiAppHtml;
    html = html.replace(/<script\s+data-morse-editor[\s\S]*?<\/script>/g, "");
    if (html.includes("</body>")) {
      return html.replace("</body>", IFRAME_EDITOR_SCRIPT + "\n</body>");
    }
    return html + IFRAME_EDITOR_SCRIPT;
  }, [geminiAppHtml, isElementsMode]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data.type !== "string") return;
      if (iframeEditorRef.current && e.source !== iframeEditorRef.current.contentWindow) return;
      if (e.data.type === "morse-editor-select") {
        setIframeSelectedEl(e.data.element || null);
        if (e.data.element) setIframeEditText(e.data.element.text || "");
        if (e.data.hasChanges !== undefined) setIframeHasChanges(e.data.hasChanges);
      }
      if (e.data.type === "morse-editor-changes") {
        setIframeHasChanges(e.data.hasChanges ?? false);
        setIframeCanUndo(e.data.canUndo ?? false);
        setIframeCanRedo(e.data.canRedo ?? false);
      }
      if (e.data.type === "morse-editor-html" && htmlSaveResolve.current) {
        htmlSaveResolve.current(e.data.html);
        htmlSaveResolve.current = null;
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const sendEditorCmd = useCallback((cmd: string, data?: Record<string, unknown>) => {
    iframeEditorRef.current?.contentWindow?.postMessage({ source: "morse-editor-cmd", cmd, ...data }, "*");
  }, []);

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

  const isCanvasMode   = mode === "canvas";

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
              Auto
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
            <button
              className={`flex-1 text-xs py-1.5 font-medium transition-colors flex items-center justify-center gap-1 ${
                mode === "elements"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => { setMode("elements"); setSelectedSectionIdx(null); }}
              data-testid="canvas-mode-elements"
            >
              <MousePointer2 className="h-2.5 w-2.5" />
              Elements
            </button>
          </div>
        </div>

        {/* Credit counter */}
        <div className="px-3 py-2 border-b border-border shrink-0" data-testid="canvas-credit-counter">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Credits</span>
                {userPlan === "morse_black" && (
                  <span className="flex items-center gap-0.5 text-[10px] text-yellow-500">
                    <Crown className="h-2.5 w-2.5" /> Black
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (creditsUsed / creditLimit) * 100)}%`,
                    background: creditsUsed >= creditLimit
                      ? "#ef4444"
                      : creditsUsed >= creditLimit * 0.8
                        ? "#f59e0b"
                        : "hsl(var(--primary))",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] font-medium ${
                  creditsUsed >= creditLimit ? "text-red-400" : "text-muted-foreground"
                }`}>
                  {creditLimit - creditsUsed} remaining
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {creditsUsed}/{creditLimit}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isElementsMode && geminiAppHtml && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!iframeCanUndo}
                  onClick={() => sendEditorCmd("undo")}
                  title="Undo (Ctrl+Z)"
                  data-testid="button-iframe-undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!iframeCanRedo}
                  onClick={() => sendEditorCmd("redo")}
                  title="Redo (Ctrl+Y)"
                  data-testid="button-iframe-redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <div className="flex-1" />
                {iframeSelectedEl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 px-2 text-destructive hover:text-destructive"
                    onClick={() => sendEditorCmd("delete")}
                    title="Delete element"
                    data-testid="button-iframe-delete"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {iframeSelectedEl ? (
              <div className="p-3 space-y-3 flex-1 overflow-y-auto" data-testid="iframe-element-panel">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  &lt;{iframeSelectedEl.tag}&gt;
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: "X", val: iframeSelectedEl.x },
                    { label: "Y", val: iframeSelectedEl.y },
                    { label: "W", val: iframeSelectedEl.width },
                    { label: "H", val: iframeSelectedEl.height },
                  ]).map(({ label, val }) => (
                    <label key={label} className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
                      <Input
                        type="number"
                        value={val}
                        readOnly
                        className="h-7 text-xs bg-muted/50"
                        data-testid={`text-iframe-${label.toLowerCase()}`}
                      />
                    </label>
                  ))}
                </div>

                {iframeSelectedEl.text && (
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">Text Content</span>
                    <Textarea
                      value={iframeEditText}
                      onChange={e => setIframeEditText(e.target.value)}
                      onBlur={() => sendEditorCmd("updateText", { text: iframeEditText })}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendEditorCmd("updateText", { text: iframeEditText }); }}}
                      rows={3}
                      className="text-xs resize-y"
                      data-testid="input-iframe-text"
                    />
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Tips:</strong> Drag to move. Double-click to edit text inline. Press Delete to remove.
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground mt-2 space-y-2">
                <MousePointer2 className="h-6 w-6 mx-auto opacity-20" />
                <p className="text-xs leading-relaxed">
                  <strong className="text-foreground">Visual editor active.</strong>
                  <br />
                  Click any element in the preview to select it.
                  <br />
                  Drag to move. Double-click to edit text.
                  <br />
                  Press Delete or Backspace to remove.
                </p>
              </div>
            )}

            {iframeHasChanges && (
              <div className="p-3 border-t border-border shrink-0">
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => {
                    sendEditorCmd("getHtml");
                    htmlSaveResolve.current = (html: string) => {
                      onSaveHtml?.(html);
                      setIframeHasChanges(false);
                      setSaveMessage("Changes saved");
                      setTimeout(() => setSaveMessage(null), 2000);
                    };
                  }}
                  data-testid="button-save-iframe-changes"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saveMessage || "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        )}

        {isElementsMode && !geminiAppHtml && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 py-2 border-b border-border space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs shrink-0">Zoom</span>
                <input
                  type="range" min={0.3} max={1.2} step={0.05}
                  value={elementState.scale}
                  onChange={e => elementCanvasRef.current?.setScale(Number(e.target.value))}
                  className="flex-1 accent-primary h-1"
                  data-testid="input-element-zoom"
                />
                <span className="text-xs text-foreground min-w-[36px] text-right">{Math.round(elementState.scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!elementState.canUndo}
                  onClick={() => elementCanvasRef.current?.undo()}
                  title="Undo (Ctrl+Z)"
                  data-testid="button-undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!elementState.canRedo}
                  onClick={() => elementCanvasRef.current?.redo()}
                  title="Redo (Ctrl+Y)"
                  data-testid="button-redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <div className="flex-1" />
                {elementState.selectedEl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 px-2"
                    onClick={() => elementState.selectedEl && elementCanvasRef.current?.duplicateElement(elementState.selectedEl.id)}
                    title="Duplicate (Ctrl+D)"
                    data-testid="button-duplicate"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </Button>
                )}
              </div>
            </div>

            {elementState.selectedEl ? (() => {
              const el = elementState.selectedEl!;
              const SNAP = 8;
              const snap = (n: number) => Math.round(n / SNAP) * SNAP;
              return (
                <div className="p-3 space-y-3 flex-1 overflow-y-auto" data-testid="element-properties-panel">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {ELEMENT_TYPE_LABELS[el.type]}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { label: "X", key: "x" as const },
                      { label: "Y", key: "y" as const },
                      { label: "W", key: "width" as const },
                      { label: "H", key: "height" as const },
                    ]).map(({ label, key }) => (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
                        <Input
                          type="number"
                          value={el[key] as number}
                          step={SNAP}
                          onChange={e => elementCanvasRef.current?.updateElement(el.id, { [key]: snap(Number(e.target.value)) })}
                          className="h-7 text-xs"
                          data-testid={`input-element-${key}`}
                        />
                      </label>
                    ))}
                  </div>

                  {EDITABLE_TYPES.has(el.type) && (
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block mb-1">Content</span>
                      <Textarea
                        value={el.content ?? ""}
                        onChange={e => elementCanvasRef.current?.updateElement(el.id, { content: e.target.value })}
                        rows={3}
                        className="text-xs resize-y"
                        data-testid="input-element-content"
                      />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1.5">Opacity</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={el.opacity ?? 1}
                        onChange={e => elementCanvasRef.current?.updateElement(el.id, { opacity: Number(e.target.value) })}
                        className="flex-1 accent-primary h-1"
                        data-testid="input-element-opacity"
                      />
                      <span className="text-xs text-foreground min-w-[32px] text-right">{Math.round((el.opacity ?? 1) * 100)}%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1.5">Layer Order</span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        onClick={() => elementCanvasRef.current?.nudgeZIndex(el.id, 1)}
                        data-testid="button-element-forward"
                      >
                        <ChevronUp className="h-3 w-3" /> Forward
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        onClick={() => elementCanvasRef.current?.nudgeZIndex(el.id, -1)}
                        data-testid="button-element-back"
                      >
                        <ChevronDown className="h-3 w-3" /> Back
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <Button
                      variant={el.locked ? "default" : "outline"}
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1"
                      onClick={() => elementCanvasRef.current?.updateElement(el.id, { locked: !el.locked })}
                      data-testid="button-element-lock"
                    >
                      {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      {el.locked ? "Locked" : "Lock"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => elementCanvasRef.current?.deleteElement(el.id)}
                      data-testid="button-element-delete"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })() : (
              <div className="p-4 text-center text-muted-foreground mt-2 space-y-2">
                <MousePointer2 className="h-6 w-6 mx-auto opacity-20" />
                <p className="text-xs leading-relaxed">
                  <strong className="text-foreground">Element editor active.</strong>
                  <br />
                  Click any element in the canvas to select it.
                  <br />
                  Drag to reposition. Double-click text to edit.
                </p>
              </div>
            )}

            {elementState.hasChanges && (
              <div className="p-3 border-t border-border shrink-0">
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => {
                    const changes = elementCanvasRef.current?.getChanges();
                    if (changes) {
                      const patch: Partial<ContentOverrides> = {};
                      for (const sc of changes.sectionCanvases) {
                        for (const el of sc.elements) {
                          if (el.content == null) continue;
                          if (el.type === "headline") patch.headline = el.content;
                          else if (el.type === "subheadline") patch.subheadline = el.content;
                          else if (el.type === "button_primary") patch.ctaLabel = el.content;
                          else if (el.type === "section_title" && sc.sectionType === "featureGrid") patch.featureGridTitle = el.content;
                          else if (el.type === "section_title" && sc.sectionType === "cardList") patch.cardListTitle = el.content;
                          else if (el.type === "headline" && sc.sectionType === "cta") patch.ctaHeadline = el.content;
                          else if (el.type === "paragraph" && sc.sectionType === "cta") patch.ctaBody = el.content;
                        }
                      }
                      onContentChange({ ...contentOverrides, ...patch });
                    }
                    elementCanvasRef.current?.resetChanges();
                    setSaveMessage("Changes saved");
                    setTimeout(() => setSaveMessage(null), 2000);
                  }}
                  data-testid="button-save-element-changes"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saveMessage || "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        )}

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

        {!isCanvasMode && !isElementsMode && (
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
        className="flex-1 overflow-hidden"
        data-testid="canvas-preview-area"
        onClick={() => { if (showAddMenu) setShowAddMenu(false); }}
      >
        {geminiAppHtml && isElementsMode && editableHtml ? (
          <iframe
            ref={iframeEditorRef}
            srcDoc={editableHtml}
            sandbox="allow-scripts allow-forms allow-popups"
            className="h-full w-full border-0"
            title="AI Generated App – Edit Mode"
            data-testid="canvas-ai-editor"
          />
        ) : geminiAppHtml ? (
          <iframe
            srcDoc={geminiAppHtml}
            sandbox="allow-scripts allow-forms allow-popups"
            className="h-full w-full border-0"
            title="AI Generated App"
            data-testid="canvas-ai-preview"
          />
        ) : isElementsMode ? (
          <ElementCanvas
            ref={elementCanvasRef}
            genome={genome}
            layout={layout}
            contentOverrides={contentOverrides}
            onStateChange={setElementState}
          />
        ) : (
          <div className="h-full overflow-y-auto">
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
        )}
      </div>
    </div>
  );
}
