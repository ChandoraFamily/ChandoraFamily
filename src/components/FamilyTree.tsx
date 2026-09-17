"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { FamilyTreeGraph, TreeNode } from "@/types/person";
import { fullName } from "@/lib/formatName";
import { useLanguage } from "@/lib/language-context";
import { useTheme, THEMES, type ThemeId } from "@/lib/theme-context";
import AnimatedBackground from "@/components/AnimatedBackground";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Sparkles,
  Palette,
  Download,
  Crown,
  Check,
  ChevronUp,
} from "lucide-react";

interface FamilyTreeProps {
  focusId: string;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  onSelectPerson: (personId: string) => void;
  onTreeLoaded?: () => void;
  onFocusAdmin?: () => void;
  adminPersonId?: string;
}

const CARD_W = 128;
const CARD_H = 48;
const GAP_Y = 82;
const SPOUSE_GAP = 15;
const SIBLING_GAP = 30;
const EXTRA_PER_SIBLING = 8;
const FAMILY_GAP = 56;
const LEVEL_GAP = CARD_H + GAP_Y;

function lifespan(node: TreeNode, lang: "en" | "hi" = "en") {
  const birth = node.person.birthDate?.slice(0, 4) ?? "?";
  const death = node.person.deathDate?.slice(0, 4);
  const presentText = lang === "hi" ? "वर्तमान" : "Present";
  return death ? `${birth}–${death}` : `${birth}–${presentText}`;
}

export default function FamilyTree({
  focusId,
  isAdmin,
  isLoggedIn,
  onSelectPerson,
  onTreeLoaded,
  onFocusAdmin,
  adminPersonId,
}: FamilyTreeProps) {
  const { lang, t } = useLanguage();
  const {
    theme,
    themeConfig,
    setTheme,
    backgroundAnimation,
    toggleBackgroundAnimation,
  } = useTheme();

  const [graph, setGraph] = useState<FamilyTreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [localFocusId, setLocalFocusId] = useState<string | null>(null);
  const [upDepth, setUpDepth] = useState(2);
  const [downDepth, setDownDepth] = useState(1);
  const [expandAncestors, setExpandAncestors] = useState(false);
  const [expandedAncestors, setExpandedAncestors] = useState<string[]>([]);
  const [expandedDescendants, setExpandedDescendants] = useState<string[]>([]);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const zoomMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const previousNodeIds = useRef<Set<string>>(new Set());
  const [newlyAddedNodeIds, setNewlyAddedNodeIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!graph) return;
    const currentIds = new Set(graph.nodes.map((n) => n.id));
    const newIds = new Set<string>();
    for (const id of currentIds) {
      if (!previousNodeIds.current.has(id)) {
        newIds.add(id);
      }
    }
    if (previousNodeIds.current.size > 0 && newIds.size > 0) {
      setNewlyAddedNodeIds(newIds);
      const timer = setTimeout(() => {
        setNewlyAddedNodeIds(new Set());
      }, 1500);
      return () => clearTimeout(timer);
    }
    previousNodeIds.current = currentIds;
  }, [graph]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        exportMenuOpen &&
        exportMenuRef.current &&
        !exportMenuRef.current.contains(target)
      ) {
        setExportMenuOpen(false);
      }
      if (
        zoomMenuOpen &&
        zoomMenuRef.current &&
        !zoomMenuRef.current.contains(target)
      ) {
        setZoomMenuOpen(false);
      }
      if (
        themeMenuOpen &&
        themeMenuRef.current &&
        !themeMenuRef.current.contains(target)
      ) {
        setThemeMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [exportMenuOpen, zoomMenuOpen, themeMenuOpen]);

  const dragState = useRef<{
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const pinchState = useRef<{
    initialDistance: number;
    initialScale: number;
    initialCenter: { x: number; y: number };
    initialTransform: { x: number; y: number };
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const rafId = useRef<number | null>(null);
  const liveTransform = useRef(transform);
  const hasUserPanned = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setContainerSize((prev) => {
          if (prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setExpandedAncestors([]);
    setExpandedDescendants([]);
    hasUserPanned.current = false;
    setGraph(null);
  }, [focusId]);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    fetch(`/api/persons/${focusId}/tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        up: upDepth,
        down: downDepth,
        expandAncestors,
        expandedAncestors,
        expandedDescendants,
      }),
    })
      .then(async (res) => {
        if (!res.ok)
          throw new Error((await res.json()).error ?? "Failed to load tree.");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setGraph(json.data as FamilyTreeGraph);
          setExpandingId(null);
          setIsOfflineCached(false);
          try {
            localStorage.setItem(
              `lineage_tree_v3_${focusId}`,
              JSON.stringify(json.data),
            );
            localStorage.setItem("lineage_last_focus", focusId);
          } catch {
            // ignore quota error
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          try {
            const cached = localStorage.getItem(`lineage_tree_v3_${focusId}`);
            if (cached) {
              const parsed = JSON.parse(cached) as FamilyTreeGraph;
              setGraph(parsed);
              setExpandingId(null);
              setIsOfflineCached(true);
              return;
            }
          } catch {
            // ignore cache parse failure
          }
          setError(err.message);
          setExpandingId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    focusId,
    upDepth,
    downDepth,
    expandAncestors,
    expandedAncestors,
    expandedDescendants,
  ]);

  useEffect(() => {
    liveTransform.current = transform;
  }, [transform]);

  useEffect(() => {
    if (!graph) return;
    const initialFocus = graph.nodes.find((node) => node.isFocus);
    setLocalFocusId(initialFocus?.id ?? null);
  }, [graph]);

  const onTreeLoadedRef = useRef(onTreeLoaded);
  useEffect(() => {
    onTreeLoadedRef.current = onTreeLoaded;
  }, [onTreeLoaded]);

  const layout = useMemo(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) return null;
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));

    const childrenIndex = new Map<string, Set<string>>();
    const hasParentInGraph = new Set<string>();
    for (const e of graph.edges) {
      if (e.type === "parent-child" && byId.has(e.from) && byId.has(e.to)) {
        if (!childrenIndex.has(e.from)) childrenIndex.set(e.from, new Set());
        childrenIndex.get(e.from)!.add(e.to);
        hasParentInGraph.add(e.to);
      }
    }

    const spouseEdges = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      if (e.type === "spouse" && byId.has(e.from) && byId.has(e.to)) {
        if (!spouseEdges.has(e.from)) spouseEdges.set(e.from, new Set());
        if (!spouseEdges.has(e.to)) spouseEdges.set(e.to, new Set());
        spouseEdges.get(e.from)!.add(e.to);
        spouseEdges.get(e.to)!.add(e.from);
      }
    }

    const unitMap = new Map<string, string>();
    const visitedSpouses = new Set<string>();

    for (const node of graph.nodes) {
      if (visitedSpouses.has(node.id)) continue;
      const cluster: string[] = [];
      const queue = [node.id];
      visitedSpouses.add(node.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        cluster.push(curr);
        const neighbors = spouseEdges.get(curr) || new Set();

        for (const n of neighbors) {
          const neighborNode = byId.get(n);
          if (
            !visitedSpouses.has(n) &&
            neighborNode &&
            neighborNode.generation === node.generation
          ) {
            visitedSpouses.add(n);
            queue.push(n);
          }
        }
      }
      const unitKey = cluster.sort().join("::");
      for (const id of cluster) {
        unitMap.set(id, unitKey);
      }
    }

    const unitKeyFor = (id: string): string => unitMap.get(id) || id;

    const unitMembers = (key: string): string[] => {
      const all = key.includes("::") ? key.split("::") : [key];
      const valid = all.filter((id) => byId.has(id));
      return valid.length > 0 ? valid : all;
    };

    const getUnitGeneration = (key: string): number => {
      const gens = unitMembers(key)
        .map((m) => byId.get(m)?.generation)
        .filter((g): g is number => typeof g === "number");
      return gens.length > 0 ? Math.min(...gens) : 0;
    };

    const childUnitsCache = new Map<string, string[]>();
    const childUnitsOf = (key: string): string[] => {
      if (childUnitsCache.has(key)) return childUnitsCache.get(key)!;
      const childIds = new Set<string>();
      for (const m of unitMembers(key)) {
        for (const c of childrenIndex.get(m) ?? []) {
          if (byId.has(c)) {
            childIds.add(c);
          }
        }
      }
      const sorted = Array.from(childIds).sort(
        (a, b) => (byId.get(a)?.slot ?? 0) - (byId.get(b)?.slot ?? 0),
      );
      const seen = new Set<string>();
      const units: string[] = [];
      for (const c of sorted) {
        const uk = unitKeyFor(c);
        if (!seen.has(uk)) {
          seen.add(uk);
          units.push(uk);
        }
      }
      childUnitsCache.set(key, units);
      return units;
    };

    const gapForGroup = (count: number) =>
      SIBLING_GAP + EXTRA_PER_SIBLING * Math.max(0, count - 3);

    const widthCache = new Map<string, number>();
    const widthStack = new Set<string>();

    const unitWidth = (key: string): number => {
      if (widthCache.has(key)) return widthCache.get(key)!;
      const members = unitMembers(key);
      const base = members.length * CARD_W + (members.length - 1) * SPOUSE_GAP;
      if (widthStack.has(key)) return base;
      widthStack.add(key);

      const childUnits = childUnitsOf(key);
      let width = base;
      if (childUnits.length > 0) {
        const gap = gapForGroup(childUnits.length);
        const sum = childUnits.reduce(
          (s, cu, i) => s + unitWidth(cu) + (i > 0 ? gap : 0),
          0,
        );
        width = Math.max(base, sum);
      }
      widthStack.delete(key);
      widthCache.set(key, width);
      return width;
    };

    const positions = new Map<string, { x: number; y: number }>();
    const placedUnits = new Set<string>();

    const placeUnit = (key: string, centerX: number, y: number) => {
      if (placedUnits.has(key)) return;
      placedUnits.add(key);

      const members = [...unitMembers(key)].sort(
        (a, b) => (byId.get(a)?.slot ?? 0) - (byId.get(b)?.slot ?? 0),
      );
      if (members.length === 0) return;

      if (members.length >= 2) {
        const totalW =
          members.length * CARD_W + (members.length - 1) * SPOUSE_GAP;
        let mx = centerX - totalW / 2;
        for (const m of members) {
          positions.set(m, { x: mx, y });
          mx += CARD_W + SPOUSE_GAP;
        }
      } else {
        positions.set(members[0], { x: centerX - CARD_W / 2, y });
      }
      const childUnits = childUnitsOf(key);
      if (childUnits.length === 0) return;

      const gap = gapForGroup(childUnits.length);
      const totalWidth = childUnits.reduce(
        (s, cu, i) => s + unitWidth(cu) + (i > 0 ? gap : 0),
        0,
      );

      let cursor = centerX - totalWidth / 2;

      for (const cu of childUnits) {
        const w = unitWidth(cu);
        const childGeneration = getUnitGeneration(cu);
        placeUnit(cu, cursor + w / 2, childGeneration * LEVEL_GAP);
        cursor += w + gap;
      }
    };

    const allUnitKeys = new Set(graph.nodes.map((n) => unitKeyFor(n.id)));
    let rootUnits = Array.from(allUnitKeys).filter((key) =>
      unitMembers(key).every((m) => !hasParentInGraph.has(m)),
    );
    if (rootUnits.length === 0 && allUnitKeys.size > 0) {
      const earliestGeneration = Math.min(
        ...graph.nodes.map((node) => node.generation),
      );
      rootUnits = Array.from(allUnitKeys).filter((key) =>
        unitMembers(key).some(
          (member) => byId.get(member)?.generation === earliestGeneration,
        ),
      );
    }

    rootUnits.sort((a, b) => {
      const ga = getUnitGeneration(a);
      const gb = getUnitGeneration(b);
      return ga !== gb ? ga - gb : 0;
    });

    const rootWidths = rootUnits.map(unitWidth);
    const totalRootWidth = rootWidths.reduce(
      (s, w, i) => s + w + (i > 0 ? FAMILY_GAP : 0),
      0,
    );
    let rootCursor = -totalRootWidth / 2;

    rootUnits.forEach((key, i) => {
      const w = rootWidths[i];
      const gen = getUnitGeneration(key);
      placeUnit(key, rootCursor + w / 2, gen * LEVEL_GAP);
      rootCursor += w + FAMILY_GAP;
    });

    for (const key of allUnitKeys) {
      if (placedUnits.has(key)) continue;

      const gen = getUnitGeneration(key);
      const w = unitWidth(key);

      placeUnit(key, rootCursor + w / 2, gen * LEVEL_GAP);
      rootCursor += w + FAMILY_GAP;
    }

    const minGen =
      graph.nodes.length > 0
        ? Math.min(...graph.nodes.map((n) => n.generation), 0)
        : 0;
    const maxGen =
      graph.nodes.length > 0
        ? Math.max(...graph.nodes.map((n) => n.generation), 0)
        : 0;
    const allX = Array.from(positions.values()).map((p) => p.x);
    const allY = Array.from(positions.values()).map((p) => p.y);
    const minX = allX.length > 0 ? Math.min(...allX, 0) : 0;
    const minY = allY.length > 0 ? Math.min(...allY, 0) : 0;
    const maxX = allX.length > 0 ? Math.max(...allX, 0) : 0;
    const maxY = allY.length > 0 ? Math.max(...allY, 0) : 0;
    const viewW = maxX - minX + CARD_W + 400;
    const viewH = maxY - minY + CARD_H + 400;
    const offsetX = -minX + 200;
    const offsetY = -minY + 200;

    return { positions, viewW, viewH, offsetX, offsetY };
  }, [graph]);

  const centerOnFocus = useCallback(() => {
    if (!layout) return;

    const focusPosition = layout.positions.get(focusId);
    if (!focusPosition) return;

    const el = containerRef.current;
    const viewportW =
      containerSize.width > 0
        ? containerSize.width
        : el?.clientWidth ||
          (typeof window !== "undefined" ? window.innerWidth : 1200);
    const viewportH =
      containerSize.height > 0
        ? containerSize.height
        : el?.clientHeight ||
          (typeof window !== "undefined" ? window.innerHeight : 800);

    const focusX = layout.offsetX + focusPosition.x + CARD_W / 2;
    const focusY = layout.offsetY + focusPosition.y + CARD_H / 2;

    const targetScale = 1;

    const next = {
      x: Math.round(viewportW / 2 - focusX * targetScale),
      y: Math.round(viewportH / 2 - focusY * targetScale),
      scale: targetScale,
    };

    setTransform(next);
    liveTransform.current = next;
    if (groupRef.current) {
      groupRef.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
    }
  }, [focusId, layout, containerSize]);

  useEffect(() => {
    if (layout && !hasUserPanned.current) {
      centerOnFocus();
      onTreeLoadedRef.current?.();
    }
  }, [layout, containerSize, centerOnFocus]);

  const zoomBounds = useMemo(() => {
    return { min: 0.15, max: 4 };
  }, []);

  const clampScale = useCallback(
    (s: number) => Math.min(zoomBounds.max, Math.max(zoomBounds.min, s)),
    [zoomBounds],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    hasUserPanned.current = true;

    if (activePointers.current.size === 1) {
      setIsDragging(true);
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        ox: liveTransform.current.x,
        oy: liveTransform.current.y,
      };
    } else if (activePointers.current.size === 2) {
      dragState.current = null;
      setIsDragging(true);
      const [p1, p2] = Array.from(activePointers.current.values());
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const ox = rect ? rect.left : 0;
      const oy = rect ? rect.top : 0;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      pinchState.current = {
        initialDistance: Math.max(dist, 1),
        initialScale: liveTransform.current.scale,
        initialCenter: {
          x: (p1.x + p2.x) / 2 - ox,
          y: (p1.y + p2.y) / 2 - oy,
        },
        initialTransform: {
          x: liveTransform.current.x,
          y: liveTransform.current.y,
        },
      };
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activePointers.current.has(e.pointerId)) return;
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.current.size >= 2 && pinchState.current) {
        const [p1, p2] = Array.from(activePointers.current.values());
        const el = containerRef.current;
        const rect = el?.getBoundingClientRect();
        const ox = rect ? rect.left : 0;
        const oy = rect ? rect.top : 0;

        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const currentCenter = {
          x: (p1.x + p2.x) / 2 - ox,
          y: (p1.y + p2.y) / 2 - oy,
        };

        const {
          initialDistance,
          initialScale,
          initialCenter,
          initialTransform,
        } = pinchState.current;
        const ratio = dist / initialDistance;
        const nextScale = clampScale(initialScale * ratio);
        const scaleRatio = nextScale / initialScale;

        const nextX =
          currentCenter.x - (initialCenter.x - initialTransform.x) * scaleRatio;
        const nextY =
          currentCenter.y - (initialCenter.y - initialTransform.y) * scaleRatio;

        const next = { x: nextX, y: nextY, scale: nextScale };
        liveTransform.current = next;

        if (rafId.current === null) {
          rafId.current = requestAnimationFrame(() => {
            if (groupRef.current) {
              groupRef.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
            }
            rafId.current = null;
          });
        }
        return;
      }

      if (!dragState.current) return;
      const { startX, startY, ox, oy } = dragState.current;
      const next = {
        x: ox + (e.clientX - startX),
        y: oy + (e.clientY - startY),
        scale: liveTransform.current.scale,
      };
      liveTransform.current = next;
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          if (groupRef.current) {
            groupRef.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
          }
          rafId.current = null;
        });
      }
    },
    [clampScale],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchState.current = null;
    }
    if (activePointers.current.size === 0) {
      dragState.current = null;
      setIsDragging(false);
      setTransform(liveTransform.current);
    } else if (activePointers.current.size === 1) {
      const pos = Array.from(activePointers.current.values())[0];
      dragState.current = {
        startX: pos.x,
        startY: pos.y,
        ox: liveTransform.current.x,
        oy: liveTransform.current.y,
      };
    }
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const pivotX = rect
        ? e.clientX - rect.left
        : (containerSize.width || 1200) / 2;
      const pivotY = rect
        ? e.clientY - rect.top
        : (containerSize.height || 800) / 2;

      const factor = Math.exp(-e.deltaY * 0.0015);

      setTransform((prev) => {
        const nextScale = clampScale(prev.scale * factor);
        if (Math.abs(nextScale - prev.scale) < 0.0001) return prev;

        const ratio = nextScale / prev.scale;
        const nextX = pivotX - (pivotX - prev.x) * ratio;
        const nextY = pivotY - (pivotY - prev.y) * ratio;

        const next = {
          x: nextX,
          y: nextY,
          scale: nextScale,
        };
        liveTransform.current = next;
        if (groupRef.current) {
          groupRef.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
        }
        return next;
      });
    },
    [clampScale, containerSize],
  );

  const zoomBy = useCallback(
    (delta: number) => {
      const el = containerRef.current;
      const viewportW =
        containerSize.width > 0
          ? containerSize.width
          : el?.clientWidth ||
            (typeof window !== "undefined" ? window.innerWidth : 1200);
      const viewportH =
        containerSize.height > 0
          ? containerSize.height
          : el?.clientHeight ||
            (typeof window !== "undefined" ? window.innerHeight : 800);

      const pivotX = viewportW / 2;
      const pivotY = viewportH / 2;

      setTransform((prev) => {
        const nextScale = clampScale(prev.scale + delta);
        if (Math.abs(nextScale - prev.scale) < 0.0001) return prev;

        const ratio = nextScale / prev.scale;
        const nextX = pivotX - (pivotX - prev.x) * ratio;
        const nextY = pivotY - (pivotY - prev.y) * ratio;

        const next = {
          x: nextX,
          y: nextY,
          scale: nextScale,
        };
        liveTransform.current = next;
        if (groupRef.current) {
          groupRef.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
        }
        return next;
      });
    },
    [clampScale, containerSize],
  );

  const fitToScreen = useCallback(() => {
    if (!layout) return;
    const el = containerRef.current;
    const viewportW =
      containerSize.width > 0
        ? containerSize.width
        : el?.clientWidth ||
          (typeof window !== "undefined" ? window.innerWidth : 1200);
    const viewportH =
      containerSize.height > 0
        ? containerSize.height
        : el?.clientHeight ||
          (typeof window !== "undefined" ? window.innerHeight : 800);

    const padding = 80;
    const availableW = Math.max(120, viewportW - padding * 2);
    const availableH = Math.max(120, viewportH - padding * 2);

    const treeW = Math.max(layout.viewW, 160);
    const treeH = Math.max(layout.viewH, 120);

    const scaleX = availableW / treeW;
    const scaleY = availableH / treeH;
    const targetScale = clampScale(
      Number(Math.min(scaleX, scaleY, 1.15).toFixed(2)),
    );

    const treeCenterX = layout.offsetX + treeW / 2;
    const treeCenterY = layout.offsetY + treeH / 2;

    const next = {
      x: Math.round(viewportW / 2 - treeCenterX * targetScale),
      y: Math.round(viewportH / 2 - treeCenterY * targetScale),
      scale: targetScale,
    };

    setTransform(next);
    liveTransform.current = next;
  }, [layout, containerSize, clampScale]);

  const setZoomLevel = useCallback(
    (targetScale: number) => {
      const el = containerRef.current;
      const viewportW =
        containerSize.width > 0
          ? containerSize.width
          : el?.clientWidth ||
            (typeof window !== "undefined" ? window.innerWidth : 1200);
      const viewportH =
        containerSize.height > 0
          ? containerSize.height
          : el?.clientHeight ||
            (typeof window !== "undefined" ? window.innerHeight : 800);

      const pivotX = viewportW / 2;
      const pivotY = viewportH / 2;

      setTransform((prev) => {
        const nextScale = clampScale(targetScale);
        if (Math.abs(nextScale - prev.scale) < 0.0001) return prev;

        const ratio = nextScale / prev.scale;
        const nextX = Math.round(pivotX - (pivotX - prev.x) * ratio);
        const nextY = Math.round(pivotY - (pivotY - prev.y) * ratio);

        const next = {
          x: nextX,
          y: nextY,
          scale: nextScale,
        };
        liveTransform.current = next;
        return next;
      });
      setZoomMenuOpen(false);
    },
    [clampScale, containerSize],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(0.2);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomBy(-0.2);
      } else if (e.key === "0") {
        e.preventDefault();
        centerOnFocus();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        fitToScreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomBy, centerOnFocus, fitToScreen]);

  const zoomToNode = useCallback(
    (nodeId: string) => {
      if (!layout) return;
      const pos = layout.positions.get(nodeId);
      if (!pos) return;

      const el = containerRef.current;
      const viewportW =
        containerSize.width > 0
          ? containerSize.width
          : el?.clientWidth ||
            (typeof window !== "undefined" ? window.innerWidth : 1200);
      const viewportH =
        containerSize.height > 0
          ? containerSize.height
          : el?.clientHeight ||
            (typeof window !== "undefined" ? window.innerHeight : 800);

      const targetScale = clampScale(1.4);

      const nodeCenterX = layout.offsetX + pos.x + CARD_W / 2;
      const nodeCenterY = layout.offsetY + pos.y + CARD_H / 2;

      const next = {
        x: Math.round(viewportW / 2 - nodeCenterX * targetScale),
        y: Math.round(viewportH / 2 - nodeCenterY * targetScale),
        scale: targetScale,
      };

      setTransform(next);
      liveTransform.current = next;
      if (groupRef.current) {
        groupRef.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
      }
    },
    [layout, clampScale, containerSize],
  );

  const handleExpandAncestors = useCallback((personId: string) => {
    setExpandingId(personId);
    setExpandedAncestors((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId],
    );
  }, []);

  const handleExpandDescendants = useCallback((personId: string) => {
    setExpandingId(personId);

    setExpandedDescendants((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId],
    );
  }, []);

  const triggerDownload = useCallback((url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 45000);
  }, []);

  const prepareExportSvg = useCallback(
    (scaleFactor = 2) => {
      if (!layout || !graph) return null;
      const svgEl = containerRef.current?.querySelector(
        "svg[data-tree-canvas='true']",
      );
      if (!svgEl) return null;

      const clone = svgEl.cloneNode(true) as SVGSVGElement;

      clone
        .querySelectorAll("[data-tree-expand-btn]")
        .forEach((btn) => btn.remove());

      const g = clone.querySelector("[data-export-root]") as SVGGElement | null;
      if (g) {
        g.removeAttribute("style");
        g.removeAttribute("transform");
      }

      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      clone.setAttribute("viewBox", `0 0 ${layout.viewW} ${layout.viewH}`);
      clone.removeAttribute("style");

      const maxDim = 4096;
      const maxArea = 16 * 1024 * 1024;
      let scale = scaleFactor;
      if (layout.viewW * scale > maxDim) {
        scale = maxDim / layout.viewW;
      }
      if (layout.viewH * scale > maxDim) {
        scale = Math.min(scale, maxDim / layout.viewH);
      }
      if (layout.viewW * layout.viewH * scale * scale > maxArea) {
        scale = Math.min(
          scale,
          Math.sqrt(maxArea / (layout.viewW * layout.viewH)),
        );
      }
      scale = Math.max(1, scale);

      const safeWidth = Math.round(layout.viewW * scale);
      const safeHeight = Math.round(layout.viewH * scale);

      clone.setAttribute("width", String(safeWidth));
      clone.setAttribute("height", String(safeHeight));

      const bgRect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      bgRect.setAttribute("width", "100%");
      bgRect.setAttribute("height", "100%");
      bgRect.setAttribute("fill", "#0a0e26");
      clone.insertBefore(bgRect, clone.firstChild);

      const focusNode = graph.nodes.find(
        (n) => n.id === (localFocusId || focusId),
      );
      const personName = focusNode
        ? fullName(focusNode.person, lang)
        : lang === "hi"
        ? "चंदोरा परिवार"
        : "Chandora Family";
      const cleanSlug = personName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const baseFilename = cleanSlug
        ? `family-tree-${cleanSlug}`
        : `family-tree-${focusId}`;

      const titleGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      titleGroup.setAttribute(
        "transform",
        `translate(${Math.round(layout.viewW / 2)}, 75)`,
      );

      const titleText = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      titleText.setAttribute("text-anchor", "middle");
      titleText.setAttribute("font-family", "'Source Serif 4', Georgia, serif");
      titleText.setAttribute("font-size", "26");
      titleText.setAttribute("font-weight", "700");
      titleText.setAttribute("fill", "#ffffff");
      titleText.textContent = "Chandora Family Tree";
      titleGroup.appendChild(titleText);

      const subText = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      subText.setAttribute("y", "26");
      subText.setAttribute("text-anchor", "middle");
      subText.setAttribute("font-family", "'Inter', system-ui, sans-serif");
      subText.setAttribute("font-size", "13");
      subText.setAttribute("font-weight", "400");
      subText.setAttribute("fill", "#8e9bb8");
      subText.textContent = `Focus: ${personName} · ${graph.nodes.length} individuals loaded`;
      titleGroup.appendChild(subText);

      clone.appendChild(titleGroup);

      let svgString = new XMLSerializer().serializeToString(clone);

      const rootStyles =
        typeof window !== "undefined"
          ? getComputedStyle(document.documentElement)
          : null;
      let displayFont =
        rootStyles?.getPropertyValue("--font-display").trim() ||
        "'Source Serif 4', Georgia, serif";
      let bodyFont =
        rootStyles?.getPropertyValue("--font-body").trim() ||
        "'Inter', system-ui, sans-serif";

      displayFont = displayFont.replace(/"/g, "'");
      bodyFont = bodyFont.replace(/"/g, "'");

      svgString = svgString
        .replace(/var\(--font-display\)/g, displayFont)
        .replace(/var\(--font-body\)/g, bodyFont);

      return {
        svgString,
        safeWidth,
        safeHeight,
        baseFilename,
      };
    },
    [layout, graph, focusId, localFocusId, lang],
  );

  const exportAsSvg = useCallback(async () => {
    setIsExporting(true);
    try {
      const prepared = prepareExportSvg(1);
      if (!prepared) return;
      const { svgString, baseFilename } = prepared;

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      triggerDownload(url, `${baseFilename}.svg`);
      setExportNotice("Exported as SVG vector graphic!");
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error("SVG export failed:", err);
      setExportNotice("Failed to export SVG file.");
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExporting(false);
    }
  }, [prepareExportSvg, triggerDownload]);

  const exportAsPng = useCallback(
    async (scaleFactor = 2) => {
      setIsExporting(true);
      try {
        const prepared = prepareExportSvg(scaleFactor);
        if (!prepared) {
          throw new Error("Could not prepare SVG tree for export");
        }
        const { svgString, safeWidth, safeHeight, baseFilename } = prepared;

        const dataUri =
          "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);

        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";

          const timer = setTimeout(() => {
            reject(new Error("Tree image rasterization timed out"));
          }, 15000);

          img.onload = () => {
            clearTimeout(timer);
            try {
              const canvas = document.createElement("canvas");
              canvas.width = safeWidth;
              canvas.height = safeHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                throw new Error("Unable to obtain 2D canvas context");
              }

              ctx.fillStyle = "#0a0e26";
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    console.warn(
                      "Canvas toBlob produced null, falling back to SVG",
                    );
                    const svgBlob = new Blob([svgString], {
                      type: "image/svg+xml;charset=utf-8",
                    });
                    const svgUrl = URL.createObjectURL(svgBlob);
                    triggerDownload(svgUrl, `${baseFilename}.svg`);
                    setExportNotice(
                      "Exported as SVG vector (browser memory limit).",
                    );
                    setTimeout(() => setExportNotice(null), 3500);
                    resolve();
                    return;
                  }
                  const pngUrl = URL.createObjectURL(blob);
                  triggerDownload(pngUrl, `${baseFilename}.png`);
                  setExportNotice("Family tree PNG exported successfully!");
                  setTimeout(() => setExportNotice(null), 3500);
                  resolve();
                },
                "image/png",
                0.95,
              );
            } catch (canvasErr) {
              reject(canvasErr);
            }
          };

          img.onerror = (err) => {
            clearTimeout(timer);
            reject(err);
          };

          img.src = dataUri;
        });
      } catch (err) {
        console.error(
          "PNG export encountered an issue, falling back to SVG:",
          err,
        );
        try {
          const fallbackPrepared = prepareExportSvg(1);
          if (fallbackPrepared) {
            const svgBlob = new Blob([fallbackPrepared.svgString], {
              type: "image/svg+xml;charset=utf-8",
            });
            const fallbackUrl = URL.createObjectURL(svgBlob);
            triggerDownload(
              fallbackUrl,
              `${fallbackPrepared.baseFilename}.svg`,
            );
            setExportNotice("Saved as SVG vector graphic.");
            setTimeout(() => setExportNotice(null), 3500);
          }
        } catch {
          setExportNotice("Could not export image. Please try again.");
          setTimeout(() => setExportNotice(null), 3500);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [prepareExportSvg, triggerDownload],
  );

  const exportAsImage = useCallback(
    async (scaleFactor = 2) => {
      return exportAsPng(scaleFactor);
    },
    [exportAsPng],
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0e26] text-slate-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!graph || !layout) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0e26] text-slate-500">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8a5cff] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#a77bff]" />
          </span>
          <p className="text-xs tracking-wide text-slate-400">Loading tree…</p>
        </div>
      </div>
    );
  }

  const cx = layout.offsetX;
  const cy = layout.offsetY;

  const relationLabel = (node: TreeNode) => {
    if (node.id === localFocusId)
      return lang === "hi" ? "परिवार प्रमुख" : "Head of Family";
    const hasSpouse = graph.edges.some(
      (e) => e.type === "spouse" && (e.from === node.id || e.to === node.id),
    );
    if (hasSpouse && node.generation === 0)
      return lang === "hi" ? "जीवनसाथी" : "Spouse";
    if (node.generation > 0) {
      return node.person.gender === "female"
        ? lang === "hi"
          ? "पुत्री"
          : "Daughter"
        : node.person.gender === "male"
        ? lang === "hi"
          ? "पुत्र"
          : "Son"
        : lang === "hi"
        ? "संतान"
        : "Child";
    }
    if (node.generation < 0) return lang === "hi" ? "पूर्वज" : "Ancestor";
    return lang === "hi" ? "परिवारजन" : "Family member";
  };

  const initialsFor = (node: TreeNode) => {
    if (lang === "hi" && node.person.hindiName?.trim()) {
      const parts = node.person.hindiName.trim().split(/\s+/);
      if (parts.length > 1) {
        return `${parts[0][0] || ""}${parts[1][0] || ""}`;
      }
      return node.person.hindiName.trim().slice(0, 2);
    }
    return `${node.person.firstName[0] ?? ""}${
      node.person.lastName
        ? node.person.lastName[0]
        : node.person.middleName
        ? node.person.middleName[0]
        : node.person.firstName[1] ?? ""
    }`.toUpperCase();
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-500"
      style={{
        backgroundColor: themeConfig.bodyBg,
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {/* Dynamic Animated Particle Constellation Background */}
      <AnimatedBackground />

      {/* Modern Floating Dock Controls */}
      <div
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-auto"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isOfflineCached && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-[#141b36]/95 px-3 py-1 text-[11px] font-medium text-amber-300 shadow-lg backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Offline Mode (Locally Cached)</span>
          </div>
        )}

        <div className="tree-glass-dock flex items-center rounded-2xl p-1 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5)]">
          {/* Zoom Out Button */}
          <button
            aria-label="Zoom out"
            onClick={() => zoomBy(-0.15)}
            className="tree-dock-btn h-10 w-10 rounded-xl"
            title="Zoom out (-)"
          >
            <ZoomOut size={18} />
          </button>

          {/* Zoom Percentage & Presets Trigger */}
          <div className="relative" ref={zoomMenuRef}>
            <button
              aria-label="Zoom presets"
              onClick={() => {
                setZoomMenuOpen((v) => !v);
                setThemeMenuOpen(false);
                setExportMenuOpen(false);
              }}
              className="flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              title="Click for Zoom Presets"
            >
              <span>{Math.round(transform.scale * 100)}%</span>
              <ChevronUp
                size={13}
                className={`transition-transform duration-200 ${
                  zoomMenuOpen ? "rotate-180 text-amber-400" : "text-slate-400"
                }`}
              />
            </button>

            {zoomMenuOpen && (
              <div className="tree-popover-enter absolute bottom-12 left-1/2 -translate-x-1/2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0a0f21]/95 p-1.5 shadow-2xl backdrop-blur-xl">
                <div className="px-2.5 py-1.5 border-b border-white/10 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Zoom Presets
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    fitToScreen();
                    setZoomMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-white/10 transition"
                >
                  <span className="flex items-center gap-2">
                    <Maximize2 size={13} />
                    <span>Fit to Screen</span>
                  </span>
                  <kbd className="rounded bg-black/40 px-1 py-0.5 text-[9px] text-slate-400">
                    F
                  </kbd>
                </button>
                <div className="my-1 border-t border-white/5" />
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => {
                  const isCurrent = Math.abs(transform.scale - s) < 0.08;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setZoomLevel(s)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                        isCurrent
                          ? "bg-[#8a5cff]/20 text-white font-semibold"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{Math.round(s * 100)}%</span>
                      {isCurrent && (
                        <Check size={13} className="text-[#8a5cff]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Zoom In Button */}
          <button
            aria-label="Zoom in"
            onClick={() => zoomBy(0.15)}
            className="tree-dock-btn h-10 w-10 rounded-xl"
            title="Zoom in (+)"
          >
            <ZoomIn size={18} />
          </button>

          <div className="mx-1 h-5 w-px bg-white/10" />

          {/* Reset / Center on Focus Person */}
          <button
            aria-label="Reset view"
            onClick={() => {
              hasUserPanned.current = false;
              centerOnFocus();
            }}
            className="tree-dock-btn h-10 w-10 rounded-xl"
            title="Center on focus person (0)"
          >
            <RotateCcw size={17} />
          </button>

          {/* Focus on Admin */}
          {onFocusAdmin && (
            <button
              aria-label="Focus on Admin"
              title="Focus tree on Admin"
              onClick={onFocusAdmin}
              className={`tree-dock-btn h-10 w-10 rounded-xl ${
                focusId === adminPersonId
                  ? "text-amber-400 bg-amber-500/15"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              <Crown size={18} />
            </button>
          )}

          <div className="mx-1 h-5 w-px bg-white/10" />

          {/* Animated Background Toggle */}
          <button
            aria-label="Toggle Animated Background"
            title={
              backgroundAnimation
                ? "Ambient particle animation is ON (Click to disable)"
                : "Ambient particle animation is OFF (Click to enable)"
            }
            onClick={toggleBackgroundAnimation}
            className={`tree-dock-btn h-10 w-10 rounded-xl relative ${
              backgroundAnimation
                ? "text-cyan-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sparkles size={17} />
            {backgroundAnimation && (
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            )}
          </button>

          {/* Theme Selector Popover Trigger */}
          <div className="relative" ref={themeMenuRef}>
            <button
              aria-label="Select Color Theme"
              title="Change Color Theme"
              onClick={() => {
                setThemeMenuOpen((v) => !v);
                setZoomMenuOpen(false);
                setExportMenuOpen(false);
              }}
              className={`tree-dock-btn h-10 w-10 rounded-xl ${
                themeMenuOpen ? "text-amber-400 bg-white/10" : ""
              }`}
            >
              <Palette size={18} />
            </button>

            {themeMenuOpen && (
              <div className="tree-popover-enter absolute bottom-12 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0a0f21]/95 p-2 shadow-2xl backdrop-blur-xl">
                <div className="px-2.5 py-1.5 border-b border-white/10 mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {lang === "hi" ? "रंग थीम चुनें" : "Color Theme"}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {Object.keys(THEMES).length} themes
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {Object.values(THEMES).map((tItem) => {
                    const isSelected = theme === tItem.id;
                    return (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => {
                          setTheme(tItem.id);
                          setThemeMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition ${
                          isSelected
                            ? "bg-white/15 text-white font-semibold ring-1 ring-white/20"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Color Swatch */}
                          <div
                            className="h-5 w-5 rounded-full shrink-0 border border-white/25 shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${tItem.primary}, ${tItem.accent})`,
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {lang === "hi" ? tItem.hindiLabel : tItem.label}
                            </p>
                            <p className="text-[9.5px] text-slate-400 truncate">
                              {tItem.description}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <Check
                            size={15}
                            className="shrink-0 text-amber-400 ml-2"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mx-1 h-5 w-px bg-white/10" />

          {/* Export Menu Trigger */}
          {isLoggedIn && isAdmin && (
            <div className="relative" ref={exportMenuRef}>
              <button
                aria-label="Export tree image"
                title="Export Tree as Image (PNG / SVG)"
                onClick={() => {
                  setExportMenuOpen((v) => !v);
                  setZoomMenuOpen(false);
                  setThemeMenuOpen(false);
                }}
                disabled={isExporting}
                className="tree-dock-btn h-10 w-10 rounded-xl disabled:opacity-50"
              >
                {isExporting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#8a5cff] border-t-transparent" />
                ) : (
                  <Download size={18} />
                )}
              </button>

              {exportMenuOpen && (
                <div className="tree-popover-enter absolute bottom-12 right-0 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0a0f21]/95 p-1.5 shadow-2xl backdrop-blur-xl">
                  <div className="px-2.5 py-1.5 border-b border-white/10 mb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Export Family Tree
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportAsPng(2);
                    }}
                    disabled={isExporting}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <span className="text-base">🖼</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">Download PNG</p>
                      <p className="text-[10px] text-slate-400">
                        High-resolution 2x image
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      exportAsSvg();
                    }}
                    disabled={isExporting}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <span className="text-base">📐</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">Download SVG</p>
                      <p className="text-[10px] text-slate-400">
                        Vector graphic for print
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {exportNotice && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[#8a5cff]/40 bg-[#0d132a]/95 px-4 py-2.5 text-xs font-medium text-slate-200 shadow-2xl backdrop-blur transition-all duration-200"
        >
          <span className="text-emerald-400">✓</span>
          <span>{exportNotice}</span>
        </div>
      )}

      <svg
        data-tree-canvas="true"
        width="100%"
        height="100%"
        className="relative z-10 block h-full w-full"
        style={{
          touchAction: "none",
          userSelect: "none",
          position: "relative",
          zIndex: 10,
        }}
      >
        <defs>
          <linearGradient id="lineageCard" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={themeConfig.cardBgStart} />
            <stop offset="100%" stopColor={themeConfig.cardBgEnd} />
          </linearGradient>
          <filter
            id="lineageShadow"
            x="-30%"
            y="-40%"
            width="160%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="6"
              floodColor="#000"
              floodOpacity="0.38"
            />
          </filter>
          <filter id="focusAura" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="8"
              floodColor="#f59e0b"
              floodOpacity="0.5"
            />
          </filter>
        </defs>

        <g
          ref={groupRef}
          data-export-root="true"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
            transition: isDragging
              ? "none"
              : "transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
          }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {graph.edges.map((edge, i) => {
              const from = layout.positions.get(edge.from);
              const to = layout.positions.get(edge.to);
              if (!from || !to) return null;

              const isEdgeNew =
                newlyAddedNodeIds.has(edge.from) ||
                newlyAddedNodeIds.has(edge.to);

              if (edge.type === "spouse") {
                const y = from.y + CARD_H / 2;
                const x1 = Math.min(from.x + CARD_W, to.x);
                const x2 = Math.max(from.x, to.x);
                return (
                  <g
                    key={`sp-${i}`}
                    className={isEdgeNew ? "tree-path-enter" : ""}
                  >
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke={themeConfig.spouseEdge || "#e64ba6"}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <circle
                      cx={(x1 + x2) / 2}
                      cy={y}
                      r={3.2}
                      fill={themeConfig.accent}
                    />
                  </g>
                );
              }

              const fx = from.x + CARD_W / 2;
              const fy = from.y + CARD_H;
              const tx = to.x + CARD_W / 2;
              const ty = to.y;
              const midY = (fy + ty) / 2;
              return (
                <path
                  key={`pc-${i}`}
                  d={`M ${fx} ${fy} L ${fx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`}
                  fill="none"
                  stroke={themeConfig.edgeStroke || "#d7d9e0"}
                  strokeWidth={2.6}
                  className={isEdgeNew ? "tree-path-enter" : ""}
                />
              );
            })}

            {graph.nodes.map((node, nodeIndex) => {
              const pos = layout.positions.get(node.id);
              const isFocus = node.id === localFocusId;
              if (!pos) return null;

              const isNewlyAdded = newlyAddedNodeIds.has(node.id);

              const accent = isFocus
                ? "#f59e0b"
                : node.person.gender === "female"
                ? "#ec4899"
                : node.person.gender === "male"
                ? themeConfig.accent
                : "#64748b";

              const accentText = isFocus
                ? "#f59e0b"
                : node.person.gender === "female"
                ? "#fbcfe8"
                : node.person.gender === "male"
                ? "#e0e7ff"
                : "#fff";

              const avatarFill = isFocus ? "#f59e0b" : accent;

              const name = fullName(node.person, lang);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x} ${pos.y})`}
                  className="outline-none focus:outline-none"
                >
                  {/* Card Body: Gentle in-place size change on hover without displacement */}
                  <g
                    className={`tree-node-card cursor-pointer outline-none focus:outline-none ${
                      isNewlyAdded ? "tree-node-enter" : ""
                    }`}
                    style={{
                      animationDelay: isNewlyAdded
                        ? `${Math.min(nodeIndex * 40, 360)}ms`
                        : undefined,
                    }}
                    onClick={() => {
                      onSelectPerson(node.id);
                      setLocalFocusId(node.id);
                    }}
                    onDoubleClick={() => zoomToNode(node.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        onSelectPerson(node.id);
                    }}
                  >
                    <rect
                      width={CARD_W}
                      height={CARD_H}
                      rx={15}
                      fill="url(#lineageCard)"
                      stroke={accent}
                      strokeWidth={isFocus ? 2.4 : 1.2}
                      filter={
                        isFocus ? "url(#focusAura)" : "url(#lineageShadow)"
                      }
                      className={isFocus ? "tree-focus-card" : ""}
                    />

                    {/* Golden Crown badge for current focus person */}
                    {isFocus && (
                      <g transform={`translate(${CARD_W - 20}, -4)`}>
                        <circle cx={7} cy={7} r={9} fill="#f59e0b" />
                        <path
                          d="M3.5 9.5 L4.5 5.5 L7 7.5 L9.5 5.5 L10.5 9.5 Z"
                          fill="#0c1228"
                        />
                      </g>
                    )}

                    <circle
                      cx={64}
                      cy={0}
                      r={17}
                      fill={avatarFill}
                      opacity={isFocus ? 1 : 0.98}
                    />
                    <text
                      x={64}
                      y={5}
                      fontFamily="var(--font-body)"
                      fontSize={11}
                      fontWeight={700}
                      fill={isFocus ? "#17182e" : accentText}
                      textAnchor="middle"
                    >
                      {initialsFor(node)}
                    </text>
                    <text
                      x={14}
                      y={35}
                      fontFamily="var(--font-display)"
                      fontSize={lang === "hi" ? 11.5 : 12}
                      fontWeight={lang === "hi" ? 600 : 500}
                      fill="#edf1ff"
                    >
                      {name.length > 15 ? `${name.slice(0, 14)}…` : name}
                    </text>

                    {/* {!isFocus && node.generation !== 0 && (
                      <text
                        x={CARD_W - 12}
                        y={18}
                        textAnchor="end"
                        fontFamily="var(--font-body)"
                        fontSize={8}
                        fill="#8997bd"
                      >
                        {lifespan(node, lang)}
                      </text>
                    )} */}
                  </g>

                  {/* Top expand button: Load earlier generation (parents / ancestors) */}
                  {node.hasMoreAncestors && (
                    <g
                      data-tree-expand-btn="true"
                      className="cursor-pointer transition-all duration-150 group/anc"
                      role="button"
                      tabIndex={0}
                      aria-label={
                        lang === "hi"
                          ? `${name} के पूर्वज दिखाएं`
                          : `Show ancestors for ${name}`
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpandAncestors(node.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          handleExpandAncestors(node.id);
                        }
                      }}
                    >
                      <title>
                        {lang === "hi"
                          ? `${name} के पूर्वज दिखाएं (+1 पीढ़ी${
                              node.unloadedAncestorsCount
                                ? `, ${node.unloadedAncestorsCount} परिजन`
                                : ""
                            })`
                          : `Show ancestors for ${name} (+1 generation${
                              node.unloadedAncestorsCount
                                ? `, ${node.unloadedAncestorsCount} parents`
                                : ""
                            })`}
                      </title>
                      {/* Subtle connecting stem */}
                      <line
                        x1={64}
                        y1={-17}
                        x2={64}
                        y2={-20}
                        stroke={themeConfig.accent}
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                      />
                      {/* Generous touch/click hit-target */}
                      <circle cx={64} cy={-28} r={16} fill="transparent" />

                      {/* Expanding Ripple Pulse Animation */}
                      {expandingId === node.id && (
                        <circle
                          cx={64}
                          cy={-28}
                          r={18}
                          fill="none"
                          stroke={themeConfig.accent}
                          className="tree-expand-pulse"
                        />
                      )}

                      {/* Circular button badge */}
                      <circle
                        cx={64}
                        cy={-28}
                        r={9.5}
                        fill="#0c1229"
                        stroke={
                          expandingId === node.id
                            ? themeConfig.accent
                            : "#8a5cff"
                        }
                        strokeWidth={1.5}
                        className="transition-all duration-150 group-hover/anc:stroke-amber-300 group-hover/anc:fill-[#1b234d]"
                      />
                      {/* Upward chevron */}
                      <path
                        d="M60.5 -26 L64 -29.8 L67.5 -26"
                        stroke={expandingId === node.id ? "#ffffff" : "#c4a5ff"}
                        strokeWidth={1.7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className="transition-colors duration-150 group-hover/anc:stroke-amber-300"
                      />
                    </g>
                  )}

                  {/* Bottom expand button: Load later generation (children / descendants) */}
                  {node.hasMoreDescendants && (
                    <g
                      data-tree-expand-btn="true"
                      className="cursor-pointer transition-all duration-150 group/desc"
                      role="button"
                      tabIndex={0}
                      aria-label={
                        lang === "hi"
                          ? `${name} के वंशज दिखाएं`
                          : `Show descendants for ${name}`
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpandDescendants(node.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          handleExpandDescendants(node.id);
                        }
                      }}
                    >
                      <title>
                        {lang === "hi"
                          ? `${name} के वंशज दिखाएं (+1 पीढ़ी${
                              node.unloadedDescendantsCount
                                ? `, ${node.unloadedDescendantsCount} संतान`
                                : ""
                            })`
                          : `Show descendants for ${name} (+1 generation${
                              node.unloadedDescendantsCount
                                ? `, ${node.unloadedDescendantsCount} children`
                                : ""
                            })`}
                      </title>
                      {/* Subtle connecting stem */}
                      <line
                        x1={64}
                        y1={CARD_H}
                        x2={64}
                        y2={CARD_H + 3}
                        stroke="#2563eb"
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                      />
                      {/* Generous touch/click hit-target */}
                      <circle
                        cx={64}
                        cy={CARD_H + 11}
                        r={16}
                        fill="transparent"
                      />

                      {/* Expanding Ripple Pulse Animation */}
                      {expandingId === node.id && (
                        <circle
                          cx={64}
                          cy={CARD_H + 11}
                          r={18}
                          fill="none"
                          stroke="#38bdf8"
                          className="tree-expand-pulse"
                        />
                      )}

                      {/* Circular button badge */}
                      <circle
                        cx={64}
                        cy={CARD_H + 11}
                        r={9.5}
                        fill="#0c1229"
                        stroke={expandingId === node.id ? "#93c5fd" : "#38bdf8"}
                        strokeWidth={1.5}
                        className="transition-all duration-150 group-hover/desc:stroke-amber-300 group-hover/desc:fill-[#14234c]"
                      />
                      {/* Downward chevron */}
                      <path
                        d="M60.5 57 L64 60.8 L67.5 57"
                        stroke={expandingId === node.id ? "#ffffff" : "#7dd3fc"}
                        strokeWidth={1.7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className="transition-colors duration-150 group-hover/desc:stroke-amber-300"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
