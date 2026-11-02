import { NextRequest, NextResponse } from "next/server";
import { TerminalRunner } from "@/lib/terminal";
import { SecretVault } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { binary, args = [], cwd } = body;

    if (!binary || typeof binary !== "string") {
      return NextResponse.json(
        { success: false, error: "Binary executable name is required." },
        { status: 400 }
      );
    }

    const workingDir = cwd || process.cwd();
    const result = await TerminalRunner.execute(binary, args, workingDir);

    return NextResponse.json({
      success: result.success,
      stdout: SecretVault.redactSecrets(result.stdout),
      stderr: SecretVault.redactSecrets(result.stderr),
      exitCode: result.exitCode,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
