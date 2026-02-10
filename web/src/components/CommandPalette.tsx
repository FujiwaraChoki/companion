import { useState, useEffect, useRef, useMemo } from "react";
import { useStore } from "../store.js";
import { connectSession, disconnectSession } from "../ws.js";

interface PaletteAction {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette() {
  const open = useStore((s) => s.commandPaletteOpen);
  const setOpen = useStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sessions = useStore((s) => s.sessions);
  const sdkSessions = useStore((s) => s.sdkSessions);
  const sessionNames = useStore((s) => s.sessionNames);
  const currentSessionId = useStore((s) => s.currentSessionId);

  const actions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [];

    // Session actions
    const allIds = new Set<string>();
    for (const id of sessions.keys()) allIds.add(id);
    for (const s of sdkSessions) if (!s.archived) allIds.add(s.sessionId);

    for (const id of allIds) {
      if (id === currentSessionId) continue;
      const name = sessionNames.get(id) || id.slice(0, 8);
      list.push({
        id: `session-${id}`,
        label: `Switch to: ${name}`,
        category: "Sessions",
        icon: (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <path d="M5 8h6" />
          </svg>
        ),
        action: () => {
          if (currentSessionId) disconnectSession(currentSessionId);
          useStore.getState().setCurrentSession(id);
          connectSession(id);
        },
      });
    }

    // UI actions
    list.push({
      id: "new-session",
      label: "New Session",
      category: "Navigation",
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M8 3v10M3 8h10" />
        </svg>
      ),
      action: () => {
        if (currentSessionId) disconnectSession(currentSessionId);
        useStore.getState().newSession();
      },
    });

    list.push({
      id: "toggle-dark",
      label: useStore.getState().darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
      category: "UI",
      icon: (
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 opacity-60">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM8 13V3a5 5 0 010 10z" />
        </svg>
      ),
      action: () => useStore.getState().toggleDarkMode(),
    });

    list.push({
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      category: "UI",
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <rect x="1" y="2" width="14" height="12" rx="2" />
          <path d="M5 2v12" />
        </svg>
      ),
      action: () => {
        const s = useStore.getState();
        s.setSidebarOpen(!s.sidebarOpen);
      },
    });

    list.push({
      id: "toggle-tasks",
      label: "Toggle Task Panel",
      category: "UI",
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path d="M3 4h10M3 8h10M3 12h6" strokeLinecap="round" />
        </svg>
      ),
      action: () => {
        const s = useStore.getState();
        s.setTaskPanelOpen(!s.taskPanelOpen);
      },
    });

    return list;
  }, [sessions, sdkSessions, sessionNames, currentSessionId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keep index in bounds
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-palette-index]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      filtered[selectedIndex].action();
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  if (!open) return null;

  // Group by category
  const grouped = new Map<string, PaletteAction[]>();
  for (const a of filtered) {
    let arr = grouped.get(a.category);
    if (!arr) { arr = []; grouped.set(a.category, arr); }
    arr.push(a);
  }

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 animate-[fadeIn_0.1s_ease-out]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-cc-card border border-cc-border rounded-2xl shadow-dropdown overflow-hidden animate-[scaleIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-cc-border">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="w-full text-sm bg-transparent text-cc-fg placeholder:text-cc-muted focus:outline-none"
          />
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-cc-muted">No results</div>
          )}
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-cc-muted uppercase tracking-wider">
                {category}
              </div>
              {items.map((item) => {
                const idx = flatIndex++;
                return (
                  <button
                    key={item.id}
                    data-palette-index={idx}
                    onClick={() => { item.action(); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors cursor-pointer ${
                      idx === selectedIndex ? "bg-cc-hover" : "hover:bg-cc-hover/50"
                    }`}
                  >
                    <span className="text-cc-muted shrink-0">{item.icon}</span>
                    <span className="text-sm text-cc-fg">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-cc-border flex items-center gap-3 text-[11px] text-cc-muted">
          <span><kbd className="px-1 py-0.5 rounded bg-cc-hover text-[10px] font-mono-code">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-cc-hover text-[10px] font-mono-code">↵</kbd> select</span>
          <span><kbd className="px-1 py-0.5 rounded bg-cc-hover text-[10px] font-mono-code">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
