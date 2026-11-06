import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { FileNode } from "./diff-calculator";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".superpowers",
  ".turbo",
  ".cache",
  ".idea",
  ".vscode",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".wav",
]);

const MAX_VIRTUAL_FILES = 400;
const MAX_VIRTUAL_FILE_BYTES = 512 * 1024; // 512 KB per file in browser virtual mode

export function isSensitiveRelativePath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/").trim();
  const parts = normalized.split("/").filter(Boolean);
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (/^\.env($|\..*)/i.test(lower) && lower !== ".env.example" && lower !== ".env.sample") {
      return true;
    }
    if (
      lower === "id_rsa" ||
      lower === "id_ed25519" ||
      lower.endsWith(".pem") ||
      lower.endsWith(".key") ||
      lower === ".npmrc"
    ) {
      return true;
    }
  }
  return false;
}

function shouldSkipFile(relPath: string): boolean {
  const parts = relPath.replace(/\\/g, "/").split("/").filter(Boolean);
  for (const part of parts) {
    if (IGNORED_DIRS.has(part) || part.endsWith(".backup")) return true;
  }
  if (isSensitiveRelativePath(relPath)) return true;
  const lower = relPath.toLowerCase();
  for (const ext of BINARY_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export const DEFAULT_STARTER_FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "aether-cloud-starter",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        test: "vitest run",
      },
      dependencies: {
        next: "16.2.9",
        react: "19.2.4",
        "react-dom": "19.2.4",
        "lucide-react": "^0.469.0",
      },
    },
    null,
    2
  ),
  "src/app/page.tsx": `import React from "react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">AETHER Hybrid Starter Workspace</h1>
        <p className="text-slate-600">
          Connect a local folder from your PC using "Open PC Folder" above, or ask AETHER to architect and build new features directly in this workspace.
        </p>
      </div>
    </main>
  );
}
`,
  "src/lib/utils.ts": `export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
`,
  "README.md": `# AETHER Hybrid Workspace\n\nThis virtual workspace runs in your browser and connects to AETHER's LangChain Agent.\nClick **Open PC Folder** in the top bar to mount any folder from your computer.\n`,
};

export function buildVirtualFileTree(virtualFiles: Record<string, string>): FileNode[] {
  const dirs = new Set<string>();
  const nodes: FileNode[] = [];

  const sortedPaths = Object.keys(virtualFiles).sort();
  for (const filePath of sortedPaths) {
    const clean = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!clean || isSensitiveRelativePath(clean)) continue;

    const parts = clean.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/");
      if (!dirs.has(dirPath)) {
        dirs.add(dirPath);
        nodes.push({
          path: dirPath,
          name: parts[i - 1],
          type: "directory",
        });
      }
    }

    const content = virtualFiles[filePath] ?? "";
    nodes.push({
      path: clean,
      name: parts[parts.length - 1],
      type: "file",
      size: new Blob([content]).size,
    });
  }

  return nodes;
}

export async function pickBrowserDirectory(): Promise<{
  folderName: string;
  dirHandle: unknown;
  files: Record<string, string>;
}> {
  const win = window as unknown as {
    showDirectoryPicker?: (opts?: { mode?: string }) => Promise<any>;
  };
  if (typeof win.showDirectoryPicker !== "function") {
    throw new Error(
      "Your browser does not support showDirectoryPicker. Use the 'Upload Folder' button instead."
    );
  }

  const dirHandle = await win.showDirectoryPicker({ mode: "readwrite" });
  const files: Record<string, string> = {};
  let count = 0;

  async function walk(handle: any, prefix: string) {
    if (count >= MAX_VIRTUAL_FILES) return;
    for await (const [name, entry] of handle.entries()) {
      if (count >= MAX_VIRTUAL_FILES) break;
      const relPath = prefix ? `${prefix}/${name}` : name;
      if (shouldSkipFile(relPath)) continue;

      if (entry.kind === "directory") {
        await walk(entry, relPath);
      } else if (entry.kind === "file") {
        try {
          const file: File = await entry.getFile();
          if (file.size <= MAX_VIRTUAL_FILE_BYTES) {
            files[relPath] = await file.text();
            count++;
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await walk(dirHandle, "");
  return {
    folderName: dirHandle.name || "pc-workspace",
    dirHandle,
    files,
  };
}

export async function readUploadedFiles(fileList: FileList): Promise<{
  folderName: string;
  files: Record<string, string>;
}> {
  const files: Record<string, string> = {};
  let folderName = "uploaded-workspace";
  let count = 0;

  for (let i = 0; i < fileList.length && count < MAX_VIRTUAL_FILES; i++) {
    const file = fileList[i];
    const rawRel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const parts = rawRel.replace(/\\/g, "/").split("/").filter(Boolean);
    if (parts.length > 1 && i === 0) {
      folderName = parts[0];
    }
    const relPath = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
    if (!relPath || shouldSkipFile(relPath)) continue;
    if (file.size <= MAX_VIRTUAL_FILE_BYTES) {
      try {
        files[relPath] = await file.text();
        count++;
      } catch {
        // Skip binary/unreadable file
      }
    }
  }

  return { folderName, files };
}

export async function applyChangesToBrowserDirectory(
  dirHandle: any,
  changes: Array<{ filePath: string; proposedContent: string }>
): Promise<string[]> {
  const applied: string[] = [];

  for (const change of changes) {
    const clean = change.filePath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!clean || isSensitiveRelativePath(clean)) {
      throw new Error(`Refusing to write sensitive or invalid path: ${change.filePath}`);
    }

    const parts = clean.split("/").filter(Boolean);
    let currentDir = dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true });
    }

    const fileName = parts[parts.length - 1];

    // Create .backup if original file exists
    try {
      const existingHandle = await currentDir.getFileHandle(fileName, { create: false });
      const existingFile: File = await existingHandle.getFile();
      const existingText = await existingFile.text();
      const backupHandle = await currentDir.getFileHandle(`${fileName}.backup`, { create: true });
      const backupWritable = await backupHandle.createWritable();
      await backupWritable.write(existingText);
      await backupWritable.close();
    } catch {
      // File is new, no backup needed
    }

    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(change.proposedContent);
    await writable.close();
    applied.push(clean);
  }

  return applied;
}

export async function downloadVirtualWorkspaceZip(
  projectName: string,
  virtualFiles: Record<string, string>
): Promise<void> {
  const zip = new JSZip();
  for (const [filePath, content] of Object.entries(virtualFiles)) {
    if (!isSensitiveRelativePath(filePath)) {
      zip.file(filePath, content);
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const safeName = (projectName || "aether-workspace").replace(/[^a-zA-Z0-9-_]/g, "-");
  saveAs(blob, `${safeName}.zip`);
}
