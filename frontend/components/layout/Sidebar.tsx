"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Bug, Newspaper, Rss, Menu, X,
  Network, FileText, Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/apts", icon: Users, label: "Threat Actors" },
  { href: "/malware", icon: Bug, label: "Malware" },
  { href: "/campaigns", icon: Crosshair, label: "Campaigns" },
  { href: "/iocs", icon: Shield, label: "IOCs" },
  { href: "/cves", icon: Bug, label: "CVEs" },
  { href: "/news", icon: Newspaper, label: "News" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/graph", icon: Network, label: "Graph" },
  { href: "/settings/feeds", icon: Rss, label: "Feeds" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r transition-all duration-200",
        "shrink-0 bg-white border-slate-200",
        "dark:bg-[#0a0f1e] dark:border-[#1e293b]",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-[#1e293b]">
        <div className="relative w-8 h-8 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="absolute inset-0 rounded-lg bg-cyan-400/10 blur-sm" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm tracking-widest uppercase text-cyan-600 dark:text-cyan-400 glow-accent font-mono">
            Lookout
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "ml-auto p-1 rounded cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-white/5",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <Menu className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          ) : (
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1" aria-label="Main navigation">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group",
                "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                "dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/5",
                active && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
                collapsed && "justify-center"
              )}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={cn("w-4 h-4 shrink-0", active && "text-cyan-600 dark:text-cyan-400")}
                aria-hidden="true"
              />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className={cn("p-4 border-t border-slate-200 dark:border-[#1e293b]", collapsed && "flex justify-center")}>
        <ThemeToggle compact={collapsed} />
      </div>
    </aside>
  );
}
