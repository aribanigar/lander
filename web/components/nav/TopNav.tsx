"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { CheckCircle2 } from "lucide-react";

const TABS = [
  { label: "Dashboard",  href: "/dashboard" },
  { label: "Interviews", href: "/interviews" },
  { label: "Pipeline",   href: "/pipeline" },
  { label: "Replies",    href: "/replies" },
  { label: "Resume",     href: "/resume" },
  { label: "Today",      href: "/today" },
  { label: "Globe",      href: "/globe" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur-md border-b flex items-center justify-between px-6 h-[52px]"
      style={{
        background: "rgba(232,235,229,0.88)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
        <div
          className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center"
          style={{ background: "var(--ink)" }}
        >
          <CheckCircle2 size={13} color="#cce832" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-[14px] tracking-[-0.3px]" style={{ color: "var(--ink)" }}>
          Landed
        </span>
      </Link>

      {/* Tabs */}
      <div
        className="flex gap-0.5 rounded-xl px-1 py-1 border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-3 py-1.5 rounded-[9px] text-xs font-medium transition-all whitespace-nowrap"
              style={{
                background: active ? "var(--lime)" : "transparent",
                color: active ? "var(--lime-dark)" : "var(--ink-2)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="px-3 py-1.5 rounded-[9px] text-xs font-medium border transition-all hover:opacity-75"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--ink-2)" }}
        >
          Settings
        </Link>
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  );
}
