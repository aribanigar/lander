"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard, CalendarDays, Layers2, MessageSquare,
  FileText, Clock, Globe2, Menu, Send, Zap,
  ChevronDown, ChevronRight, BrainCircuit, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Nav structure ─── */
type NavItem = {
  label: string;
  href?: string;
  icon?: React.ElementType;
  children?: { label: string; href: string }[];
};

type NavGroup = {
  label?: string;      // section label (grey caps) — omit for no label
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Apply",
    items: [
      { label: "Pipeline",   href: "/pipeline",   icon: Layers2 },
      { label: "Today",      href: "/today",      icon: Clock },
      { label: "Globe",      href: "/globe",      icon: Globe2 },
    ],
  },
  {
    label: "Network",
    items: [
      {
        label: "Outreach",
        icon: Send,
        children: [
          { label: "Warm messages", href: "/outreach" },
          { label: "Follow-ups",    href: "/outreach?tab=followups" },
        ],
      },
      { label: "Referrals", href: "/referrals", icon: Users },
      { label: "Signals",   href: "/signals",   icon: Zap },
    ],
  },
  {
    label: "Track",
    items: [
      { label: "Interviews",   href: "/interviews",   icon: CalendarDays },
      { label: "Replies",      href: "/replies",      icon: MessageSquare },
      { label: "Intelligence", href: "/intelligence", icon: BrainCircuit },
    ],
  },
  {
    label: "Profile",
    items: [
      { label: "Resume", href: "/resume", icon: FileText },
    ],
  },
];

/* ─── Sidebar nav item ─── */
function NavRow({
  item,
  pathname,
  depth = 0,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  depth?: number;
  onClick?: () => void;
}) {
  const hasChildren = !!item.children?.length;
  const isActive    = item.href ? pathname === item.href || pathname.startsWith(item.href + "?") : false;
  const childActive = item.children?.some((c) => pathname.startsWith(c.href.split("?")[0]));

  const [open, setOpen] = useState(isActive || !!childActive);
  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
            (childActive || open) ? "opacity-100" : "opacity-70 hover:opacity-100"
          )}
          style={{ color: childActive ? "var(--ink)" : "var(--ink-2)" }}
        >
          {Icon && <Icon size={14} className="flex-shrink-0" style={{ color: childActive ? "var(--ink)" : "var(--ink-3)" }} />}
          <span className="flex-1 text-left">{item.label}</span>
          {open
            ? <ChevronDown size={12} style={{ color: "var(--ink-3)" }} />
            : <ChevronRight size={12} style={{ color: "var(--ink-3)" }} />}
        </button>

        {open && (
          <div className="mt-0.5 ml-5 space-y-0.5 border-l pl-3" style={{ borderColor: "var(--border)" }}>
            {item.children!.map((child) => {
              const childIsActive = pathname === child.href.split("?")[0];
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onClick}
                  className="block px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    childIsActive
                      ? { color: "var(--ink)", fontWeight: 600 }
                      : { color: "var(--ink-3)" }
                  }
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all relative",
        isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
      )}
      style={isActive
        ? { background: "var(--lime)", color: "var(--lime-dark)", fontWeight: 600 }
        : { color: "var(--ink-2)" }
      }
    >
      {/* Active left-border accent (only when not highlighted) */}
      {depth === 0 && Icon && (
        <Icon
          size={14}
          className="flex-shrink-0"
          style={{ color: isActive ? "var(--lime-dark)" : "var(--ink-3)" }}
        />
      )}
      <span>{item.label}</span>
    </Link>
  );
}

/* ─── Full sidebar content (shared between desktop and mobile overlay) ─── */
function SidebarContent({
  pathname,
  applying,
  onApply,
  onNavClick,
}: {
  pathname: string;
  applying: boolean;
  onApply: () => void;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 flex-shrink-0"
        style={{ height: 56, borderBottom: "0.5px solid var(--border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mark.svg" alt="" className="w-7 h-7 rounded-lg flex-shrink-0" />
        <span className="font-semibold text-sm" style={{ color: "var(--ink)", letterSpacing: "-0.3px" }}>
          Landed
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div
                className="px-3 mb-1.5 text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: "var(--ink-3)" }}
              >
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Apply Now */}
      <div className="px-3 py-4 flex-shrink-0" style={{ borderTop: "0.5px solid var(--border)" }}>
        <button
          onClick={onApply}
          disabled={applying}
          className="w-full text-sm font-mono font-medium px-3 py-2.5 rounded-xl transition-opacity hover:opacity-85 disabled:opacity-50 text-left"
          style={{ background: "var(--ink)", color: "var(--lime)", border: "none", cursor: applying ? "wait" : "pointer" }}
        >
          {applying ? "Running…" : "+ Apply Now"}
        </button>
      </div>
    </>
  );
}

/* ─── Layout ─── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname                        = usePathname();
  const [applying, setApplying]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);

  const handleApplyNow = async () => {
    setApplying(true);
    try {
      await fetch("/api/jobs/apply", { method: "POST" });
    } finally {
      setApplying(false);
    }
  };

  // Derive the current page label from the nav tree for the header
  const activeLabel = (() => {
    for (const group of NAV) {
      for (const item of group.items) {
        if (item.href && pathname === item.href) return item.label;
        if (item.children) {
          for (const child of item.children) {
            if (pathname === child.href.split("?")[0]) return child.label;
          }
          // Parent match (e.g. /outreach)
          if (item.children.some((c) => pathname.startsWith(c.href.split("?")[0]))) return item.label;
        }
      }
    }
    return "Dashboard";
  })();

  // Derive the section group label
  const sectionLabel = (() => {
    for (const group of NAV) {
      for (const item of group.items) {
        if (item.href && pathname === item.href) return group.label ?? null;
        if (item.children?.some((c) => pathname.startsWith(c.href.split("?")[0]))) return group.label ?? null;
      }
    }
    return null;
  })();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--page)" }}>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.2)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          width: 220,
          minWidth: 220,
          background: "var(--card)",
          borderRight: "0.5px solid var(--border)",
        }}
      >
        <SidebarContent
          pathname={pathname}
          applying={applying}
          onApply={handleApplyNow}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ══ MAIN PANEL ══ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Top bar (thin — just hamburger + user) ── */}
        <header
          className="flex items-center justify-between px-5 flex-shrink-0 lg:justify-end"
          style={{
            height: 48,
            background: "rgba(232,235,229,0.92)",
            borderBottom: "0.5px solid var(--border)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Hamburger (mobile only) */}
          <button
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: "var(--ink)" }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <UserButton afterSignOutUrl="/" />
        </header>

        {/* ── Inner page header ── */}
        <div
          className="flex-shrink-0 px-6 pt-5 pb-4"
          style={{ borderBottom: "0.5px solid var(--border)", background: "var(--page)" }}
        >
          {sectionLabel && (
            <div className="text-xs font-medium mb-0.5" style={{ color: "var(--ink-3)" }}>
              {sectionLabel}
            </div>
          )}
          <h1
            className="text-2xl font-bold tracking-tight leading-none"
            style={{ color: "var(--ink)", letterSpacing: "-0.5px" }}
          >
            {activeLabel}
          </h1>
        </div>

        {/* ── Scrollable content ── */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
