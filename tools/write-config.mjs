// Netlify build step: writes /config.js from environment variables so the
// static pages can read public settings at runtime. Browser JS can't see
// Netlify env vars directly, so this bakes them in at deploy time.
//
//   WHATSAPP_NUMBER  international format, e.g. 2348012345678 (+, spaces and
//                    dashes are stripped). Empty → WhatsApp links stay hidden.
import { writeFileSync } from "node:fs";

const whatsappNumber = (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
const config = { whatsappNumber };

writeFileSync(
  new URL("../config.js", import.meta.url),
  `// Generated at deploy time by tools/write-config.mjs. Do not edit.\nwindow.JAA_CONFIG = ${JSON.stringify(config)};\n`
);
console.log(`config.js written (WhatsApp ${whatsappNumber ? "enabled" : "not set"})`);
