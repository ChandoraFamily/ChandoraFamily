"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { FamilyTreeGraph, TreeNode } from "@/types/person";
import { fullName } from "@/lib/formatName";

interface FamilyTreeProps {
  focusId: string;
  isAdmin?: boolean;
  onSelectPerson: (personId: string) => void;
}

// Compact dimensions tuned to the dark genealogy-board design.
const CARD_W = 128;
const CARD_H = 48;
const GAP_Y = 82;
const SPOUSE_GAP = 15;
const SIBLING_GAP = 30;
const EXTRA_PER_SIBLING = 8;
const FAMILY_GAP = 56;
// const MAX_UNITS_PER_ROW = 8;
const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 800;
const LEVEL_GAP = CARD_H + GAP_Y;

// function fullName(node: TreeNode) {
//   return `${node.person.firstName} ${node.person.lastName}`;
// }

function lifespan(node: TreeNode) {
  const birth = node.person.birthDate?.slice(0, 4) ?? "?";
  const death = node.person.deathDate?.slice(0, 4);
  return death ? `${birth}–${death}` : `${birth}–Present`;
}

export default function FamilyTree({
  focusId,
  isAdmin,
  onSelectPerson,
}: FamilyTreeProps) {
  const [graph, setGraph] = useState<FamilyTreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [localFocusId, setLocalFocusId] = useState<string | null>(null);
  const [upDepth, setUpDepth] = useState(5);
  const [downDepth, setDownDepth] = useState(5);
  const [expandAncestors, setExpandAncestors] = useState(false);

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
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const rafId = useRef<number | null>(null);
  const liveTransform = useRef(transform);

  useEffect(() => {
    let cancelled = false;
    setGraph(null);
    setError(null);
    fetch(
      `/api/persons/${focusId}/tree?up=${upDepth}&down=${downDepth}&expandAncestors=${expandAncestors}`,
    )
      .then(async (res) => {
        if (!res.ok)
          throw new Error((await res.json()).error ?? "Failed to load tree.");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setGraph(json.data as FamilyTreeGraph);
        // setTransform({ x: 0, y: 0, scale: 1 });
        centerOnFocus();
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [focusId, upDepth, downDepth, expandAncestors]);

  // Recenter the view whenever a new tree loads.
  // useEffect(() => {
  //   if (graph) setTransform({ x: 0, y: 0, scale: 1 });
  // }, [graph?.focusId]);

  useEffect(() => {
    liveTransform.current = transform;
  }, [transform]);

  useEffect(() => {
    if (!graph) return;
    const initialFocus = graph.nodes.find((node) => node.isFocus);
    setLocalFocusId(initialFocus?.id ?? null);
  }, [graph]);

  const layout = useMemo(() => {
    if (!graph) return null;
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));

    // Direct children per parent (from parent-child edges).
    const childrenIndex = new Map<string, Set<string>>();
    const hasParentInGraph = new Set<string>();
    for (const e of graph.edges) {
      if (e.type === "parent-child") {
        if (!childrenIndex.has(e.from)) childrenIndex.set(e.from, new Set());
        childrenIndex.get(e.from)!.add(e.to);
        hasParentInGraph.add(e.to);
      }
    }

    // const onPointerDown = useCallback(
    //   (e: React.PointerEvent) => {
    //     setIsDragging(true); // Turn off animations during drag
    //     dragState.current = {
    //       startX: e.clientX,
    //       startY: e.clientY,
    //       ox: transform.x,
    //       oy: transform.y,
    //     };
    //     (e.target as Element).setPointerCapture(e.pointerId);
    //   },
    //   [transform],
    // );

    // Note: we can remove onPointerLeave from the div in the render block
    // since pointer capture handles leaves automatically on pointer up
    // const onPointerUp = useCallback(() => {
    //   dragState.current = null;
    //   setIsDragging(false); // Turn animations back on
    // }, []);

    // Pick one spouse per person (first spouse edge) so couples share a "unit".
    const spouseEdges = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      if (e.type === "spouse") {
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
          if (
            !visitedSpouses.has(n) &&
            byId.has(n) &&
            byId.get(n)!.generation === node.generation
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

    // const spouseOf = new Map<string, string>();
    // for (const e of graph.edges) {
    //   if (e.type === "spouse" && !spouseOf.has(e.from))
    //     spouseOf.set(e.from, e.to);
    // }
    // for (const [a, b] of Array.from(spouseOf.entries())) {
    //   if (!spouseOf.has(b)) spouseOf.set(b, a);
    // }

    // A "unit" is a person, or a person + spouse pair, treated as one block
    // for width/centering purposes. Key is sorted "a::b" for couples, or
    // just the id for a single person.
    // const unitKeyFor = (id: string): string => {
    //   const sp = spouseOf.get(id);
    //   if (
    //     sp &&
    //     byId.has(sp) &&
    //     byId.get(sp)!.generation === byId.get(id)!.generation
    //   ) {
    //     return [id, sp].sort().join("::");
    //   }
    //   return id;
    // };
    const unitMembers = (key: string): string[] =>
      key.includes("::") ? key.split("::") : [key];

    const childUnitsCache = new Map<string, string[]>();
    const childUnitsOf = (key: string): string[] => {
      if (childUnitsCache.has(key)) return childUnitsCache.get(key)!;
      const childIds = new Set<string>();
      for (const m of unitMembers(key)) {
        for (const c of childrenIndex.get(m) ?? []) childIds.add(c);
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

    // Bottom-up: how much horizontal room does this unit + all its
    // descendants need? A childless unit just needs its own card width(s);
    // a unit with children needs at least as much as its children's row.
    const widthCache = new Map<string, number>();
    const widthStack = new Set<string>();

    const unitWidth = (key: string): number => {
      if (widthCache.has(key)) return widthCache.get(key)!;
      const members = unitMembers(key);
      // const base = members.length === 2 ? CARD_W * 2 + SPOUSE_GAP : CARD_W;
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

    // Top-down: place each unit at centerX, then spread its children under
    // it — this is what makes a parent sit centered over however many kids
    // they have, and gives a 5-child family exactly the room 5 children need.
    const positions = new Map<string, { x: number; y: number }>();
    const placedUnits = new Set<string>();

    const placeUnit = (key: string, centerX: number, y: number) => {
      if (placedUnits.has(key)) return;
      placedUnits.add(key);

      const members = [...unitMembers(key)].sort(
        (a, b) => byId.get(a)!.slot - byId.get(b)!.slot,
      );
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

        const childGeneration = Math.min(
          ...unitMembers(cu).map((member) => byId.get(member)!.generation),
        );
        placeUnit(cu, cursor + w / 2, childGeneration * LEVEL_GAP);
        cursor += w + gap;
      }
    };

    // for (let i = 0; i < childUnits.length; i += MAX_UNITS_PER_ROW) {
    //   rows.push(childUnits.slice(i, i + MAX_UNITS_PER_ROW));
    // }

    // rows.forEach((rowUnits, rowIndex) => {
    //   const gap = gapForGroup(rowUnits.length);
    //   const totalWidth = rowUnits.reduce(
    //     (s, cu, i) => s + unitWidth(cu) + (i > 0 ? gap : 0),
    //     0,
    //   );
    //   let cursor = centerX - totalWidth / 2;
    //   const rowY = y + CARD_H + GAP_Y + rowIndex * (CARD_H + ROW_GAP);
    //   for (const cu of rowUnits) {
    //     const w = unitWidth(cu);
    //     placeUnit(cu, cursor + w / 2, rowY);
    //     cursor += w + gap;
    //   }
    // });

    // const placeUnit = (key: string, centerX: number) => {
    //   if (placedUnits.has(key)) return;
    //   placedUnits.add(key);

    //   const members = unitMembers(key);
    //   const y = byId.get(members[0])!.generation * (CARD_H + GAP_Y);
    //   const sortedMembers = [...members].sort(
    //     (a, b) => (byId.get(a)?.slot ?? 0) - (byId.get(b)?.slot ?? 0),
    //   );
    //   const baseWidth =
    //     members.length * CARD_W + (members.length - 1) * SPOUSE_GAP;
    //   let startX = centerX - baseWidth / 2 + CARD_W / 2;
    //   for (let i = 0; i < sortedMembers.length; i++) {
    //     positions.set(sortedMembers[i], { x: startX, y });
    //     startX += CARD_W + SPOUSE_GAP;
    //   }
    //   // if (members.length === 2) {
    //   //   const [a, b] = members;
    //   //   const [left, right] =
    //   //     byId.get(a)!.slot <= byId.get(b)!.slot ? [a, b] : [b, a];
    //   //   positions.set(left, { x: centerX - (CARD_W + SPOUSE_GAP) / 2, y });
    //   //   positions.set(right, { x: centerX + SPOUSE_GAP / 2, y });
    //   // } else {
    //   //   positions.set(members[0], { x: centerX - CARD_W / 2, y });
    //   // }
    //   const childUnits = childUnitsOf(key);
    //   if (childUnits.length === 0) return;
    //   const gap = gapForGroup(childUnits.length);
    //   const totalWidth = childUnits.reduce(
    //     (s, cu, i) => s + unitWidth(cu) + (i > 0 ? gap : 0),
    //     0,
    //   );
    //   let cursor = centerX - totalWidth / 2;
    //   for (const cu of childUnits) {
    //     const w = unitWidth(cu);
    //     placeUnit(cu, cursor + w / 2);
    //     cursor += w + gap;
    //   }
    // };

    // Roots = units where nobody in the graph is their parent.
    const allUnitKeys = new Set(graph.nodes.map((n) => unitKeyFor(n.id)));
    // const rootUnits = Array.from(allUnitKeys).filter((key) =>
    //   unitMembers(key).every((m) => !hasParentInGraph.has(m)),
    // );
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
      const ga = Math.min(
        ...unitMembers(a).map((m) => byId.get(m)!.generation),
      );
      const gb = Math.min(
        ...unitMembers(b).map((m) => byId.get(m)!.generation),
      );
      return ga !== gb ? ga - gb : 0;
    });

    const rootWidths = rootUnits.map(unitWidth);
    const totalRootWidth = rootWidths.reduce(
      (s, w, i) => s + w + (i > 0 ? FAMILY_GAP : 0),
      0,
    );
    let rootCursor = -totalRootWidth / 2;
    // rootUnits.forEach((key, i) => {
    //   const w = rootWidths[i];
    //   const gen = Math.min(...unitMembers(key).map((m)=> byId.get(m)!.generation));
    //   placeUnit(key, rootCursor)
    //   rootCursor += w + FAMILY_GAP;
    // });

    rootUnits.forEach((key, i) => {
      const w = rootWidths[i];
      const gen = Math.min(
        ...unitMembers(key).map((m) => byId.get(m)!.generation),
      );
      placeUnit(key, rootCursor + w / 2, gen * LEVEL_GAP);
      rootCursor += w + FAMILY_GAP;
    });

    for (const key of allUnitKeys) {
      if (placedUnits.has(key)) continue;

      const gen = Math.min(
        ...unitMembers(key).map((m) => byId.get(m)!.generation),
      );
      const w = unitWidth(key);

      // placeUnit(key, rootCursor + w / 2, gen * (CARD_H + GAP_Y));
      placeUnit(key, rootCursor + w / 2, gen * LEVEL_GAP);
      rootCursor += w + FAMILY_GAP;
    }

    const minGen = Math.min(...graph.nodes.map((n) => n.generation), 0);
    const maxGen = Math.max(...graph.nodes.map((n) => n.generation), 0);
    const allX = Array.from(positions.values()).map((p) => p.x);
    const allY = Array.from(positions.values()).map((p) => p.y);
    const minX = Math.min(...allX, 0);
    const minY = Math.min(...allY, 0);
    const viewW = Math.max(...allX, 0) - minX + CARD_W + 400;
    // const viewH = (maxGen - minGen + 1) * (CARD_H + GAP_Y) + 200;
    const viewH = Math.max(...allY, 0) - minY + CARD_H + 400;
    const offsetX = -minX + 200;
    const offsetY = -minY + 200;

    // return { positions, viewW, viewH, minGen, maxGen };
    return { positions, viewW, viewH, offsetX, offsetY };
  }, [graph]);

  const centerOnFocus = useCallback(() => {
    if (!layout) return;

    const focusPosition = layout.positions.get(focusId);
    if (!focusPosition) return;

    const focusX = layout.offsetX + focusPosition.x + CARD_W / 2;

    const focusY = layout.offsetY + focusPosition.y + CARD_H / 2;

    setTransform({
      x: VIEWBOX_WIDTH / 2 - focusX,
      y: VIEWBOX_HEIGHT / 2 - focusY,
      scale: 1,
    });
  }, [focusId, layout]);

  useEffect(() => {
    centerOnFocus();
  }, [centerOnFocus]);

  // Zoom range depends on the currently-loaded graph: scale 1 = whole tree
  // fits (that's how viewW/viewH were sized), and the max scale is whatever
  // makes one card roughly fill the viewport.
  const zoomBounds = useMemo(() => {
    if (!layout) return { min: 1, max: 3 };
    const max = Math.max(
      2.5,
      Math.min(layout.viewW / CARD_W, layout.viewH / CARD_H) * 0.9,
    );
    return { min: 0.05, max: 50 };
  }, [layout]);

  const clampScale = useCallback(
    (s: number) => Math.min(zoomBounds.max, Math.max(zoomBounds.min, s)),
    [zoomBounds],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
      const [p1, p2] = Array.from(activePointers.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      pinchState.current = {
        initialDistance: dist,
        initialScale: liveTransform.current.scale,
      };
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activePointers.current.has(e.pointerId)) return;
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.current.size >= 2 && pinchState.current) {
        const [p1, p2] = Array.from(activePointers.current.values());
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const ratio = dist / pinchState.current.initialDistance;
        const nextScale = clampScale(pinchState.current.initialScale * ratio);
        liveTransform.current = { ...liveTransform.current, scale: nextScale };
        if (groupRef.current) {
          groupRef.current.style.transform = `translate(${liveTransform.current.x}px, ${liveTransform.current.y}px) scale(${nextScale})`;
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
      const [id, pos] = Array.from(activePointers.current.entries())[0];
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
      setTransform((t) => ({
        ...t,
        scale: clampScale(t.scale - e.deltaY * 0.001),
      }));
    },
    [clampScale],
  );

  const zoomToNode = useCallback(
    (nodeId: string) => {
      if (!layout) return;
      const pos = layout.positions.get(nodeId);
      if (!pos) return;

      const targetScale = clampScale(zoomBounds.max * 0.75); // Set desired zoom level (1.5x)

      // Find the center point of the clicked card
      const nodeCenterX = pos.x + CARD_W / 2;
      const nodeCenterY = pos.y + CARD_H / 2;

      // Retrieve your layout's center coordinates
      // const cx = layout.viewW / 2;
      // const cy = layout.viewH / 2 - layout.minGen * (CARD_H + GAP_Y);
      const cx = layout.offsetX;
      const cy = layout.offsetY;

      // Calculate the difference between the view center and the node's position
      const dx = layout.viewW / 2 - (cx + nodeCenterX);
      const dy = layout.viewH / 2 - (cy + nodeCenterY);

      // Update transform state
      setTransform({
        x: dx * targetScale,
        y: dy * targetScale,
        scale: targetScale,
      });
    },
    [layout],
  );

  const zoomBy = (delta: number) =>
    setTransform((t) => ({ ...t, scale: clampScale(t.scale + delta) }));

  const loadMoreAncestors = () => {
    setUpDepth((d) => d + 1);
    setExpandAncestors(true);
  };

  const loadMoreDescendants = () => setDownDepth((d) => d + 3);

  const exportAsImage = useCallback(
    async (scaleFactor = 3) => {
      if (!layout || !graph) return;
      const svgEl = containerRef.current?.querySelector("svg");
      if (!svgEl) return;

      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      const g = clone.querySelector("[data-export-root]") as SVGGElement | null;
      if (g) g.setAttribute("style", "transform: none;"); // export the whole loaded tree, not the current pan/zoom
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(layout.viewW * scaleFactor));
      clone.setAttribute("height", String(layout.viewH * scaleFactor));
      clone.removeAttribute("style");
      clone.insertAdjacentHTML(
        "afterbegin",
        `<rect width="100%" height="100%" fill="#0b1020" />`,
      );

      // CSS custom properties (var(--font-display) etc.) don't resolve inside
      // a detached SVG document, so bake in the actual computed font stacks.
      const rootStyles = getComputedStyle(document.documentElement);
      const displayFont =
        rootStyles.getPropertyValue("--font-display").trim() ||
        "Georgia, serif";
      const bodyFont =
        rootStyles.getPropertyValue("--font-body").trim() ||
        "system-ui, sans-serif";
      let svgString = new XMLSerializer().serializeToString(clone);
      svgString = svgString
        .replace(/var\(--font-display\)/g, displayFont)
        .replace(/var\(--font-body\)/g, bodyFont);

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = layout.viewW * scaleFactor;
        canvas.height = layout.viewH * scaleFactor;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `family-tree-${focusId}.png`;
          link.click();
          URL.revokeObjectURL(link.href);
        }, "image/png");
      };
      img.src = url;
      console.log(url);
    },
    [layout, graph, focusId],
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
        <p>Loading tree…</p>
      </div>
    );
  }

  const cx = layout.offsetX;
  const cy = layout.offsetY;

  const relationLabel = (node: TreeNode) => {
    if (node.id === localFocusId) return "Head of Family";
    const hasSpouse = graph.edges.some(
      (e) => e.type === "spouse" && (e.from === node.id || e.to === node.id),
    );
    if (hasSpouse && node.generation === 0) return "Spouse";
    if (node.generation > 0) {
      return node.person.gender === "female"
        ? "Daughter"
        : node.person.gender === "male"
        ? "Son"
        : "Child";
    }
    if (node.generation < 0) return "Ancestor";
    return "Family member";
  };

  const initialsFor = (node: TreeNode) =>
    `${node.person.firstName[0] ?? ""}${
      node.person.lastName
        ? node.person.lastName[0]
        : node.person.middleName
        ? node.person.middleName[0]
        : node.person.firstName[1] ?? ""
    }`.toUpperCase();

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden tree-canvas-bg cursor-grab active:cursor-grabbing"
      style={{
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
      <div
        className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center overflow-hidden rounded-2xl border border-[#293452] bg-[#0d142a]/95 shadow-[0_12px_35px_rgba(0,0,0,.35)] backdrop-blur"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Zoom in"
          onClick={() => zoomBy(0.15)}
          className="grid h-12 w-12 place-items-center text-2xl text-slate-300 transition hover:bg-[#151e3b] hover:text-white"
        >
          +
        </button>
        <span className="min-w-14 border-x border-[#293452] px-3 text-center text-xs text-slate-400">
          {Math.round(transform.scale * 100)}%
        </span>
        <button
          aria-label="Zoom out"
          onClick={() => zoomBy(-0.15)}
          className="grid h-12 w-12 place-items-center text-2xl text-slate-300 transition hover:bg-[#151e3b] hover:text-white"
        >
          −
        </button>
        <button
          aria-label="Reset view"
          // onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          onClick={centerOnFocus}
          className="grid h-12 w-12 place-items-center border-l border-[#293452] text-lg text-slate-400 transition hover:bg-[#151e3b] hover:text-white"
        >
          ↺
        </button>
        {isAdmin && (
          <button
            aria-label="Export as image"
            onClick={() => exportAsImage(3)}
            className="grid h-12 w-12 place-items-center border-l border-[#293452] text-lg text-slate-400 transition hover:bg-[#151e3b] hover:text-white"
          >
            ⭳
          </button>
        )}
      </div>
      {graph?.hasMoreAncestors && (
        <button
          onClick={loadMoreAncestors}
          className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-[#8a5cff] bg-[#111733] px-4 py-2 text-xs font-medium text-[#a77bff] shadow-lg hover:bg-[#151e3b]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ↑ Load earlier generations
        </button>
      )}
      {graph?.hasMoreDescendants && (
        <button
          onClick={loadMoreDescendants}
          className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#8a5cff] bg-[#111733] px-4 py-2 text-xs font-medium text-[#a77bff] shadow-lg hover:bg-[#151e3b]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ↓ Load more descendants
        </button>
      )}

      <svg
        width="100%"
        height="100%"
        // viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
        viewBox={`0 0 ${containerRef.current?.clientWidth || 1200} ${
          containerRef.current?.clientHeight || 800
        }`}
        // viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <defs>
          <linearGradient id="lineageCard" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#121a35" />
            <stop offset="100%" stopColor="#0c132a" />
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
              dy="4"
              stdDeviation="5"
              floodColor="#000"
              floodOpacity="0.28"
            />
          </filter>
        </defs>

        <g
          ref={groupRef}
          data-export-root="true"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            // transformOrigin: "center",
            transformOrigin: "0 0",
            transition: isDragging
              ? "none"
              : "transform 0.3s cubic-bezier(0.2,0.8,0.2,1)",
            willChange: "transform",
          }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {graph.edges.map((edge, i) => {
              const from = layout.positions.get(edge.from);
              const to = layout.positions.get(edge.to);
              if (!from || !to) return null;

              if (edge.type === "spouse") {
                const y = from.y + CARD_H / 2;
                const x1 = Math.min(from.x + CARD_W, to.x);
                const x2 = Math.max(from.x, to.x);
                return (
                  <g key={`sp-${i}`}>
                    <line
                      x1={x1}
                      y1={y}
                      x2={x2}
                      y2={y}
                      stroke="#7d6a9e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <circle cx={(x1 + x2) / 2} cy={y} r={3} fill="#e64ba6" />
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
                  stroke="#d7d9e0"
                  strokeWidth={2.6}
                />
              );
            })}

            {graph.nodes.map((node) => {
              const pos = layout.positions.get(node.id);
              const isFocus = node.id === localFocusId;
              if (!pos) return null;

              const accent = isFocus
                ? "#f2a900"
                : node.person.gender === "female"
                ? "#c53c91"
                : node.person.gender === "male"
                ? "#4f73e8"
                : "#090f26";

              const accentText = isFocus
                ? "#f2a900"
                : node.person.gender === "female"
                ? "#dadcf2"
                : node.person.gender === "male"
                ? "#f2e9f2"
                : "#fff";

              const avatarFill = isFocus ? "#f2a900" : accent;

              const name = fullName(node.person);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x} ${pos.y})`}
                  className="cursor-pointer outline-none focus:outline-none"
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
                    strokeWidth={isFocus ? 2.2 : 1.2}
                    filter="url(#lineageShadow)"
                  />
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
                    fontSize={12}
                    fontWeight={500}
                    fill="#edf1ff"
                  >
                    {name.length > 14 ? `${name.slice(0, 13)}…` : name}
                  </text>
                  {/* <circle
                    cx={56}
                    cy={47}
                    r={3}
                    fill={node.isFocus ? "#f2a900" : accent}
                  />
                  <text
                    x={65}
                    y={51}
                    fontFamily="var(--font-body)"
                    fontSize={9.5}
                    fill="#8e98b5"
                  >
                    {node.person.gender}
                  </text> */}
                  {!isFocus && node.generation !== 0 && (
                    <text
                      x={CARD_W - 12}
                      y={18}
                      textAnchor="end"
                      fontFamily="var(--font-body)"
                      fontSize={8}
                      fill="#596582"
                    >
                      {lifespan(node)}
                    </text>
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
