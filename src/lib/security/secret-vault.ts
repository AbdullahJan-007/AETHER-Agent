export class SecretVault {
  private static readonly SECRET_PATTERNS: RegExp[] = [
    /AIza[0-9A-Za-z\-_]{35}/g, // Google API Key
    /AIzaSy[0-9A-Za-z\-_]{33}/g, // Gemini specific pattern
    /sk-[0-9A-Za-z]{48}/g, // OpenAI format
    /gsk_[0-9A-Za-z]{48,}/g, // Groq
    /AKIA[0-9A-Z]{16}/g, // AWS Access Key
    /-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/g,
    /ghp_[0-9A-Za-z]{36}/g, // GitHub PAT
    /bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, // JWT Tokens
    /(postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[^\s"'<>]+/gi, // Database connection strings
  ];

  /**
   * Redacts secret strings with [REDACTED-SECRET].
   */
  public static redactSecrets(text: string): string {
    if (!text || typeof text !== "string") return "";
    let output = text;

    for (const pattern of this.SECRET_PATTERNS) {
      output = output.replace(new RegExp(pattern.source, pattern.flags), "[REDACTED-SECRET]");
    }

    // Redact typical .env assignment patterns: KEY, SECRET, TOKEN, PASSWORD
    output = output.replace(
      /([A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|AUTH|PRIVATE|CREDENTIALS)[A-Z0-9_]*\s*=\s*)[^\n\r]+/gi,
      "$1[REDACTED]"
    );

    return output;
  }

  /**
   * Checks if a string contains any known secret patterns.
   */
  public static containsSecret(text: string): boolean {
    if (!text || typeof text !== "string") return false;

    for (const pattern of this.SECRET_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags.replace("g", ""));
      if (re.test(text)) return true;
    }

    return /([A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|AUTH|PRIVATE|CREDENTIALS)[A-Z0-9_]*\s*=\s*)[^\n\r]+/i.test(
      text
    );
  }
}
