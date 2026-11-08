"use client";

/*!
 * Liquid Glass — refraction engine (React / DOM port of liquid-glass.directive.ts).
 *
 * The refraction field is a port of the fragment shader in liquid-glass-js
 * (https://github.com/dashersw/liquid-glass-js) — Copyright (c) 2025 Armagan
 * Amcalar, MIT. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of that software to deal in it without restriction,
 * provided this notice travels with it; it is provided "as is", without
 * warranty of any kind. Keep this header on any copy or port.
 *
 * The port targets an SVG displacement filter fed by a live backdrop instead
 * of the library's html2canvas page snapshot.
 */

import { useEffect, useRef } from "react";

export interface LiquidGlassConfig {
  edgeIntensity: number;
  rimIntensity: number;
  baseIntensity: number;
  edgeDistance: number;
  rimDistance: number;
  baseDistance: number;
  cornerBoost: number;
  rippleEffect: number;
  blurRadius: number;
  /** Center distortion ("Enable Center Warp"); off keeps the middle legible. */
  warp: boolean;
}

/** Hand-tuned in the library's demo controls; the tint (0.11) lives in CSS. */
export const GLASS_PRESET: LiquidGlassConfig = {
  edgeIntensity: 0.015,
  rimIntensity: 0.028,
  baseIntensity: 0.05,
  edgeDistance: 0.5,
  rimDistance: 1.7,
  baseDistance: 0.2,
  cornerBoost: 0.06,
  rippleEffect: 0.26,
  blurRadius: 2,
  warp: false,
};

const SUPERSAMPLE = 2;
const MAX_MAP_EDGE = 1400;
const BLUR_STD_PER_RADIUS = 0.35;

interface FilterEntry {
  id: string;
  node: SVGFilterElement;
  refs: number;
}

const filters = new Map<string, FilterEntry>();
let sharedDefs: SVGSVGElement | null = null;
let nextId = 0;

/**
 * Backdrop-filters referencing SVG filters are Chromium-only. Feature
 * queries can't tell (Safari parses but paints nothing), so gate on engine.
 */
export function isLiquidGlassRefractionSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const brands = (navigator as unknown as { userAgentData?: { brands?: { brand: string }[] } })
    .userAgentData?.brands;
  if (brands) {
    return brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
  }
  return /Chrome\//.test(navigator.userAgent) && !/EdgA|OPR|CriOS/.test(navigator.userAgent);
}

function ensureDefs(): SVGSVGElement {
  if (!sharedDefs || !sharedDefs.isConnected) {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "fixed";
    svg.style.pointerEvents = "none";
    svg.setAttribute("aria-hidden", "true");
    svg.appendChild(document.createElementNS(svgNs, "defs"));
    document.body.appendChild(svg);
    sharedDefs = svg;
  }
  return sharedDefs;
}

function acquireFilter(
  key: string,
  w: number,
  h: number,
  radius: number,
  pageW: number,
  pageH: number,
  cfg: LiquidGlassConfig
): FilterEntry {
  let entry = filters.get(key);
  if (entry && entry.node.isConnected) {
    entry.refs++;
    return entry;
  }
  if (entry) {
    filters.delete(key);
  }

  const { mapUrl, scale } = buildDisplacementMap(w, h, radius, pageW, pageH, cfg);
  const id = `liquid-glass-${nextId++}`;

  const svgNs = "http://www.w3.org/2000/svg";
  const filter = document.createElementNS(svgNs, "filter");
  filter.setAttribute("id", id);

  const marginPx = scale / 2 + 3 * cfg.blurRadius * BLUR_STD_PER_RADIUS;
  const mx = (marginPx / w) * 100;
  const my = (marginPx / h) * 100;
  filter.setAttribute("x", `${-mx}%`);
  filter.setAttribute("y", `${-my}%`);
  filter.setAttribute("width", `${100 + 2 * mx}%`);
  filter.setAttribute("height", `${100 + 2 * my}%`);
  filter.setAttribute("color-interpolation-filters", "sRGB");
  filter.dataset["key"] = key;

  const feImage = document.createElementNS(svgNs, "feImage");
  feImage.setAttribute("href", mapUrl);
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("width", String(w));
  feImage.setAttribute("height", String(h));
  feImage.setAttribute("preserveAspectRatio", "none");
  feImage.setAttribute("result", "map");

  const feDisplacement = document.createElementNS(svgNs, "feDisplacementMap");
  feDisplacement.setAttribute("in", "SourceGraphic");
  feDisplacement.setAttribute("in2", "map");
  feDisplacement.setAttribute("scale", String(scale));
  feDisplacement.setAttribute("xChannelSelector", "R");
  feDisplacement.setAttribute("yChannelSelector", "G");
  feDisplacement.setAttribute("result", "displaced");

  const feBlur = document.createElementNS(svgNs, "feGaussianBlur");
  feBlur.setAttribute("in", "displaced");
  feBlur.setAttribute("stdDeviation", String(cfg.blurRadius * BLUR_STD_PER_RADIUS));

  filter.append(feImage, feDisplacement, feBlur);
  ensureDefs().querySelector("defs")!.appendChild(filter);

  entry = { id, node: filter, refs: 1 };
  filters.set(key, entry);
  return entry;
}

function releaseFilterKey(key: string | null): void {
  if (!key) return;
  const entry = filters.get(key);
  if (entry && --entry.refs <= 0) {
    filters.delete(key);
    entry.node.remove();
  }
}

/**
 * Bake the shader's refraction field into a displacement map: R/G encode the
 * x/y sample offset around neutral 128, scaled so the extremes span the
 * feDisplacementMap `scale`. Formulas transcribed 1:1 from container.js.
 */
export function buildDisplacementMap(
  w: number,
  h: number,
  radius: number,
  pageW: number,
  pageH: number,
  cfg: LiquidGlassConfig = GLASS_PRESET
): { mapUrl: string; scale: number } {
  const ss = Math.max(0.25, Math.min(SUPERSAMPLE, MAX_MAP_EDGE / Math.max(w, h)));
  const bw = Math.max(1, Math.round(w * ss));
  const bh = Math.max(1, Math.round(h * ss));
  const r = radius * ss;
  const minDim = Math.min(w, h);
  const dx = new Float32Array(bw * bh);
  const dy = new Float32Array(bw * bh);
  let maxAbs = 0;

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const cx = (px + 0.5) / bw;
      const cy = (py + 0.5) / bh;

      const tx = Math.abs(px + 0.5 - bw / 2) - (bw / 2 - r);
      const ty = Math.abs(py + 0.5 - bh / 2) - (bh / 2 - r);
      const outside = Math.hypot(Math.max(tx, 0), Math.max(ty, 0));
      const inside = Math.min(Math.max(tx, ty), 0);
      const distPx = Math.max(-(outside + inside - r), 0) / ss;

      const edgeFall = Math.exp(-distPx * cfg.edgeDistance);
      const rimFall = Math.exp(-distPx * cfg.rimDistance);
      const baseFall = 1 - Math.exp(-distPx * cfg.baseDistance);
      const baseComponent = cfg.warp ? baseFall * cfg.baseIntensity : 0;
      const total = baseComponent + edgeFall * cfg.edgeIntensity + rimFall * cfg.rimIntensity;

      let nx = cx - 0.5;
      let ny = cy - 0.5;
      const len = Math.hypot(nx, ny);
      if (len > 0) {
        nx /= len;
        ny /= len;
      }

      const cornerNorm = Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * minDim;
      const corner = Math.exp(-cornerNorm * 0.3) * cfg.cornerBoost;

      const ripple = Math.sin((distPx / minDim) * 25) * cfg.rippleEffect * rimFall;

      const fx = (nx * (total + corner) - ny * ripple) * pageW;
      const fy = (ny * (total + corner) + nx * ripple) * pageH;

      const i = py * bw + px;
      dx[i] = fx;
      dy[i] = fy;
      maxAbs = Math.max(maxAbs, Math.abs(fx), Math.abs(fy));
    }
  }

  const scale = Math.max(maxAbs * 2, 1e-4);
  const bias = scale * (128 / 255 - 0.5);
  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(bw, bh);
  const data = image.data;
  for (let i = 0; i < bw * bh; i++) {
    data[i * 4] = clampByte(255 * (0.5 + (dx[i] - bias) / scale));
    data[i * 4 + 1] = clampByte(255 * (0.5 + (dy[i] - bias) / scale));
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { mapUrl: canvas.toDataURL("image/png"), scale };
}

function resolveRadius(computed: string, w: number, h: number): number {
  const value = parseFloat(computed) || 0;
  return computed.trim().endsWith("%") ? (value / 100) * Math.min(w, h) : value;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Attach Liquid Glass SVG refraction to a single HTML element.
 * Returns a cleanup callback.
 */
export function attachLiquidGlassElement(
  el: HTMLElement,
  config?: Partial<LiquidGlassConfig>
): () => void {
  if (!isLiquidGlassRefractionSupported()) {
    return () => {};
  }

  let currentKey: string | null = null;
  let rebuildHandle = 0;
  let resizeDebounce: ReturnType<typeof setTimeout> | undefined;

  const rebuild = () => {
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (w < 2 || h < 2) return;

    const radius = Math.min(
      resolveRadius(getComputedStyle(el).borderTopLeftRadius, w, h),
      Math.min(w, h) / 2
    );
    const pageW = window.innerWidth;
    const pageH = window.innerHeight;
    const cfg: LiquidGlassConfig = { ...GLASS_PRESET, ...(config || {}) };

    const key = [w, h, radius, pageW, pageH, JSON.stringify(cfg)].join("|");
    if (key === currentKey) return;

    releaseFilterKey(currentKey);
    const entry = acquireFilter(key, w, h, radius, pageW, pageH, cfg);
    currentKey = key;
    el.style.backdropFilter = `url(#${entry.id})`;
  };

  const scheduleRebuild = () => {
    cancelAnimationFrame(rebuildHandle);
    rebuildHandle = requestAnimationFrame(rebuild);
  };

  const onWindowResize = () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(scheduleRebuild, 180);
  };

  const ro = new ResizeObserver(scheduleRebuild);
  ro.observe(el);
  window.addEventListener("resize", onWindowResize, { passive: true });
  scheduleRebuild();

  return () => {
    ro.disconnect();
    window.removeEventListener("resize", onWindowResize);
    clearTimeout(resizeDebounce);
    cancelAnimationFrame(rebuildHandle);
    releaseFilterKey(currentKey);
    currentKey = null;
  };
}

/**
 * Hook for explicit attachment to a React ref.
 */
export function useLiquidGlassRef<T extends HTMLElement = HTMLDivElement>(
  config?: Partial<LiquidGlassConfig>
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    return attachLiquidGlassElement(ref.current, config);
  }, [config]);

  return ref;
}

const SELECTOR = ".liquid-glass, .liquid-glass-card, [data-liquid-glass]";

/**
 * Global provider that automatically binds the SVG displacement refraction
 * to all `.liquid-glass`, `.liquid-glass-card`, and `[data-liquid-glass]` panels
 * in the DOM without requiring structural changes to components.
 */
export function LiquidGlassRefractionProvider() {
  useEffect(() => {
    if (!isLiquidGlassRefractionSupported()) return;

    const tracked = new Map<HTMLElement, () => void>();

    const scanAndAttach = (root: ParentNode = document) => {
      const elements = root.querySelectorAll<HTMLElement>(SELECTOR);
      elements.forEach((el) => {
        if (!tracked.has(el)) {
          tracked.set(el, attachLiquidGlassElement(el));
        }
      });
    };

    scanAndAttach();

    const mo = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const m of mutations) {
        if (m.removedNodes.length > 0) {
          m.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const cleanup = tracked.get(node);
              if (cleanup) {
                cleanup();
                tracked.delete(node);
              }
              node.querySelectorAll<HTMLElement>(SELECTOR).forEach((child) => {
                const c = tracked.get(child);
                if (c) {
                  c();
                  tracked.delete(child);
                }
              });
            }
          });
        }
        if (m.addedNodes.length > 0) {
          shouldScan = true;
        }
      }
      if (shouldScan) {
        scanAndAttach();
      }
    });

    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      tracked.forEach((cleanup) => cleanup());
      tracked.clear();
    };
  }, []);

  return null;
}
