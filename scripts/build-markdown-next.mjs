import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

// Resolve the installed package root robustly, regardless of how npm placed it.
const pkgJsonPath = (() => {
  try {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    return fileURLToPath(new URL("package.json", import.meta.resolve("markdown-next/")));
  } catch {
    // Fallback: Node doesn't support import.meta.resolve in some contexts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolved = require.resolve("markdown-next/package.json");
    return resolved;
  }
})();

const pkgRoot = dirname(pkgJsonPath);
const originalTsconfigPath = join(pkgRoot, "tsconfig.json");

if (!exists(originalTsconfigPath)) {
  throw new Error(
    `markdown-next tsconfig.json not found at ${originalTsconfigPath}. ` +
      `Package root resolved to ${pkgRoot}`,
  );
}

// Create a custom tsconfig that excludes test files
const originalTsconfig = JSON.parse(fs.readFileSync(originalTsconfigPath, "utf-8"));
const buildTsconfig = {
  ...originalTsconfig,
  compilerOptions: {
    ...originalTsconfig.compilerOptions,
    rootDir: "src",
  },
  include: ["src/**/*"],
  exclude: ["test/**/*", "node_modules/**/*"],
};

const buildTsconfigPath = join(pkgRoot, "tsconfig.build.json");
fs.writeFileSync(buildTsconfigPath, JSON.stringify(buildTsconfig, null, 2));

// Build lib/ inside markdown-next
try {
  execFileSync("npx", ["--yes", "tsc", "-p", buildTsconfigPath], {
    stdio: "inherit",
  });
} finally {
  // Clean up the temporary tsconfig
  fs.unlinkSync(buildTsconfigPath);
}


