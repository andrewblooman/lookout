"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 transition-colors duration-150 cursor-pointer",
        compact ? "p-1.5 rounded-lg hover:bg-white/5" : "w-full px-3 py-2 rounded-lg hover:bg-white/5"
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="w-4 h-4 shrink-0" aria-hidden="true" /> : <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />}
      {!compact && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
