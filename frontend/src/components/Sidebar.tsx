"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Shield, LayoutDashboard, Search, Grid3X3, Settings, Activity, Zap, Database } from "lucide-react";
import { getHealth, type HealthStatus } from "@/lib/api";
import { SettingsDrawer } from "./SettingsDrawer";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Command Center" },
  { href: "/investigate", icon: Search, label: "Investigations" },
  { href: "/mitre", icon: Grid3X3, label: "MITRE ATT&CK" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null));
    const interval = setInterval(() => {
      getHealth().then(setHealth).catch(() => setHealth(null));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="w-[220px] shrink-0 h-screen flex flex-col"
           style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border-primary)" }}>
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <Shield size={20} style={{ color: "var(--green)" }} />
          <span className="font-bold text-sm tracking-wide" style={{ color: "var(--text-primary)" }}>
            ChainGuard
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: "var(--green-dim)", color: "var(--green)" }}>
            SOC
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === "/investigate" && pathname.startsWith("/investigate/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors"
                style={{
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  borderLeft: isActive ? "2px solid var(--green)" : "2px solid transparent",
                }}
              >
                <item.icon size={16} style={{ color: isActive ? "var(--green)" : "var(--text-muted)" }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Connection Status */}
        <div className="px-3 py-3 space-y-2" style={{ borderTop: "1px solid var(--border-primary)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider px-1"
               style={{ color: "var(--text-muted)" }}>
            Connections
          </div>
          <StatusRow
            icon={<Zap size={12} />}
            label={health?.llm_provider || "LLM"}
            sublabel={health?.llm_model?.split("-").slice(0, 2).join("-") || ""}
            connected={!!health}
          />
          <StatusRow
            icon={<Database size={12} />}
            label="Splunk"
            sublabel={health?.splunk_connected ? `${health.mcp_tools_available} tools` : ""}
            connected={health?.splunk_connected ?? false}
          />
          <StatusRow
            icon={<Activity size={12} />}
            label="MCP Server"
            sublabel={health?.splunk_connected ? "streaming" : ""}
            connected={health?.splunk_connected ?? false}
          />
        </div>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2.5 px-6 py-3 text-[13px] font-medium transition-colors cursor-pointer"
          style={{ borderTop: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}
        >
          <Settings size={16} style={{ color: "var(--text-muted)" }} />
          Settings
        </button>
      </div>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} health={health} />
    </>
  );
}

function StatusRow({ icon, label, sublabel, connected }: {
  icon: React.ReactNode; label: string; sublabel: string; connected: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span style={{ color: connected ? "var(--green)" : "var(--text-muted)" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{label}</div>
        {sublabel && (
          <div className="text-[9px] truncate" style={{ color: "var(--text-muted)" }}>{sublabel}</div>
        )}
      </div>
      <div
        className={`w-1.5 h-1.5 rounded-full ${connected ? "pulse-dot" : ""}`}
        style={{ background: connected ? "var(--green)" : "var(--red)" }}
      />
    </div>
  );
}
