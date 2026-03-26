/**
 * One-off helper: replace `if (!canAccessCompany(auth.dbUser, CID)) { return 403 }`
 * with gateCompanyBilling (adjust CID per line). Run from web/: node scripts/apply-billing-gates.mjs
 * Skips billing/summary and billing/checkout.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, "../app/api");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name === "route.ts") acc.push(p);
  }
  return acc;
}

const block =
  /if \(!canAccessCompany\(auth\.dbUser,\s*([^\)]+)\)\) \{\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\s*\}\s*/g;

for (const file of walk(apiRoot)) {
  const rel = path.relative(apiRoot, file);
  if (rel.startsWith(`billing${path.sep}summary`) || rel.startsWith(`billing${path.sep}checkout`)) continue;
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes("canAccessCompany(auth.dbUser")) continue;
  const orig = s;
  s = s.replace(block, (m, cid) => {
    return `const billing = await gateCompanyBilling(auth.dbUser, ${cid.trim()});\n    if (billing) return billing;\n\n    `;
  });
  if (s === orig) continue;
  if (!s.includes("gateCompanyBilling")) {
    if (s.includes('from "@/lib/api-auth"')) {
      s = s.replace(
        /from "@\/lib\/api-auth"/,
        `from "@/lib/api-auth" // gate`,
      );
    }
  }
  // add import
  if (!s.includes("gateCompanyBilling")) {
    s = s.replace(
      /import \{([^}]+)\} from "@\/lib\/api-auth";/,
      (im, inner) => {
        if (inner.includes("gateCompanyBilling")) return im;
        return `import {${inner.trim()}, gateCompanyBilling } from "@/lib/api-auth";`;
      },
    );
  }
  fs.writeFileSync(file, s);
  console.log("patched", rel);
}
