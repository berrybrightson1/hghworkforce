/**
 * Browser-only composite fingerprint (userAgent + screen + timezone + canvas hash).
 * Used for trial abuse heuristics — not for security-critical auth.
 */
export async function computeDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined" || !crypto?.subtle) {
    return "";
  }
  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 44;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#c9a84c";
    ctx.fillText("hgh-workforce", 4, 8);
  }
  const canvasData = canvas.toDataURL();
  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(screen.pixelDepth ?? ""),
    canvasData,
  ].join("|");

  const enc = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
