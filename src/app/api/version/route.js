import { execFile } from "child_process";
import { promisify } from "util";
import pkg from "../../../../package.json" with { type: "json" };
import { UPDATER_CONFIG } from "@/shared/constants/config";

const execFileAsync = promisify(execFile);

async function fetchLatestVersion() {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const args = [
    "view",
    `${UPDATER_CONFIG.npmPackageName}@latest`,
    "version",
    "--registry",
    UPDATER_CONFIG.npmRegistryUrl,
    "--prefer-online",
    "--silent",
  ];

  try {
    const { stdout } = await execFileAsync(npm, args, {
      timeout: 8000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: process.env,
    });
    const version = stdout.trim().split(/\r?\n/).pop()?.trim();
    return version || null;
  } catch {
    return null;
  }
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export async function GET() {
  const latestVersion = await fetchLatestVersion();
  const currentVersion = pkg.version;
  const hasUpdate = latestVersion ? compareVersions(latestVersion, currentVersion) > 0 : false;

  return Response.json({
    currentVersion,
    latestVersion,
    hasUpdate,
    packageName: UPDATER_CONFIG.npmPackageName,
    registryUrl: UPDATER_CONFIG.npmRegistryUrl,
    installCmd: UPDATER_CONFIG.installCmdLatest,
  });
}
