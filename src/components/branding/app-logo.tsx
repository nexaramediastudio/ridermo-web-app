"use client";

import Link from "next/link";
import { useCompanySettings } from "@/components/providers/company-settings-provider";

function DefaultLogoIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill="white" fillOpacity="0.9" />
      <path d="M12 2L3 7l9 5 9-5-9-5z" fill="white" />
    </svg>
  );
}

type AppLogoVariant = "nav" | "login" | "sidebar";

const VARIANTS: Record<AppLogoVariant, { imgMaxH: string; imgMaxW: string; showTagline?: boolean; dark?: boolean }> = {
  nav: { imgMaxH: "h-8", imgMaxW: "max-w-[140px]" },
  login: { imgMaxH: "h-16", imgMaxW: "max-w-[280px]", showTagline: true },
  sidebar: { imgMaxH: "h-8", imgMaxW: "max-w-[140px]", dark: true },
};

interface AppLogoProps {
  variant?: AppLogoVariant;
  href?: string;
  className?: string;
}

export function AppLogo({ variant = "nav", href, className = "" }: AppLogoProps) {
  const { settings } = useCompanySettings();
  const cfg = VARIANTS[variant];
  const name = settings.company_name || "RIDERMO";
  const tagline = settings.tagline || "Dealership Operating System";

  const content = settings.logo_url ? (
    <div className={`flex flex-col ${variant === "login" ? "items-center" : "items-start"} gap-1 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={settings.logo_url}
        alt={`${name} logo`}
        className={`${cfg.imgMaxH} ${cfg.imgMaxW} w-auto object-contain`}
      />
      {cfg.showTagline && tagline && (
        <p className="text-sm text-[#6B6B6B] mt-1">{tagline}</p>
      )}
    </div>
  ) : (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`rounded-lg bg-[#FF4C00] flex items-center justify-center flex-shrink-0 ${
        variant === "login" ? "w-10 h-10 rounded-xl" : "w-7 h-7"
      }`}>
        <DefaultLogoIcon size={variant === "login" ? 22 : 13} />
      </div>
      <div className={variant === "login" ? "text-left" : ""}>
        <span
          className={`font-extrabold tracking-tight leading-none ${
            cfg.dark ? "text-white text-[13px]" : "text-[#0A0A0A] " + (variant === "login" ? "text-2xl font-bold" : "text-[14px]")
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          {name}
        </span>
        {variant === "sidebar" && (
          <p className="text-[9px] text-[#555] leading-tight font-semibold uppercase tracking-widest mt-0.5">
            Dealership ERP
          </p>
        )}
        {cfg.showTagline && (
          <p className="text-sm text-[#6B6B6B] mt-1">{tagline}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center flex-shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
