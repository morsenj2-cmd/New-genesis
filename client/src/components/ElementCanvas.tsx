import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { Lock, Unlock, Trash2, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import type { DesignGenome } from "@shared/genomeGenerator";
import type { LayoutGraph } from "@shared/layoutEngine";
import type { ContentOverrides } from "@/components/CanvasEditor";
import {
  type ElementNode,
  type SectionCanvas,
  type ElementContent,
  ELEMENT_CANVAS_WIDTH,
  ELEMENT_TYPE_LABELS,
  EDITABLE_TYPES,
  decomposeSection,
} from "@shared/elementCanvas";

const SNAP = 8;
function snap(n: number) { return Math.round(n / SNAP) * SNAP; }

// ── Element renderer ────────────────────────────────────────────────────────

function getBodyFont(genome: DesignGenome): string {
  return `'${genome.typography.body}', sans-serif`;
}
function getHeadFont(genome: DesignGenome): string {
  return `'${genome.typography.heading}', sans-serif`;
}

function ElementContent({ el, genome, sectionType, editing, onDoubleClick }: {
  el: ElementNode;
  genome: DesignGenome;
  sectionType: string;
  editing: boolean;
  onDoubleClick?: () => void;
}) {
  const G = genome;
  const body = getBodyFont(G);
  const head = getHeadFont(G);

  const common: React.CSSProperties = {
    width: "100%", height: "100%", userSelect: editing ? "text" : "none",
    pointerEvents: "none", overflow: "hidden",
  };

  switch (el.type) {
    case "badge":
      return (
        <div style={{ ...common, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{
            fontFamily: body, fontSize: "12px", fontWeight: 600,
            color: G.colors.accent, background: `${G.colors.accent}20`,
            border: `1px solid ${G.colors.accent}40`, borderRadius: G.radius.full,
            padding: "4px 14px", whiteSpace: "nowrap",
          }}>{el.content}</span>
        </div>
      );

    case "headline":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <h2 style={{
            margin: 0, fontFamily: head,
            fontSize: sectionType === "hero" ? G.typography.sizes["3xl"] : G.typography.sizes["2xl"],
            fontWeight: 800, color: sectionType === "cta" ? "#fff" : "#fff",
            lineHeight: 1.15, whiteSpace: "pre-wrap",
          }}>{el.content}</h2>
        </div>
      );

    case "subheadline":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <p style={{
            margin: 0, fontFamily: body,
            fontSize: G.typography.sizes.lg, color: G.colors.secondary,
            lineHeight: 1.6, whiteSpace: "pre-wrap",
          }}>{el.content}</p>
        </div>
      );

    case "paragraph":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <p style={{
            margin: 0, fontFamily: body,
            fontSize: G.typography.sizes.base,
            color: sectionType === "cta" ? "rgba(255,255,255,0.85)" : G.colors.secondary,
            lineHeight: 1.6,
          }}>{el.content}</p>
        </div>
      );

    case "section_title":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <h2 style={{
            margin: 0, fontFamily: head,
            fontSize: G.typography.sizes["2xl"], fontWeight: 800,
            color: "#fff", textAlign: "center",
          }}>{el.content}</h2>
        </div>
      );

    case "button_primary":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
          <span style={{
            fontFamily: body, fontSize: "14px", fontWeight: 600,
            color: "#fff", background: G.colors.primary,
            borderRadius: G.radius.md, padding: "10px 22px",
            whiteSpace: "nowrap", display: "inline-block",
          }}>{el.content}</span>
        </div>
      );

    case "button_secondary":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
          <span style={{
            fontFamily: body, fontSize: "14px", fontWeight: 600,
            color: G.colors.primary, background: "transparent",
            border: `1.5px solid ${G.colors.primary}`,
            borderRadius: G.radius.md, padding: "10px 22px",
            whiteSpace: "nowrap", display: "inline-block",
          }}>{el.content}</span>
        </div>
      );

    case "card_icon":
      return (
        <div style={{ ...common, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: G.radius.md,
            background: `${G.colors.primary}25`, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "18px",
          }}>{el.content ?? "⚡"}</div>
        </div>
      );

    case "card_title":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <p style={{
            margin: 0, fontFamily: head,
            fontSize: G.typography.sizes.base, fontWeight: 700, color: "#fff",
          }}>{el.content}</p>
        </div>
      );

    case "card_description":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <p style={{
            margin: 0, fontFamily: body,
            fontSize: G.typography.sizes.sm, color: G.colors.secondary,
            lineHeight: 1.55,
          }}>{el.content}</p>
        </div>
      );

    case "stat_value":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: "auto" }}>
          <span style={{
            fontFamily: head, fontSize: G.typography.sizes["2xl"],
            fontWeight: 800, color: G.colors.primary, lineHeight: 1,
          }}>{el.content}</span>
        </div>
      );

    case "stat_label":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, display: "flex", alignItems: "flex-start", justifyContent: "center", pointerEvents: "auto" }}>
          <span style={{
            fontFamily: body, fontSize: "11px", fontWeight: 600,
            color: G.colors.secondary, textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>{el.content}</span>
        </div>
      );

    case "testimonial_text":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <p style={{
            margin: 0, fontFamily: body, fontStyle: "italic",
            fontSize: G.typography.sizes.base, color: G.colors.secondary,
            lineHeight: 1.6,
          }}>{el.content}</p>
        </div>
      );

    case "testimonial_author":
      return (
        <div onDoubleClick={onDoubleClick} style={{ ...common, pointerEvents: "auto" }}>
          <p style={{
            margin: 0, fontFamily: body, fontSize: "13px",
            fontWeight: 600, color: "#fff",
          }}>{el.content}</p>
        </div>
      );

    default:
      return <div style={{ ...common, background: `${genome.colors.primary}15`, borderRadius: 4 }} />;
  }
}

// ── Resize handle directions ────────────────────────────────────────────────

const HANDLES = ["nw","n","ne","e","se","s","sw","w"] as const;
type HandleDir = typeof HANDLES[number];

function handleStyle(dir: HandleDir): React.CSSProperties {
  const half = 5;
  const pos: Record<string, Record<string, string | number>> = {
    nw: { top: -half, left: -half, cursor: "nw-resize" },
    n:  { top: -half, left: "50%", marginLeft: -half, cursor: "n-resize" },
    ne: { top: -half, right: -half, cursor: "ne-resize" },
    e:  { top: "50%", right: -half, marginTop: -half, cursor: "e-resize" },
    se: { bottom: -half, right: -half, cursor: "se-resize" },
    s:  { bottom: -half, left: "50%", marginLeft: -half, cursor: "s-resize" },
    sw: { bottom: -half, left: -half, cursor: "sw-resize" },
    w:  { top: "50%", left: -half, marginTop: -half, cursor: "w-resize" },
  };
  return {
    position: "absolute",
    width: 10, height: 10,
    background: "#fff",
    border: "2px solid #2563eb",
    borderRadius: 2,
    zIndex: 100,
    ...pos[dir],
  };
}

// ── Section background ──────────────────────────────────────────────────────

function sectionBg(sectionType: string, genome: DesignGenome): React.CSSProperties {
  const G = genome;
  switch (sectionType) {
    case "hero":
      return {
        background: `radial-gradient(ellipse at 50% 0%, ${G.colors.primary}22 0%, ${G.colors.background} 70%)`,
      };
    case "featureGrid":
    case "cardList":
      return { background: G.colors.surface };
    case "stats":
      return {
        background: G.colors.background,
        borderTop: `1px solid ${G.colors.primary}20`,
        borderBottom: `1px solid ${G.colors.primary}20`,
      };
    case "testimonial":
      return { background: G.colors.background };
    case "cta":
      return { background: `linear-gradient(135deg, ${G.colors.primary} 0%, ${G.colors.accent} 100%)` };
    default:
      return { background: G.colors.background };
  }
}

// ── Inline text edit overlay ────────────────────────────────────────────────

function InlineEditor({ el, genome, onSave, onCancel }: {
  el: ElementNode;
  genome: DesignGenome;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(el.content ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      onKeyDown={e => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSave(value); }
      }}
      style={{
        position: "absolute", inset: 0, background: "rgba(37,99,235,0.08)",
        border: "none", outline: "none", resize: "none",
        fontFamily: `'${genome.typography.heading}', sans-serif`,
        fontSize: "14px", color: "#fff", padding: "4px",
        zIndex: 200,
      }}
    />
  );
}

// ── Main ElementCanvas ──────────────────────────────────────────────────────

interface ElementCanvasProps {
  genome: DesignGenome;
  layout: LayoutGraph;
  contentOverrides?: ContentOverrides;
  onStateChange?: (state: ElementCanvasState) => void;
}

export interface ElementCanvasState {
  selectedEl: ElementNode | null;
  scale: number;
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export interface ElementCanvasHandle {
  updateElement: (id: string, patch: Partial<ElementNode>) => void;
  deleteElement: (id: string) => void;
  nudgeZIndex: (id: string, dir: 1 | -1) => void;
  setScale: (s: number) => void;
  getChanges: () => { sectionCanvases: SectionCanvas[] };
  resetChanges: () => void;
  duplicateElement: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

const ElementCanvas = forwardRef<ElementCanvasHandle, ElementCanvasProps>(function ElementCanvas({ genome, layout, contentOverrides, onStateChange }, ref) {
  // Build initial element content from contentOverrides
  const elemContent: ElementContent = {
    headline:          contentOverrides?.headline,
    subheadline:       contentOverrides?.subheadline,
    ctaLabel:          contentOverrides?.ctaLabel,
    secondaryCtaLabel: "See How It Works",
    ctaHeadline:       contentOverrides?.ctaHeadline ?? "Start building today",
    ctaBody:           contentOverrides?.ctaBody ?? "Free to start. No credit card required.",
    ctaButtonLabel:    contentOverrides?.ctaLabel,
    featureGridTitle:  contentOverrides?.featureGridTitle,
    cardListTitle:     contentOverrides?.cardListTitle,
    brandName:         contentOverrides?.brandName,
  };

  // Derive sections (skip footer/navbar — they sit outside the canvas)
  const editableSections = layout.sections.filter(s => (s.type as string) !== "footer" && (s.type as string) !== "navbar");

  const [sectionCanvases, setSectionCanvases] = useState<SectionCanvas[]>(() =>
    editableSections.map(s => decomposeSection(s, elemContent))
  );

  // Re-init when layout sections change (but keep user edits stable via ref guard)
  const initedRef = useRef(false);
  useEffect(() => {
    if (!initedRef.current) { initedRef.current = true; return; }
    setSectionCanvases(editableSections.map(s => decomposeSection(s, elemContent)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.sections.length]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.65);
  const [hasChanges, setHasChanges] = useState(false);

  const undoStack = useRef<SectionCanvas[][]>([]);
  const redoStack = useRef<SectionCanvas[][]>([]);
  const clipboard = useRef<ElementNode | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Pointer drag/resize state ─────────────────────────────────────────────
  type DragState = { id: string; secIdx: number; startMx: number; startMy: number; origX: number; origY: number };
  type ResizeState = { id: string; secIdx: number; handle: HandleDir; startMx: number; startMy: number; origX: number; origY: number; origW: number; origH: number };

  const drag   = useRef<DragState | null>(null);
  const resize = useRef<ResizeState | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const pushUndo = useCallback(() => {
    undoStack.current.push(JSON.parse(JSON.stringify(sectionCanvases)));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [sectionCanvases]);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(JSON.parse(JSON.stringify(sectionCanvases)));
    setSectionCanvases(prev);
  }, [sectionCanvases]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(JSON.parse(JSON.stringify(sectionCanvases)));
    setSectionCanvases(next);
  }, [sectionCanvases]);

  const findElement = useCallback((id: string): { el: ElementNode; secIdx: number } | null => {
    for (let si = 0; si < sectionCanvases.length; si++) {
      const el = sectionCanvases[si].elements.find(e => e.id === id);
      if (el) return { el, secIdx: si };
    }
    return null;
  }, [sectionCanvases]);

  const updateElement = useCallback((id: string, patch: Partial<ElementNode>) => {
    setSectionCanvases(prev => prev.map(sc => ({
      ...sc,
      elements: sc.elements.map(e => e.id === id ? { ...e, ...patch } : e),
    })));
    setHasChanges(true);
  }, []);

  const updateElementWithUndo = useCallback((id: string, patch: Partial<ElementNode>) => {
    pushUndo();
    updateElement(id, patch);
  }, [pushUndo, updateElement]);

  const deleteElement = useCallback((id: string) => {
    pushUndo();
    setSectionCanvases(prev => prev.map(sc => ({
      ...sc,
      elements: sc.elements.filter(e => e.id !== id),
    })));
    setSelectedId(null);
    setHasChanges(true);
  }, [pushUndo]);

  const duplicateElement = useCallback((id: string) => {
    const info = findElement(id);
    if (!info) return;
    pushUndo();
    const newEl: ElementNode = {
      ...JSON.parse(JSON.stringify(info.el)),
      id: `${info.el.id}-dup-${Date.now()}`,
      x: info.el.x + 16,
      y: info.el.y + 16,
    };
    setSectionCanvases(prev => prev.map((sc, si) =>
      si === info.secIdx ? { ...sc, elements: [...sc.elements, newEl] } : sc
    ));
    setSelectedId(newEl.id);
    setHasChanges(true);
  }, [findElement, pushUndo]);

  const selectedInfo = selectedId ? findElement(selectedId) : null;
  const selectedEl = selectedInfo?.el ?? null;

  // ── Global pointer move / up ──────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (drag.current) {
        const { id, startMx, startMy, origX, origY } = drag.current;
        const dx = (e.clientX - startMx) / scale;
        const dy = (e.clientY - startMy) / scale;
        updateElement(id, { x: snap(Math.max(0, origX + dx)), y: snap(Math.max(0, origY + dy)) });
      }
      if (resize.current) {
        const { id, handle, startMx, startMy, origX, origY, origW, origH } = resize.current;
        const dx = (e.clientX - startMx) / scale;
        const dy = (e.clientY - startMy) / scale;
        let nx = origX, ny = origY, nw = origW, nh = origH;
        if (handle.includes("e")) nw = snap(Math.max(32, origW + dx));
        if (handle.includes("s")) nh = snap(Math.max(16, origH + dy));
        if (handle.includes("w")) { nx = snap(origX + dx); nw = snap(Math.max(32, origW - dx)); }
        if (handle.includes("n")) { ny = snap(origY + dy); nh = snap(Math.max(16, origH - dy)); }
        updateElement(id, { x: nx, y: ny, width: nw, height: nh });
      }
    }
    function onUp() { drag.current = null; resize.current = null; }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [scale, updateElement]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const clipboardSecIdx = useRef<number>(0);

  useEffect(() => {
    function isInputFocused(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (!t) return false;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (t.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (isInputFocused(e)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (meta && e.key === "d" && selectedId) { e.preventDefault(); duplicateElement(selectedId); }
      if (meta && e.key === "c" && selectedId) {
        e.preventDefault();
        const info = findElement(selectedId);
        if (info) {
          clipboard.current = JSON.parse(JSON.stringify(info.el));
          clipboardSecIdx.current = info.secIdx;
        }
      }
      if (meta && e.key === "v" && clipboard.current) {
        e.preventDefault();
        const targetSecIdx = clipboardSecIdx.current;
        const pasteEl: ElementNode = {
          ...JSON.parse(JSON.stringify(clipboard.current)),
          id: `${clipboard.current.id}-paste-${Date.now()}`,
          x: clipboard.current.x + 24,
          y: clipboard.current.y + 24,
        };
        pushUndo();
        setSectionCanvases(prev => {
          const newCanvases = [...prev];
          const idx = targetSecIdx < newCanvases.length ? targetSecIdx : 0;
          if (newCanvases.length > 0) {
            newCanvases[idx] = { ...newCanvases[idx], elements: [...newCanvases[idx].elements, pasteEl] };
          }
          return newCanvases;
        });
        setSelectedId(pasteEl.id);
        setHasChanges(true);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !editingId) {
        e.preventDefault();
        deleteElement(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingId, undo, redo, duplicateElement, findElement, pushUndo, deleteElement]);

  // ── Element pointer down ──────────────────────────────────────────────────
  function startDrag(e: React.PointerEvent, el: ElementNode, secIdx: number) {
    if (el.locked || editingId) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(el.id);
    pushUndo();
    drag.current = { id: el.id, secIdx, startMx: e.clientX, startMy: e.clientY, origX: el.x, origY: el.y };
  }

  function startResize(e: React.PointerEvent, el: ElementNode, secIdx: number, handle: HandleDir) {
    if (el.locked) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pushUndo();
    resize.current = {
      id: el.id, secIdx, handle,
      startMx: e.clientX, startMy: e.clientY,
      origX: el.x, origY: el.y, origW: el.width, origH: el.height,
    };
  }

  function nudgeZIndex(id: string, dir: 1 | -1) {
    const info = findElement(id);
    if (!info) return;
    updateElement(id, { zIndex: Math.max(0, info.el.zIndex + dir) });
  }

  useImperativeHandle(ref, () => ({
    updateElement: updateElementWithUndo,
    deleteElement,
    nudgeZIndex,
    setScale,
    getChanges: () => ({ sectionCanvases }),
    resetChanges: () => setHasChanges(false),
    duplicateElement,
    undo,
    redo,
  }), [updateElementWithUndo, deleteElement, sectionCanvases, duplicateElement, undo, redo]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  useEffect(() => {
    onStateChange?.({ selectedEl, scale, hasChanges, canUndo, canRedo });
  }, [selectedEl, scale, hasChanges, onStateChange, canUndo, canRedo]);

  return (
    <div style={{ display: "flex", height: "100%", background: "#0a0a0a", overflow: "hidden" }}>
      <div
        ref={canvasRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "24px 32px" }}
        onClick={() => { setSelectedId(null); setEditingId(null); }}
      >
        <div
          style={{
            width: ELEMENT_CANVAS_WIDTH,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            marginBottom: `calc(${(scale - 1) * 100}%)`,
          }}
        >
          {sectionCanvases.map((sc, si) => (
            <SectionLayer
              key={`${sc.sectionType}-${si}`}
              sc={sc}
              genome={genome}
              selectedId={selectedId}
              editingId={editingId}
              onSelectEl={id => { setSelectedId(id); setEditingId(null); }}
              onStartDrag={startDrag}
              onStartResize={startResize}
              onEditStart={id => setEditingId(id)}
              onEditSave={(id, val) => { updateElement(id, { content: val }); setEditingId(null); }}
              onEditCancel={() => setEditingId(null)}
              secIdx={si}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default ElementCanvas;

// ── Section layer ─────────────────────────────────────────────────────────

interface SectionLayerProps {
  sc: SectionCanvas;
  genome: DesignGenome;
  selectedId: string | null;
  editingId: string | null;
  secIdx: number;
  onSelectEl: (id: string) => void;
  onStartDrag: (e: React.PointerEvent, el: ElementNode, si: number) => void;
  onStartResize: (e: React.PointerEvent, el: ElementNode, si: number, handle: HandleDir) => void;
  onEditStart: (id: string) => void;
  onEditSave: (id: string, val: string) => void;
  onEditCancel: () => void;
}

function SectionLayer({
  sc, genome, selectedId, editingId, secIdx,
  onSelectEl, onStartDrag, onStartResize,
  onEditStart, onEditSave, onEditCancel,
}: SectionLayerProps) {
  const bgStyle = sectionBg(sc.sectionType, genome);
  const G = genome;

  const sortedEls = [...sc.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      style={{
        position: "relative",
        width: ELEMENT_CANVAS_WIDTH,
        height: sc.height,
        overflow: "hidden",
        ...bgStyle,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Section label */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", paddingLeft: 8, paddingTop: 4,
        pointerEvents: "none", zIndex: 50,
      }}>
        <span style={{
          fontSize: 10, color: `${G.colors.primary}80`, textTransform: "uppercase",
          letterSpacing: "0.08em", background: `${G.colors.background}cc`,
          padding: "2px 6px", borderRadius: 3,
        }}>
          {sc.sectionType.replace(/([A-Z])/g, " $1").trim()}
        </span>
      </div>

      {/* Elements */}
      {sortedEls.map(el => {
        const isSelected = selectedId === el.id;
        const isEditing = editingId === el.id;
        const canEdit = EDITABLE_TYPES.has(el.type);

        return (
          <div
            key={el.id}
            data-testid={`canvas-element-${el.id}`}
            onPointerDown={e => {
              if (!isEditing) onStartDrag(e, el, secIdx);
            }}
            onClick={e => { e.stopPropagation(); onSelectEl(el.id); }}
            onDoubleClick={e => { e.stopPropagation(); if (canEdit) onEditStart(el.id); }}
            style={{
              position: "absolute",
              left: el.x, top: el.y,
              width: el.width, height: el.height,
              zIndex: el.zIndex,
              opacity: el.opacity ?? 1,
              cursor: el.locked ? "default" : isEditing ? "text" : "move",
              outline: isSelected ? `2px solid ${G.colors.primary}` : "none",
              outlineOffset: 2,
              userSelect: "none",
              borderRadius: 3,
            }}
          >
            {isEditing ? (
              <InlineEditor
                el={el}
                genome={genome}
                onSave={val => onEditSave(el.id, val)}
                onCancel={onEditCancel}
              />
            ) : (
              <ElementContent
                el={el}
                genome={genome}
                sectionType={sc.sectionType}
                editing={false}
              />
            )}

            {/* Lock indicator */}
            {el.locked && (
              <div style={{
                position: "absolute", top: 2, right: 2,
                background: `${G.colors.primary}30`, borderRadius: 2, padding: 2,
              }}>
                <Lock size={8} color={G.colors.primary} />
              </div>
            )}

            {/* Resize handles */}
            {isSelected && !el.locked && !isEditing && HANDLES.map(dir => (
              <div
                key={dir}
                style={handleStyle(dir)}
                onPointerDown={e => onStartResize(e, el, secIdx, dir)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

