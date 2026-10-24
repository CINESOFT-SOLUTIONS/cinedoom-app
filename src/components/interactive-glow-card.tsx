"use client";

import React, { useRef, useState } from "react";

export interface InteractiveGlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  orb1Color?: string;
  orb2Color?: string;
  spotlightColor?: string;
  orbSize?: string;
  interactive?: boolean;
}

/**
 * InteractiveGlowCard
 * Componente visual cinematográfico com degradês dinâmicos e orbs que reagem
 * e se movimentam de acordo com a posição do cursor do mouse (GPU-accelerated).
 */
export function InteractiveGlowCard({
  as: Component = "div",
  children,
  className = "",
  contentClassName = "",
  orb1Color = "rgba(233, 69, 96, 0.25)",
  orb2Color = "rgba(245, 158, 11, 0.18)",
  spotlightColor = "rgba(255, 255, 255, 0.08)",
  orbSize = "w-72 h-72",
  interactive = true,
  ...rest
}: InteractiveGlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const updateCoordinates = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateCoordinates(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    updateCoordinates(e);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const Tag = Component as any;

  return (
    <Tag
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group/glow relative overflow-hidden transition-all duration-300 ${className}`}
      {...rest}
    >
      {/* 1. Dynamic Cursor Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(450px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${spotlightColor}, transparent 70%)`,
        }}
      />

      {/* 2. Dynamic Floating Glow Orb 1 (Acompanha o mouse com fluidez) */}
      <div
        className={`pointer-events-none absolute ${orbSize} rounded-full blur-3xl transition-all duration-300 ease-out will-change-transform z-0`}
        style={{
          left: isHovered ? "var(--mouse-x, 80%)" : "85%",
          top: isHovered ? "var(--mouse-y, 20%)" : "15%",
          transform: "translate(-50%, -50%)",
          background: orb1Color,
          opacity: isHovered ? 0.85 : 0.35,
        }}
      />

      {/* 3. Dynamic Counter-Balance Glow Orb 2 (Efeito de profundidade espelhado) */}
      <div
        className={`pointer-events-none absolute ${orbSize} rounded-full blur-3xl transition-all duration-500 ease-out will-change-transform z-0`}
        style={{
          left: isHovered ? "calc(100% - var(--mouse-x, 20%))" : "15%",
          top: isHovered ? "calc(100% - var(--mouse-y, 80%))" : "85%",
          transform: "translate(-50%, -50%)",
          background: orb2Color,
          opacity: isHovered ? 0.65 : 0.25,
        }}
      />

      {/* 4. Conteúdo Renderizado Acima dos Degradês */}
      <div className={`relative z-10 h-full w-full ${contentClassName}`}>{children}</div>
    </Tag>
  );
}
