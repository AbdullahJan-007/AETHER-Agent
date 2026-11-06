import { NextRequest, NextResponse } from "next/server";
import { FsAdapter, PatchEngine } from "@/lib/workspace";
import { SecretVault, PathGuard } from "@/lib/security";
import { validateLocalRequest } from "@/lib/security/proxy";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const security = validateLocalRequest(req);
  if (!security.allowed) return security.response!;
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const rawRoot = searchParams.get("root");
    const root =
      rawRoot && rawRoot.trim() !== "" && rawRoot.trim() !== "/"
        ? rawRoot.trim()
        : process.cwd();

    const rootCheck = PathGuard.validateRoot(root);
    if (!rootCheck.safe) {
      return NextResponse.json({ success: false, error: rootCheck.error }, { status: 400 });
    }

    if (action === "tree") {
      const tree = await FsAdapter.listTree(rootCheck.canonicalPath);
      return NextResponse.json({
        success: true,
        tree,
        canonicalRoot: rootCheck.canonicalPath,
      });
    }

    if (action === "read") {
      const file = searchParams.get("file");
      if (!file) {
        return NextResponse.json({ success: false, error: "File parameter required." }, { status: 400 });
      }
      if (PathGuard.isSensitivePath(file)) {
        return NextResponse.json(
          { success: false, error: "Access to sensitive credential or .git files is prohibited." },
          { status: 403 }
        );
      }
      const content = await FsAdapter.readFile(file, rootCheck.canonicalPath);
      return NextResponse.json({ success: true, content: SecretVault.redactSecrets(content) });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const security = validateLocalRequest(req);
  if (!security.allowed) return security.response!;
  try {
    const body = await req.json();
    const { action, file, content, root } = body;
    const projectRoot =
      typeof root === "string" && root.trim() !== "" && root.trim() !== "/"
        ? root.trim()
        : process.cwd();

    const rootCheck = PathGuard.validateRoot(projectRoot);
    if (!rootCheck.safe) {
      return NextResponse.json({ success: false, error: rootCheck.error }, { status: 400 });
    }

    if (!file || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "File and content are required." },
        { status: 400 }
      );
    }

    if (PathGuard.isSensitivePath(file)) {
      return NextResponse.json(
        { success: false, error: "Modifying sensitive credential or .git files is prohibited." },
        { status: 403 }
      );
    }

    if (action === "stage") {
      let original = "";
      try {
        original = await FsAdapter.readFile(file, rootCheck.canonicalPath);
      } catch {
        original = ""; // New file being created
      }
      const diff = PatchEngine.stagePatch(file, original, content);
      return NextResponse.json({ success: true, diff });
    }

    if (action === "apply") {
      const result = await PatchEngine.applyPatch(file, content, rootCheck.canonicalPath);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, backupPath: result.backupPath });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
