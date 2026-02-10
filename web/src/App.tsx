import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useStore } from "./store.js";
import { connectSession } from "./ws.js";
import { Sidebar } from "./components/Sidebar.js";
import { ChatView } from "./components/ChatView.js";
import { TopBar } from "./components/TopBar.js";
import { HomePage } from "./components/HomePage.js";
import { TaskPanel } from "./components/TaskPanel.js";
import { Playground } from "./components/Playground.js";
import { ToastContainer } from "./components/Toast.js";
import { Lightbox } from "./components/Lightbox.js";
import { CommandPalette } from "./components/CommandPalette.js";

function useHash() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); },
    () => window.location.hash,
  );
}

function ResizeHandle({
  side,
  onResize,
  min,
  max,
}: {
  side: "left" | "right";
  onResize: (width: number) => void;
  min: number;
  max: number;
}) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    // Read current width from parent
    const parent = (e.target as HTMLElement).parentElement;
    startWidth.current = parent?.getBoundingClientRect().width ?? 260;

    function handleMouseMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = side === "left"
        ? ev.clientX - startX.current
        : startX.current - ev.clientX;
      const newWidth = Math.min(max, Math.max(min, startWidth.current + delta));
      onResize(newWidth);
    }

    function handleMouseUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [side, onResize, min, max]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`hidden md:block w-1 cursor-col-resize hover:bg-cc-primary/20 active:bg-cc-primary/30 transition-colors shrink-0 ${
        side === "left" ? "-ml-0.5" : "-mr-0.5"
      }`}
    />
  );
}

export default function App() {
  const darkMode = useStore((s) => s.darkMode);
  const currentSessionId = useStore((s) => s.currentSessionId);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const taskPanelOpen = useStore((s) => s.taskPanelOpen);
  const homeResetKey = useStore((s) => s.homeResetKey);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const taskPanelWidth = useStore((s) => s.taskPanelWidth);
  const hash = useHash();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Cmd+B to toggle sidebar, Cmd+K for command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        useStore.getState().setSidebarOpen(!useStore.getState().sidebarOpen);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const s = useStore.getState();
        s.setCommandPaletteOpen(!s.commandPaletteOpen);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-connect to restored session on mount
  useEffect(() => {
    const restoredId = useStore.getState().currentSessionId;
    if (restoredId) {
      connectSession(restoredId);
    }
  }, []);

  if (hash === "#/playground") {
    return <Playground />;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="h-[100dvh] flex font-sans-ui bg-cc-bg text-cc-fg antialiased bg-noise">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => useStore.getState().setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, inline on desktop */}
      <div
        className={`
          fixed md:relative z-40 md:z-auto
          h-full shrink-0 transition-all duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          overflow-hidden
        `}
        style={{ width: sidebarOpen ? (isMobile ? 260 : sidebarWidth) : 0 }}
      >
        <Sidebar />
      </div>

      {/* Sidebar resize handle */}
      {sidebarOpen && (
        <ResizeHandle
          side="left"
          onResize={(w) => useStore.getState().setSidebarWidth(w)}
          min={200}
          max={400}
        />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-hidden">
          {currentSessionId ? (
            <ChatView sessionId={currentSessionId} />
          ) : (
            <HomePage key={homeResetKey} />
          )}
        </div>
      </div>

      {/* Task panel — overlay on mobile, inline on desktop */}
      {currentSessionId && (
        <>
          {/* Mobile overlay backdrop */}
          {taskPanelOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-30 lg:hidden"
              onClick={() => useStore.getState().setTaskPanelOpen(false)}
            />
          )}

          {/* Task panel resize handle */}
          {taskPanelOpen && (
            <ResizeHandle
              side="right"
              onResize={(w) => useStore.getState().setTaskPanelWidth(w)}
              min={220}
              max={400}
            />
          )}

          <div
            className={`
              fixed lg:relative z-40 lg:z-auto right-0 top-0
              h-full shrink-0 transition-all duration-200
              ${taskPanelOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
              overflow-hidden
            `}
            style={{ width: taskPanelOpen ? (isMobile ? 280 : taskPanelWidth) : 0 }}
          >
            <TaskPanel sessionId={currentSessionId} />
          </div>
        </>
      )}

      {/* Global overlays */}
      <ToastContainer />
      <Lightbox />
      <CommandPalette />
    </div>
  );
}
