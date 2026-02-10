import { execSync, spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

let serverProcess: ChildProcess | null = null;

function findBun(): string {
  // Try common locations — macOS GUI apps don't inherit shell PATH
  const candidates = [
    "bun",
    path.join(process.env.HOME || "", ".bun/bin/bun"),
    "/usr/local/bin/bun",
    "/opt/homebrew/bin/bun",
  ];

  for (const candidate of candidates) {
    try {
      execSync(`${candidate} --version`, { stdio: "ignore" });
      return candidate;
    } catch {
      // not found, try next
    }
  }

  throw new Error(
    "Could not find bun. Please install bun: https://bun.sh/docs/installation"
  );
}

export function startBunServer(port: number, appRoot: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bunPath = findBun();
    const serverScript = path.join(appRoot, "web", "server", "index.ts");

    console.log(`[electron] Starting bun server on port ${port}...`);
    console.log(`[electron] bun: ${bunPath}`);
    console.log(`[electron] script: ${serverScript}`);

    serverProcess = spawn(bunPath, [serverScript], {
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "production",
        __VIBE_PACKAGE_ROOT: path.join(appRoot, "web"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      console.log(`[bun] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[bun:err] ${data.toString().trim()}`);
    });

    serverProcess.on("error", (err) => {
      reject(new Error(`Failed to start bun: ${err.message}`));
    });

    serverProcess.on("exit", (code) => {
      console.log(`[electron] Bun server exited with code ${code}`);
      serverProcess = null;
    });

    // Poll until the server responds
    const maxAttempts = 50;
    let attempt = 0;

    const poll = setInterval(async () => {
      attempt++;
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/sessions`);
        if (res.ok) {
          clearInterval(poll);
          console.log(`[electron] Bun server ready on port ${port}`);
          resolve();
        }
      } catch {
        // not ready yet
      }

      if (attempt >= maxAttempts) {
        clearInterval(poll);
        reject(new Error("Bun server did not start in time"));
      }
    }, 200);
  });
}

export function stopBunServer(): void {
  if (serverProcess) {
    console.log("[electron] Stopping bun server...");
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}
