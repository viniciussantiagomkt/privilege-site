import { spawn } from "node:child_process";
process.loadEnvFile(".env.staging.local");
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"],
  { env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
server.stdout.on("data", (b) => {
  output += b;
  process.stdout.write(b);
});
server.stderr.on("data", (b) => process.stderr.write(b));
try {
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(
      () => reject(new Error("Server startup timed out")),
      15000,
    );
    server.stdout.on("data", () => {
      if (output.includes("Ready")) {
        clearTimeout(deadline);
        resolve();
      }
    });
    server.on("exit", (code) => reject(new Error(`Server exited ${code}`)));
  });
  const run = async (script) =>
    await new Promise((resolve) => {
      const child = spawn(process.execPath, [script], {
        env: {
          ...process.env,
          CRM_CHROMIUM_PATH:
            process.env.CRM_CHROMIUM_PATH || "/tmp/crm-chromium",
        },
        stdio: "inherit",
      });
      child.on("exit", resolve);
    });
  const code = await run("tests/crm-browser-smoke.mjs");
  if (code !== 0) process.exitCode = 1;
  if (code === 0 && process.env.CRM_PUBLIC_FIXTURE_TOKEN)
    process.exitCode = await run("tests/crm-public-presentation-browser.mjs");
} finally {
  server.kill("SIGTERM");
}
