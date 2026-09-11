"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { FamilyTreeGraph, TreeNode } from "@/types/person";

interface FamilyTreeProps {
  focusId: string;
  onSelectPerson: (personId: string) => void;
}

const CARD_W = 224;
const CARD_H = 104;
const GAP_Y = 96;

const SPOUSE_GAP = 38;
const SIBLING_GAP = 46;
const EXTRA_PER_SIBLING = 14;
const FAMILY_GAP = 100;

const MAX_UNITS_PER_ROW = 6;
const ROW_GAP = 40;

function fullName(node: TreeNode) {
  return `${node.person.firstName} ${node.person.lastName}`;
}

function lifespan(node: TreeNode) {
  const birth = node.person.birthDate?.slice(0, 4) ?? "?";
  const death = node.person.deathDate?.slice(0, 4);
  return death ? `${birth}–${death}` : `${birth}–`;
}

export default function FamilyTree({
  focusId,
  onSelectPerson,
}: FamilyTreeProps) {
  const [graph, setGraph] = useState<FamilyTreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
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
    fetch(`/api/persons/${focusId}/tree?up=3&down=5`)
      .then(async (res) => {
        if (!res.ok)
          throw new Error((await res.json()).error ?? "Failed to load tree.");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setGraph(json.data as FamilyTreeGraph);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [focusId]);

  // Recenter the view whenever a new tree loads.
  useEffect(() => {
    if (graph) setTransform({ x: 0, y: 0, scale: 1 });
  }, [graph?.focusId]);

  useEffect(() => {
    liveTransform.current = transform;
  }, [transform]);

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
    const unitWidth = (key: string): number => {
      if (widthCache.has(key)) return widthCache.get(key)!;
      const members = unitMembers(key);
      // const base = members.length === 2 ? CARD_W * 2 + SPOUSE_GAP : CARD_W;
      const base = members.length * CARD_W + (members.length - 1) * SPOUSE_GAP;
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
      widthCache.set(key, width);
      return width;
    };

    // Top-down: place each unit at centerX, then spread its children under
    // it — this is what makes a parent sit centered over however many kids
    // they have, and gives a 5-child family exactly the room 5 children need.
    const positions = new Map<string, { x: number; y: number }>();
    const placedUnits = new Set<string>();

    const placeUnit = (key: string, centerX: number, y: number) => {
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

      const rows: string[][] = [];
      for (let i = 0; i < childUnits.length; i += MAX_UNITS_PER_ROW) {
        rows.push(childUnits.slice(i, i + MAX_UNITS_PER_ROW));
      }

      rows.forEach((rowUnits, rowIndex) => {
        const gap = gapForGroup(rowUnits.length);
        const totalWidth = rowUnits.reduce(
          (s, cu, i) => s + unitWidth(cu) + (i > 0 ? gap : 0),
          0,
        );
        let cursor = centerX - totalWidth / 2;
        const rowY = y + CARD_H + GAP_Y + rowIndex * (CARD_H + ROW_GAP);
        for (const cu of rowUnits) {
          const w = unitWidth(cu);
          placeUnit(cu, cursor + w / 2, rowY);
          cursor += w + gap;
        }
      });
    };

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
    const rootUnits = Array.from(allUnitKeys).filter((key) =>
      unitMembers(key).every((m) => !hasParentInGraph.has(m)),
    );
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
    //   placeUnit(key, rootCursor + w / 2);
    //   rootCursor += w + FAMILY_GAP;
    // });

    rootUnits.forEach((key, i) => {
      const w = rootWidths[i];
      const gen = Math.min(
        ...unitMembers(key).map((m) => byId.get(m)!.generation),
      );
      placeUnit(key, rootCursor + w / 2, gen * (CARD_H + GAP_Y));
      rootCursor += w + FAMILY_GAP;
    });

    const minGen = Math.min(...graph.nodes.map((n) => n.generation), 0);
    const maxGen = Math.max(...graph.nodes.map((n) => n.generation), 0);
    const allX = Array.from(positions.values()).map((p) => p.x);
    const allY = Array.from(positions.values()).map((p) => p.y);
    const minX = Math.min(...allX, 0);
    const minY = Math.min(...allY, 0);
    const viewW = Math.max(...allX, 0) - minX + CARD_W + 200;
    // const viewH = (maxGen - minGen + 1) * (CARD_H + GAP_Y) + 200;
    const viewH = Math.max(...allY, 0) - minY + CARD_H + 200;
    const offsetX = -minX + 100;
    const offsetY = -minY + 100;

    // return { positions, viewW, viewH, minGen, maxGen };
    return { positions, viewW, viewH, offsetX, offsetY };
  }, [graph]);

  // Zoom range depends on the currently-loaded graph: scale 1 = whole tree
  // fits (that's how viewW/viewH were sized), and the max scale is whatever
  // makes one card roughly fill the viewport.
  const zoomBounds = useMemo(() => {
    if (!layout) return { min: 1, max: 3 };
    const max = Math.max(
      2.5,
      Math.min(layout.viewW / CARD_W, layout.viewH / CARD_H) * 0.9,
    );
    return { min: 1, max };
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

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-ink-soft">
        <p>{error}</p>
      </div>
    );
  }

  if (!graph || !layout) {
    return (
      <div className="flex h-full items-center justify-center text-ink-faint">
        <p>Loading tree…</p>
      </div>
    );
  }

  // const cx = layout.viewW / 2;
  // const cy = layout.viewH / 2 - layout.minGen * (CARD_H + GAP_Y);
  const cx = layout.offsetX;
  const cy = layout.offsetY;

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
        className="absolute right-4 top-4 z-10 flex flex-col gap-1.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Zoom in"
          onClick={() => zoomBy(0.15)}
          className="h-9 w-9 rounded-card border border-ink/20 bg-parchment-light text-lg font-medium text-ink shadow-none hover:bg-parchment-dark"
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => zoomBy(-0.15)}
          className="h-9 w-9 rounded-card border border-ink/20 bg-parchment-light text-lg font-medium text-ink hover:bg-parchment-dark"
        >
          −
        </button>
        <button
          aria-label="Reset view"
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="h-9 w-9 rounded-card border border-ink/20 bg-parchment-light text-xs font-medium text-ink hover:bg-parchment-dark"
        >
          ⟳
        </button>
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <defs>
          <linearGradient id="cardFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F8F4EA" />
            <stop offset="100%" stopColor="#EDE6D6" />
          </linearGradient>
          <filter id="cardGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="3"
              floodColor="#1B2A41"
              floodOpacity="0.18"
            />
          </filter>
        </defs>
        <g
          ref={groupRef}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "center",
            transition: isDragging
              ? "none"
              : "transform 0.3s cubic-bezier(0.2,0.8,0.2,1)",
            willChange: "transform",
          }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            {/* Edges drawn first, beneath the cards */}
            {graph.edges.map((edge, i) => {
              const from = layout.positions.get(edge.from);
              const to = layout.positions.get(edge.to);
              if (!from || !to) return null;

              if (edge.type === "spouse") {
                const y = from.y + CARD_H / 2;
                return (
                  <line
                    key={`sp-${i}`}
                    x1={from.x + CARD_W}
                    y1={y}
                    x2={to.x}
                    y2={y}
                    stroke="#B08D57"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
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
                  stroke="#3B4B63"
                  strokeWidth={1.5}
                />
              );
            })}

            {graph.nodes.map((node) => {
              const pos = layout.positions.get(node.id);
              if (!pos) return null;

              const accent = node.isFocus
                ? "#B08D57"
                : node.generation < 0
                  ? "#1B2A41"
                  : "#3F6B4C";
              const initials =
                `${node.person.firstName[0] ?? ""}${node.person.lastName[0] ?? ""}`.toUpperCase();
              const genderGlyph =
                node.person.gender === "male"
                  ? "♂"
                  : node.person.gender === "female"
                    ? "♀"
                    : "⚲";
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x} ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectPerson(node.id)}
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
                    rx={10}
                    fill="url(#cardFill)"
                    stroke={accent}
                    strokeWidth={node.isFocus ? 2.5 : 1.25}
                    filter="url(#cardGlow)"
                  />
                  {/* accent rail */}
                  <rect
                    x={0}
                    y={0}
                    width={4}
                    height={CARD_H}
                    rx={2}
                    fill={accent}
                  />

                  {/* avatar */}
                  <circle cx={30} cy={30} r={18} fill={accent} opacity={0.15} />
                  <text
                    x={30}
                    y={36}
                    fontFamily="var(--font-display)"
                    fontSize={15}
                    fontWeight={700}
                    fill={accent}
                    textAnchor="middle"
                  >
                    {initials}
                  </text>

                  <text
                    x={58}
                    y={26}
                    fontFamily="var(--font-display)"
                    fontSize={15}
                    fontWeight={600}
                    fill="#1B2A41"
                  >
                    {fullName(node).length > 20
                      ? `${fullName(node).slice(0, 19)}…`
                      : fullName(node)}
                  </text>
                  <text
                    x={58}
                    y={42}
                    fontFamily="var(--font-body)"
                    fontSize={11}
                    fill="#7B879A"
                  >
                    {lifespan(node)} {genderGlyph}
                  </text>
                  {node.person.maidenName && (
                    <text
                      x={14}
                      y={62}
                      fontFamily="var(--font-body)"
                      fontSize={10}
                      fill="#7B879A"
                    >
                      née {node.person.maidenName}
                    </text>
                  )}
                  {node.person.birthPlace && (
                    <text
                      x={14}
                      y={78}
                      fontFamily="var(--font-body)"
                      fontSize={10}
                      fill="#7B879A"
                    >
                      {node.person.birthPlace.length > 30
                        ? `${node.person.birthPlace.slice(0, 29)}…`
                        : node.person.birthPlace}
                    </text>
                  )}
                  {node.person.bio && (
                    <text
                      x={14}
                      y={94}
                      fontFamily="var(--font-body)"
                      fontSize={9}
                      fill="#B08D57"
                      fontStyle="italic"
                    >
                      {node.person.bio.length > 34
                        ? `${node.person.bio.slice(0, 33)}…`
                        : node.person.bio}
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
