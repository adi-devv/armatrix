"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TeamMember, TeamMemberInput, createMember, updateMember, deleteMember } from "@/lib/api";
import Image from "next/image";

interface Props { initialMembers: TeamMember[] }

// ── Layout constants ──────────────────────────────────────
const STEP     = 220;
const AMP      = 90;          // less amplitude → cards are closer to snake
const CARD_W   = 192;         // wider cards
const CARD_H   = 268;         // taller cards
const TITLE_W  = 280;
const PAD_RIGHT = 140;
const CONNECTOR_MAX = 20;     // very short connectors so cards hug the snake

function snakeY(x: number, totalW: number, h: number): number {
  const usable = totalW - TITLE_W - PAD_RIGHT;
  const t = (x - TITLE_W) / usable;
  return h / 2 + Math.sin(t * Math.PI * 2.6) * AMP;
}

export default function TeamPageClient({ initialMembers }: Props) {
  const [members, setMembers]       = useState<TeamMember[]>(initialMembers);
  const [activeIdx, setActiveIdx]   = useState(0);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [mounted, setMounted]       = useState(false);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const outerRef   = useRef<HTMLDivElement>(null);
  const offsetRef  = useRef(0);
  const drag       = useRef({ on: false, startX: 0, startOff: 0 });
  const activeRef  = useRef(0);
  const velRef     = useRef(0);
  const rafRef     = useRef(0);

  const N       = members.length;
  const TOTAL_W = TITLE_W + STEP * N + PAD_RIGHT;

  useEffect(() => { setMounted(true); }, []);

  // ── Draw snake ────────────────────────────────────────────
  const drawSnake = useCallback((totalW: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = totalW;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, totalW, h);

    const pts: { x: number; y: number }[] = [];
    for (let x = 0; x <= totalW; x += 2) {
      const y = x < TITLE_W ? h / 2 : snakeY(x, totalW, h);
      pts.push({ x, y });
    }

    // outer glow
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 2; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.strokeStyle = "rgba(232,89,12,0.08)";
    ctx.lineWidth   = 22;
    ctx.setLineDash([]);
    ctx.stroke();

    // mid glow
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 2; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.strokeStyle = "rgba(232,89,12,0.22)";
    ctx.lineWidth   = 6;
    ctx.stroke();

    // main line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 2; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.strokeStyle = "rgba(232,89,12,0.65)";
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // scale tick marks along path
    for (let i = 10; i < pts.length - 4; i += 18) {
      const p  = pts[i];
      const p2 = pts[Math.min(i + 1, pts.length - 1)];
      const ang = Math.atan2(p2.y - p.y, p2.x - p.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.strokeStyle = "rgba(232,89,12,0.5)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-8, -4.5, 16, 9);
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const redraw = () => {
      const h = outerRef.current?.clientHeight ?? 600;
      drawSnake(TOTAL_W, h);
    };
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [mounted, TOTAL_W, drawSnake]);

  // ── Scroll helpers ────────────────────────────────────────
  const applyOffset = useCallback((off: number) => {
    const x = `-${off}px`;
    if (trackRef.current)  trackRef.current.style.transform  = `translateX(${x})`;
    if (canvasRef.current) canvasRef.current.style.transform = `translateX(${x})`;
  }, []);

  const scrollTo = useCallback((idx: number) => {
    const outerW  = outerRef.current?.clientWidth ?? 800;
    const nx      = TITLE_W + idx * STEP;
    const target  = Math.max(0, Math.min(nx - outerW / 2 + CARD_W / 2, TOTAL_W - outerW));
    offsetRef.current = target;
    if (trackRef.current)  trackRef.current.style.transition  = "transform 0.6s cubic-bezier(0.4,0,0.2,1)";
    if (canvasRef.current) canvasRef.current.style.transition = "transform 0.6s cubic-bezier(0.4,0,0.2,1)";
    applyOffset(target);
    setTimeout(() => {
      if (trackRef.current)  trackRef.current.style.transition  = "";
      if (canvasRef.current) canvasRef.current.style.transition = "";
    }, 620);
  }, [TOTAL_W, applyOffset]);

  const activate = useCallback((idx: number) => {
    const c = Math.max(0, Math.min(N - 1, idx));
    activeRef.current = c;
    setActiveIdx(c);
    scrollTo(c);
  }, [N, scrollTo]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") activate(activeRef.current + 1);
      if (e.key === "ArrowLeft")  activate(activeRef.current - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [activate]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const friction = 0.82;
    const tick = () => {
      if (Math.abs(velRef.current) < 0.15) { velRef.current = 0; return; }
      const outerW = outerRef.current?.clientWidth ?? 800;
      const off = Math.max(0, Math.min(TOTAL_W - outerW, offsetRef.current + velRef.current));
      offsetRef.current = off;
      applyOffset(off);
      const ci = Math.max(0, Math.min(N - 1, Math.round((off + outerW / 2 - TITLE_W) / STEP)));
      if (ci !== activeRef.current) { activeRef.current = ci; setActiveIdx(ci); }
      velRef.current *= friction;
      rafRef.current = requestAnimationFrame(tick);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      velRef.current += e.deltaY * 0.08;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); cancelAnimationFrame(rafRef.current); };
  }, [N, TOTAL_W, applyOffset]);

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { on: true, startX: e.clientX, startOff: offsetRef.current };
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.on) return;
    const outerW = outerRef.current?.clientWidth ?? 800;
    const dx  = drag.current.startX - e.clientX;
    const off = Math.max(0, Math.min(TOTAL_W - outerW, drag.current.startOff + dx));
    offsetRef.current = off;
    applyOffset(off);
    const ci = Math.max(0, Math.min(N - 1, Math.round((off + outerW / 2 - TITLE_W) / STEP)));
    if (ci !== activeRef.current) { activeRef.current = ci; setActiveIdx(ci); }
  };
  const onMouseUp = () => { drag.current.on = false; };

  let tStart = 0, tOff = 0;
  const onTouchStart = (e: React.TouchEvent) => { tStart = e.touches[0].clientX; tOff = offsetRef.current; };
  const onTouchMove  = (e: React.TouchEvent) => {
    const outerW = outerRef.current?.clientWidth ?? 800;
    const dx  = tStart - e.touches[0].clientX;
    const off = Math.max(0, Math.min(TOTAL_W - outerW, tOff + dx));
    offsetRef.current = off;
    applyOffset(off);
    const ci = Math.max(0, Math.min(N - 1, Math.round((off + outerW / 2 - TITLE_W) / STEP)));
    if (ci !== activeRef.current) { activeRef.current = ci; setActiveIdx(ci); }
  };

  const handleSave = async (data: TeamMemberInput) => {
    setModalLoading(true);
    try {
      if (editTarget) {
        const u = await updateMember(editTarget.id, data);
        setMembers(p => p.map(m => m.id === editTarget.id ? u : m));
      } else {
        const c = await createMember(data);
        setMembers(p => [...p, c]);
      }
      setShowModal(false);
    } catch { alert("Error saving."); }
    finally { setModalLoading(false); }
  };

  const handleDelete = async (id: string) => {
    setModalLoading(true);
    try {
      await deleteMember(id);
      setMembers(p => p.filter(m => m.id !== id));
      setDeleteTarget(null);
    } catch { alert("Error deleting."); }
    finally { setModalLoading(false); }
  };

  return (
    <div
      className="h-screen overflow-hidden select-none"
      style={{
        background: "#080808",
        color: "#ede9e0",
        fontFamily: "var(--font-body)",
        // subtle dot grid background
        backgroundImage:
          "radial-gradient(circle, rgba(232,89,12,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* ── Corner noise vignette ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(8,8,8,0.85) 100%)",
        }}
      />

      {/* ── Floating nav ── */}
      <nav
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-14 py-5"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0.0) 100%)",
          borderBottom: "1px solid transparent",
        }}
      >
        <div className="flex items-center gap-3">
          <a href="https://armatrix.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://armatrix.in/assets/images/logo/Logo_2_white.webp"
              alt="Armatrix"
              className="h-5 w-auto opacity-60 group-hover:opacity-90 transition-opacity duration-300"
            />
          </a>
          <span
            className="font-mono text-[8px] tracking-[0.3em] uppercase"
            style={{ color: "rgba(232,89,12,0.5)" }}
          >
            / People
          </span>
        </div>

        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="group relative font-mono text-[9px] tracking-[0.25em] uppercase overflow-hidden"
          style={{
            border: "1px solid rgba(232,89,12,0.3)",
            padding: "8px 18px",
            color: "rgba(232,89,12,0.7)",
            background: "rgba(232,89,12,0.04)",
            transition: "all 0.25s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(232,89,12,0.12)";
            e.currentTarget.style.borderColor = "rgba(232,89,12,0.7)";
            e.currentTarget.style.color = "#e8590c";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(232,89,12,0.04)";
            e.currentTarget.style.borderColor = "rgba(232,89,12,0.3)";
            e.currentTarget.style.color = "rgba(232,89,12,0.7)";
          }}
        >
          <span className="relative z-10">+ Add Member</span>
        </button>
      </nav>

      {/* ── Main snake track ── */}
      <div
        ref={outerRef}
        className="absolute inset-0 z-10 overflow-hidden"
        style={{ cursor: drag.current.on ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        <canvas ref={canvasRef} className="absolute top-0 left-0 pointer-events-none z-0" />

        <div
          ref={trackRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: TOTAL_W, height: "100%" }}
        >
          {/* ── Title block ── */}
          <div
            className="absolute pointer-events-none flex flex-col justify-center"
            style={{ left: 0, top: 0, width: TITLE_W, height: "100%", paddingLeft: 40 }}
          >
            {/* vertical accent bar */}
            <div
              className="mb-5"
              style={{
                width: 1,
                height: 40,
                background: "linear-gradient(to bottom, transparent, #e8590c, transparent)",
              }}
            />
            <p
              className="font-mono text-[8px] tracking-[0.4em] uppercase mb-3 flex items-center gap-2"
              style={{ color: "rgba(232,89,12,0.6)" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  background: "#e8590c",
                  transform: "rotate(45deg)",
                  flexShrink: 0,
                }}
              />
              Armatrix Team
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3rem, 5.5vw, 5rem)",
                lineHeight: 0.88,
                color: "#ede9e0",
                letterSpacing: "-0.02em",
              }}
            >
              THE<br />
              <span style={{ color: "#e8590c" }}>PEO</span>PLE
            </h1>
            <p
              className="font-mono mt-4"
              style={{ fontSize: 9, color: "#2e2e2e", letterSpacing: "0.3em" }}
            >
              DRAG OR SCROLL →
            </p>
          </div>

          {/* ── Member cards ── */}
          {members.map((member, i) => {
            const h      = outerRef.current?.clientHeight ?? 600;
            const nx     = TITLE_W + i * STEP;
            const ny     = snakeY(nx, TOTAL_W, h);
            const above  = i % 2 === 0;
            const lineH  = Math.min(
              CONNECTOR_MAX,
              above
                ? Math.max(6, ny - CARD_H - 8)
                : Math.max(6, h - ny - CARD_H - 8)
            );
            const cardTop = above ? ny - lineH - CARD_H : ny + lineH;
            const isActive = i === activeIdx;
            const dist = Math.abs(i - activeIdx);
            const opacity = dist === 0 ? 1 : dist === 1 ? 0.78 : 0.5;

            return (
              <div
                key={member.id}
                className="absolute pointer-events-auto"
                style={{
                  left: nx - CARD_W / 2,
                  top: 0,
                  width: CARD_W,
                  height: "100%",
                  opacity,
                  transition: "opacity 0.4s ease",
                }}
              >
                {/* dashed connector line */}
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    width: 1,
                    top:    above ? cardTop + CARD_H : ny + 8,
                    height: lineH,
                    background:
                      isActive
                        ? "repeating-linear-gradient(to bottom,#e8590c 0px,#e8590c 3px,transparent 3px,transparent 8px)"
                        : "repeating-linear-gradient(to bottom,rgba(232,89,12,0.25) 0px,rgba(232,89,12,0.25) 3px,transparent 3px,transparent 8px)",
                    transition: "background 0.35s",
                  }}
                />

                {/* diamond node */}
                <div
                  onClick={() => activate(i)}
                  className="absolute left-1/2 cursor-pointer z-10"
                  style={{
                    top:       ny - 7,
                    transform: "translateX(-50%) rotate(45deg)",
                    width:     isActive ? 14 : 10,
                    height:    isActive ? 14 : 10,
                    border:    `1px solid ${isActive ? "#e8590c" : "rgba(232,89,12,0.3)"}`,
                    background: isActive ? "#e8590c" : "transparent",
                    boxShadow:  isActive ? "0 0 20px rgba(232,89,12,0.7), 0 0 40px rgba(232,89,12,0.2)" : "none",
                    transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />

                {/* ── Portrait card ── */}
                <div
                  onClick={() => activate(i)}
                  className="absolute left-0 right-0 cursor-pointer overflow-hidden"
                  style={{
                    top:    cardTop,
                    height: CARD_H,
                    border: `1px solid ${isActive ? "rgba(232,89,12,0.45)" : "rgba(255,255,255,0.06)"}`,
                    background: isActive
                      ? "linear-gradient(160deg, #1a1714 0%, #131110 100%)"
                      : "linear-gradient(160deg, #111010 0%, #0d0c0c 100%)",
                    transform:       isActive ? "scale(1.04)" : "scale(1)",
                    transformOrigin: above ? "bottom center" : "top center",
                    boxShadow: isActive
                      ? "0 0 40px rgba(232,89,12,0.12), 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
                      : "0 8px 32px rgba(0,0,0,0.4)",
                    transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {/* top accent bar */}
                  <div
                    style={{
                      height: isActive ? 2 : 1,
                      background: isActive
                        ? "linear-gradient(to right, #e8590c, rgba(232,89,12,0.2))"
                        : "rgba(255,255,255,0.05)",
                      transition: "all 0.35s",
                    }}
                  />

                  {/* avatar */}
                  <div className="relative w-full" style={{ height: Math.round(CARD_H * 0.54) }}>
                    {member.photo_url ? (
                      <Image
                        src={member.photo_url}
                        alt={member.name}
                        fill
                        className="object-cover"
                        unoptimized={member.photo_url.includes("dicebear")}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-mono text-4xl"
                        style={{
                          background: "linear-gradient(135deg, #1a1a1a 0%, #111 100%)",
                          color: isActive ? "rgba(232,89,12,0.5)" : "#2a2a2a",
                        }}
                      >
                        {member.name.charAt(0)}
                      </div>
                    )}

                    {/* avatar gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgba(8,8,8,0.0) 50%, rgba(8,8,8,0.85) 100%)",
                      }}
                    />

                    {/* index badge */}
                    <span
                      className="absolute top-2.5 left-2.5 font-mono"
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        padding: "2px 7px",
                        background: "rgba(8,8,8,0.75)",
                        color: isActive ? "#e8590c" : "#555",
                        border: `1px solid ${isActive ? "rgba(232,89,12,0.3)" : "rgba(255,255,255,0.07)"}`,
                        backdropFilter: "blur(4px)",
                        transition: "all 0.35s",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* edit/delete – shown on active */}
                    {isActive && (
                      <div className="absolute top-2.5 right-2.5 flex gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setEditTarget(member); setShowModal(true); }}
                          className="transition-colors"
                          style={{
                            padding: "4px 5px",
                            background: "rgba(8,8,8,0.75)",
                            color: "#666",
                            border: "1px solid rgba(255,255,255,0.07)",
                            backdropFilter: "blur(4px)",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#ede9e0")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#666")}
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(member); }}
                          className="transition-colors"
                          style={{
                            padding: "4px 5px",
                            background: "rgba(8,8,8,0.75)",
                            color: "#666",
                            border: "1px solid rgba(255,255,255,0.07)",
                            backdropFilter: "blur(4px)",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#666")}
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* card body */}
                  <div className="px-4 pt-3 pb-3.5">
                    {/* name */}
                    <div
                      className="font-mono font-semibold leading-tight truncate"
                      style={{
                        fontSize: 14,
                        color: isActive ? "#ede9e0" : "#aaa",
                        letterSpacing: "0.01em",
                        transition: "color 0.35s",
                      }}
                    >
                      {member.name}
                    </div>

                    {/* role */}
                    <div
                      className="font-mono leading-snug mt-1 line-clamp-1"
                      style={{
                        fontSize: 10.5,
                        color: isActive ? "#e8590c" : "#555",
                        letterSpacing: "0.04em",
                        transition: "color 0.35s",
                      }}
                    >
                      {member.role}
                    </div>

                    {/* divider */}
                    <div
                      className="my-2"
                      style={{
                        height: 1,
                        background: isActive
                          ? "linear-gradient(to right, rgba(232,89,12,0.2), transparent)"
                          : "rgba(255,255,255,0.04)",
                        transition: "background 0.35s",
                      }}
                    />

                    {/* tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {member.tags?.slice(0, 2).map(t => (
                        <span
                          key={t}
                          className="font-mono uppercase"
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            padding: "2px 7px",
                            border: `1px solid ${isActive ? "rgba(232,89,12,0.25)" : "rgba(255,255,255,0.08)"}`,
                            color: isActive ? "#e8590c" : "#555",
                            background: isActive ? "rgba(232,89,12,0.06)" : "rgba(255,255,255,0.02)",
                            transition: "all 0.35s",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* corner scale decoration */}
                  <div
                    className="absolute bottom-0 right-0 pointer-events-none"
                    style={{ opacity: isActive ? 0.1 : 0.03, transition: "opacity 0.4s" }}
                  >
                    <svg width="44" height="44" viewBox="0 0 44 44">
                      <ellipse cx="36" cy="36" rx="12" ry="6.5" fill="none" stroke="#e8590c" strokeWidth="1" />
                      <ellipse cx="24" cy="36" rx="9"  ry="5"   fill="none" stroke="#e8590c" strokeWidth="0.8" />
                      <ellipse cx="36" cy="26" rx="9"  ry="5"   fill="none" stroke="#e8590c" strokeWidth="0.8" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(8,8,8,0.98) 0%, rgba(8,8,8,0.0) 100%)",
            padding: "40px 32px 18px",
          }}
        >
          <div className="flex items-center gap-4 pointer-events-auto">
            {/* prev button */}
            <button
              onClick={() => activate(activeRef.current - 1)}
              className="font-mono text-[9px] tracking-widest uppercase transition-all flex items-center gap-1.5"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "7px 14px",
                color: "#444",
                background: "rgba(255,255,255,0.02)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(232,89,12,0.4)";
                e.currentTarget.style.color = "#e8590c";
                e.currentTarget.style.background = "rgba(232,89,12,0.04)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#444";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
            >
              ←
            </button>

            {/* progress track */}
            <div className="flex-1 relative" style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
              <div
                className="absolute left-0 top-0 h-full transition-all duration-500"
                style={{
                  width: `${((activeIdx + 1) / N) * 100}%`,
                  background: "linear-gradient(to right, rgba(232,89,12,0.5), #e8590c)",
                  boxShadow: "0 0 8px rgba(232,89,12,0.5)",
                }}
              />
              {/* member dots */}
              <div className="absolute inset-0 flex items-center">
                {members.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => activate(i)}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300"
                    style={{
                      left: `${((i + 0.5) / N) * 100}%`,
                      width: i === activeIdx ? 6 : 3,
                      height: i === activeIdx ? 6 : 3,
                      background: i === activeIdx ? "#e8590c" : "rgba(255,255,255,0.2)",
                      transform: `translate(-50%,-50%) rotate(45deg)`,
                      border: i === activeIdx ? "1px solid #e8590c" : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* counter */}
            <span
              className="font-mono text-[9px] tracking-widest"
              style={{ color: "#333", minWidth: 48, textAlign: "center" }}
            >
              <span style={{ color: "#e8590c" }}>{String(activeIdx + 1).padStart(2, "0")}</span>
              <span> / {String(N).padStart(2, "0")}</span>
            </span>

            {/* next button */}
            <button
              onClick={() => activate(activeRef.current + 1)}
              className="font-mono text-[9px] tracking-widest uppercase transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "7px 14px",
                color: "#444",
                background: "rgba(255,255,255,0.02)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(232,89,12,0.4)";
                e.currentTarget.style.color = "#e8590c";
                e.currentTarget.style.background = "rgba(232,89,12,0.04)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "#444";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
            >
              →
            </button>
          </div>

          {/* footer line */}
          <div className="flex justify-between mt-2.5">
            <span className="font-mono text-[7px] tracking-widest uppercase" style={{ color: "#1e1e1e" }}>
              &copy; {new Date().getFullYear()} Armatrix Automations Pvt. Ltd.
            </span>
            <span className="font-mono text-[7px] tracking-widest uppercase" style={{ color: "#1e1e1e" }}>
              Bengaluru, India
            </span>
          </div>
        </div>
      </div>

      {showModal && (
        <MemberFormModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          loading={modalLoading}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          member={deleteTarget}
          loading={modalLoading}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ── Form Modal ─────────────────────────────────────────── */
function MemberFormModal({
  initial, onSave, onClose, loading,
}: {
  initial: TeamMember | null;
  onSave: (d: TeamMemberInput) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<TeamMemberInput>({
    name:      initial?.name      ?? "",
    role:      initial?.role      ?? "",
    bio:       initial?.bio       ?? "",
    photo_url: initial?.photo_url ?? "",
    linkedin:  initial?.linkedin  ?? "",
    twitter:   initial?.twitter   ?? "",
    tags:      initial?.tags      ?? [],
  });
  const [tagInput, setTagInput] = useState("");
  const set = (k: keyof TeamMemberInput, v: string | string[]) =>
    setForm(f => ({ ...f, [k]: v }));
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) { set("tags", [...(form.tags ?? []), t]); setTagInput(""); }
  };
  const removeTag = (t: string) => set("tags", (form.tags ?? []).filter(x => x !== t));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim() || !form.bio.trim()) return;
    onSave(form);
  };

  const fields: { label: string; key: keyof TeamMemberInput; placeholder: string }[] = [
    { label: "Name *",    key: "name",      placeholder: "Full name" },
    { label: "Role *",    key: "role",      placeholder: "e.g. Chief Executive Officer" },
    { label: "Photo URL", key: "photo_url", placeholder: "https://..." },
    { label: "LinkedIn",  key: "linkedin",  placeholder: "https://linkedin.com/in/..." },
    { label: "Twitter",   key: "twitter",   placeholder: "https://twitter.com/..." },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    padding: "9px 12px",
    fontSize: 11,
    color: "#ede9e0",
    outline: "none",
    fontFamily: "var(--font-body)",
    transition: "border-color 0.2s",
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(4,4,4,0.92)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[88vh] overflow-y-auto"
        style={{
          background: "#0a0909",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,89,12,0.08)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* modal top bar */}
        <div style={{ height: 2, background: "linear-gradient(to right, #e8590c, rgba(232,89,12,0.1))" }} />

        {/* header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div>
            <p className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: "rgba(232,89,12,0.6)" }}>
              {initial ? "Edit Member" : "New Member"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: "#333", padding: 4, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ede9e0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#333")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: "20px 24px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fields.map(({ label, key, placeholder }) => (
              <div key={key as string}>
                <label
                  className="font-mono"
                  style={{
                    display: "block",
                    fontSize: 8,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#333",
                    marginBottom: 6,
                  }}
                >
                  {label}
                </label>
                <input
                  type="text"
                  value={(form[key] as string) ?? ""}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ ...inputStyle, fontFamily: "var(--font-body)" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(232,89,12,0.4)")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
                />
              </div>
            ))}

            {/* bio */}
            <div>
              <label className="font-mono" style={{ display: "block", fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", color: "#333", marginBottom: 6 }}>
                Bio *
              </label>
              <textarea
                value={form.bio}
                onChange={e => set("bio", e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "none" }}
                onFocus={e => (e.target.style.borderColor = "rgba(232,89,12,0.4)")}
                onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
              />
            </div>

            {/* tags */}
            <div>
              <label className="font-mono" style={{ display: "block", fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", color: "#333", marginBottom: 6 }}>
                Skills / Tags
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="React, Python…"
                  style={{ ...inputStyle, flex: 1, fontFamily: "var(--font-body)" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(232,89,12,0.4)")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="font-mono text-[9px] tracking-widest uppercase transition-colors"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    padding: "0 14px",
                    color: "#444",
                    background: "transparent",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#ede9e0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                >
                  Add
                </button>
              </div>

              {form.tags && form.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {form.tags.map(t => (
                    <span
                      key={t}
                      className="font-mono"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 8,
                        letterSpacing: "0.15em",
                        border: "1px solid rgba(232,89,12,0.2)",
                        padding: "2px 8px",
                        color: "rgba(232,89,12,0.7)",
                        background: "rgba(232,89,12,0.04)",
                        textTransform: "uppercase",
                      }}
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        style={{ color: "rgba(232,89,12,0.4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, fontSize: 11 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(232,89,12,0.4)")}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              type="submit"
              disabled={loading}
              className="font-mono text-[9px] tracking-[0.25em] uppercase transition-all"
              style={{
                flex: 1,
                padding: "11px 0",
                background: "#e8590c",
                color: "#080808",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                fontWeight: 600,
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = "#f06420")}
              onMouseLeave={e => (e.currentTarget.style.background = "#e8590c")}
            >
              {loading ? "Saving…" : initial ? "Update Member" : "Create Member"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[9px] tracking-[0.25em] uppercase transition-all"
              style={{
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "11px 20px",
                color: "#444",
                background: "transparent",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ede9e0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete Modal ───────────────────────────────────────── */
function DeleteModal({
  member, loading, onConfirm, onClose,
}: {
  member: TeamMember; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(4,4,4,0.92)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs"
        style={{
          background: "#0a0909",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ height: 1, background: "rgba(185,28,28,0.5)" }} />
        <div style={{ padding: "22px 24px 24px" }}>
          <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-1" style={{ color: "#555" }}>
            Confirm Removal
          </p>
          <p style={{ fontSize: 13, color: "#ede9e0", marginBottom: 6 }}>
            Remove <span style={{ color: "#ede9e0", fontWeight: 600 }}>{member.name}</span>?
          </p>
          <p className="font-mono" style={{ fontSize: 10, color: "#333", marginBottom: 20 }}>
            This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="font-mono text-[9px] tracking-[0.2em] uppercase transition-all"
              style={{
                flex: 1,
                padding: "10px 0",
                border: "1px solid rgba(153,27,27,0.4)",
                color: "#f87171",
                background: "rgba(153,27,27,0.08)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = "rgba(153,27,27,0.2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(153,27,27,0.08)")}
            >
              {loading ? "Removing…" : "Remove"}
            </button>
            <button
              onClick={onClose}
              className="font-mono text-[9px] tracking-[0.2em] uppercase transition-all"
              style={{
                padding: "10px 18px",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#444",
                background: "transparent",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ede9e0"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}