import { useStore } from "../store.js";
import { api } from "../api.js";

const isElectron = !!(window as any).electronAPI?.isElectron;

function modelShortName(model?: string): string {
  if (!model) return "";
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model.split("-")[0] || model;
}

function folderName(cwd?: string): string {
  if (!cwd) return "";
  return cwd.split("/").pop() || cwd;
}

export function TopBar() {
  const currentSessionId = useStore((s) => s.currentSessionId);
  const cliConnected = useStore((s) => s.cliConnected);
  const sessionStatus = useStore((s) => s.sessionStatus);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const taskPanelOpen = useStore((s) => s.taskPanelOpen);
  const setTaskPanelOpen = useStore((s) => s.setTaskPanelOpen);
  const sessionNames = useStore((s) => s.sessionNames);
  const sessions = useStore((s) => s.sessions);

  const isConnected = currentSessionId ? (cliConnected.get(currentSessionId) ?? false) : false;
  const status = currentSessionId ? (sessionStatus.get(currentSessionId) ?? null) : null;
  const sessionName = currentSessionId ? sessionNames.get(currentSessionId) : null;
  const sessionData = currentSessionId ? sessions.get(currentSessionId) : null;
  const model = sessionData?.model;
  const cwd = sessionData?.cwd;

  return (
    <header className={`shrink-0 flex items-center justify-between px-4 py-2.5 bg-cc-card/80 glass border-b border-cc-border ${isElectron ? "pl-20" : ""}`} style={isElectron ? { WebkitAppRegion: "drag" } as React.CSSProperties : undefined}>
      <div className="flex items-center gap-3 min-w-0" style={isElectron ? { WebkitAppRegion: "no-drag" } as React.CSSProperties : undefined}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-cc-muted hover:text-cc-fg hover:bg-cc-hover transition-all duration-150 cursor-pointer btn-press shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Connection status */}
        {currentSessionId && (
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                isConnected ? "bg-cc-success" : "bg-cc-muted opacity-40"
              }`}
            />
            {!isConnected && (
              <button
                onClick={() => currentSessionId && api.relaunchSession(currentSessionId).catch(console.error)}
                className="text-[11px] text-cc-warning hover:text-cc-warning/80 font-medium cursor-pointer hidden sm:inline btn-press"
              >
                Reconnect
              </button>
            )}
          </div>
        )}

        {/* Session name + project folder */}
        {currentSessionId && sessionName && (
          <div className="flex items-center gap-2 min-w-0 ml-1">
            <span className="text-[13px] font-semibold text-cc-fg truncate font-display">
              {sessionName}
            </span>
            {cwd && (
              <>
                <span className="text-cc-muted/40 text-xs">/</span>
                <span className="text-[11px] text-cc-muted truncate font-mono-code max-w-[160px]">
                  {folderName(cwd)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      {currentSessionId && (
        <div className="flex items-center gap-2 text-[12px] text-cc-muted shrink-0" style={isElectron ? { WebkitAppRegion: "no-drag" } as React.CSSProperties : undefined}>
          {status === "compacting" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cc-warning/10">
              <span className="w-1.5 h-1.5 rounded-full bg-cc-warning animate-[pulse-dot_1s_ease-in-out_infinite]" />
              <span className="text-cc-warning font-medium text-[11px]">Compacting</span>
            </div>
          )}

          {status === "running" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cc-primary/8">
              <span className="w-1.5 h-1.5 rounded-full bg-cc-primary animate-[pulse-dot_1s_ease-in-out_infinite]" />
              <span className="text-cc-primary font-medium text-[11px]">Thinking</span>
            </div>
          )}

          {/* Model badge */}
          {model && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-cc-hover text-[11px] font-medium text-cc-muted font-mono-code">
              {modelShortName(model)}
            </span>
          )}

          <button
            onClick={() => setTaskPanelOpen(!taskPanelOpen)}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 cursor-pointer btn-press ${
              taskPanelOpen
                ? "text-cc-primary bg-cc-active"
                : "text-cc-muted hover:text-cc-fg hover:bg-cc-hover"
            }`}
            title="Toggle session panel"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 3a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 000 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
