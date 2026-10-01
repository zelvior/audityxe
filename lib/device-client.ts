"use client";

/**
 * Browser-side device identification + fingerprinting. Produces:
 *  - a redundant persistent id (cookie + localStorage + IndexedDB, each
 *    self-healing from the others; the server's signed HttpOnly cookie is
 *    a fourth, tamper-proof copy),
 *  - hashes of many stable hardware/browser signals (canvas, WebGL, audio,
 *    fonts, screen, math, locale/env) — only hashes ever leave the browser,
 *  - automation / tampering indicators.
 * Used purely for abuse prevention (see /privacy).
 */

const ID_KEY = "__ax_did";
const IDB_NAME = "axdev";
const IDB_STORE = "kv";

const isId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{32}$/.test(v);

// ---- hashing -----------------------------------------------------------------

function fnv(str: string): string {
  let h1 = 0x811c9dc5, h2 = 0x1b873593;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  const p = (n: number) => n.toString(16).padStart(8, "0");
  return (p(h1) + p(h2) + p(h1 ^ h2) + p(Math.imul(h1, 3) >>> 0)).slice(0, 32);
}

async function sha(str: string): Promise<string> {
  try {
    if (window.crypto?.subtle) {
      const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    }
  } catch {
    /* fall through */
  }
  return fnv(str);
}

// ---- persistent id stores ------------------------------------------------------

function readCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${ID_KEY}=([a-f0-9]{32})`));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
function writeCookie(id: string) {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ID_KEY}=${id}; Path=/; Max-Age=${60 * 60 * 24 * 730}; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}
function readLs(): string | null {
  try {
    const v = localStorage.getItem(ID_KEY);
    return isId(v) ? v : null;
  } catch {
    return null;
  }
}
function writeLs(id: string) {
  try {
    localStorage.setItem(ID_KEY, id);
  } catch {
    /* ignore */
  }
}
function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function readIdb(): Promise<string | null> {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const r = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(ID_KEY);
      r.onsuccess = () => resolve(isId(r.result) ? r.result : null);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    } finally {
      setTimeout(() => db.close(), 0);
    }
  });
}
async function writeIdb(id: string): Promise<void> {
  const db = await idbOpen();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(id, ID_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export interface StoredIds {
  id: string | null;
  conflict: boolean;
}

/** Majority-vote across stores; a disagreement is itself reported. */
async function readStoredId(): Promise<StoredIds> {
  const found = [readCookie(), readLs(), await readIdb()].filter((v): v is string => !!v);
  if (!found.length) return { id: null, conflict: false };
  const counts = new Map<string, number>();
  found.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  return { id: best, conflict: counts.size > 1 };
}

export async function persistDeviceId(id: string): Promise<void> {
  writeCookie(id);
  writeLs(id);
  await writeIdb(id);
}

// ---- signals ------------------------------------------------------------------------

function canvasHash(): { hash: string; noisy: boolean } {
  try {
    const draw = () => {
      const c = document.createElement("canvas");
      c.width = 280;
      c.height = 60;
      const x = c.getContext("2d");
      if (!x) return "";
      x.textBaseline = "alphabetic";
      x.fillStyle = "#f60";
      x.fillRect(100, 1, 62, 20);
      x.fillStyle = "#069";
      x.font = "15px 'Arial'";
      x.fillText("Audityxe,fp \u{1F9EA} 1.0", 2, 15);
      x.fillStyle = "rgba(102,204,0,0.7)";
      x.font = "18px Times New Roman";
      x.fillText("Audityxe,fp \u{1F9EA} 1.0", 4, 45);
      x.globalCompositeOperation = "multiply";
      x.fillStyle = "rgb(255,0,255)";
      x.beginPath();
      x.arc(50, 30, 20, 0, Math.PI * 2, true);
      x.fill();
      return c.toDataURL();
    };
    const a = draw();
    const b = draw();
    return { hash: fnv(a), noisy: a !== b }; // different on 2 identical draws => canvas-noise anti-fingerprint
  } catch {
    return { hash: "", noisy: false };
  }
}

function webglInfo(): { hash: string; gpu: string; software: boolean } {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return { hash: "", gpu: "", software: false };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR));
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    const params = [
      gl.MAX_TEXTURE_SIZE, gl.MAX_VIEWPORT_DIMS, gl.MAX_VERTEX_ATTRIBS, gl.MAX_VARYING_VECTORS,
      gl.MAX_RENDERBUFFER_SIZE, gl.ALIASED_LINE_WIDTH_RANGE, gl.ALIASED_POINT_SIZE_RANGE,
    ].map((p) => String(gl.getParameter(p)));
    const exts = (gl.getSupportedExtensions() || []).sort().join(",");
    return {
      hash: fnv([vendor, renderer, params.join("|"), exts].join("##")),
      gpu: fnv(`${vendor}|${renderer}`),
      software: /swiftshader|llvmpipe|software|mesa offscreen/i.test(renderer),
    };
  } catch {
    return { hash: "", gpu: "", software: false };
  }
}

async function audioHash(): Promise<string> {
  try {
    const Ctx = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Ctx) return "";
    const ctx = new Ctx(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    [["threshold", -50], ["knee", 40], ["ratio", 12], ["attack", 0], ["release", 0.25]].forEach(([k, v]) => {
      const p = (comp as unknown as Record<string, AudioParam>)[k as string];
      if (p) p.value = v as number;
    });
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buf = await Promise.race([
      ctx.startRendering(),
      new Promise<null>((r) => setTimeout(() => r(null), 1500)),
    ]);
    if (!buf) return "";
    const data = buf.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
    return fnv(sum.toString());
  } catch {
    return "";
  }
}

const FONT_CANDIDATES = [
  "Arial", "Arial Black", "Calibri", "Cambria", "Candara", "Comic Sans MS", "Consolas", "Courier New", "Franklin Gothic Medium",
  "Garamond", "Georgia", "Helvetica", "Helvetica Neue", "Impact", "Lucida Console", "Lucida Sans Unicode", "Microsoft Sans Serif",
  "Palatino Linotype", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana", "Menlo", "Monaco", "Roboto",
  "Ubuntu", "Cantarell", "DejaVu Sans", "Liberation Sans", "Noto Sans", "SF Pro Text", "Avenir", "Futura", "Gill Sans", "Optima",
  "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Source Code Pro",
];
function fontsHash(): string {
  try {
    const bases = ["monospace", "sans-serif", "serif"];
    const span = document.createElement("span");
    span.style.cssText = "position:absolute;left:-9999px;top:-9999px;font-size:72px;visibility:hidden";
    span.textContent = "mmmmmmmmmmlliWQ@#";
    document.body.appendChild(span);
    const baseW: Record<string, number> = {};
    bases.forEach((b) => {
      span.style.fontFamily = b;
      baseW[b] = span.offsetWidth;
    });
    const present = FONT_CANDIDATES.filter((f) =>
      bases.some((b) => {
        span.style.fontFamily = `'${f}',${b}`;
        return span.offsetWidth !== baseW[b];
      })
    );
    document.body.removeChild(span);
    return fnv(present.join(","));
  } catch {
    return "";
  }
}

function mathHash(): string {
  try {
    return fnv([Math.tan(-1e300), Math.sinh(1), Math.cosh(10), Math.expm1(1e-5), Math.atanh(0.5), Math.cbrt(100), Math.log1p(1e-9)].join("|"));
  } catch {
    return "";
  }
}

function isNative(fn: unknown): boolean {
  try {
    return typeof fn === "function" && /\{\s*\[native code\]\s*\}/.test(Function.prototype.toString.call(fn));
  } catch {
    return true;
  }
}

function automationSignals(webglSoftware: boolean, canvasNoisy: boolean): { bot: string[]; tampered: boolean } {
  const bot: string[] = [];
  const nav = navigator as Navigator & { webdriver?: boolean; plugins: PluginArray };
  const w = window as unknown as Record<string, unknown>;
  const ua = nav.userAgent || "";
  try {
    if (nav.webdriver) bot.push("webdriver");
    if (/HeadlessChrome|PhantomJS|Electron\//i.test(ua)) bot.push("headless_ua");
    if (
      w.callPhantom || w._phantom || w.__nightmare || w.domAutomation || w.domAutomationController ||
      w.__selenium_unwrapped || w.__webdriver_evaluate || w.__driver_evaluate || w.__webdriver_script_fn || w._Selenium_IDE_Recorder ||
      Object.keys(document).some((k) => /^\$?cdc_|^__\$webdriver/.test(k)) ||
      Object.keys(w).some((k) => /^cdc_|^\$chrome_asyncScriptInfo/.test(k))
    ) bot.push("automation_globals");
    if (!nav.languages || nav.languages.length === 0) bot.push("no_languages");
    if (screen.width === 0 || screen.height === 0 || (window.outerWidth === 0 && window.outerHeight === 0)) bot.push("zero_screen");
    const isChrome = /Chrome\//.test(ua) && !/Edg\/|OPR\//.test(ua);
    const mobile = /Mobi|Android/i.test(ua);
    if (isChrome && !mobile && nav.plugins && nav.plugins.length === 0) bot.push("no_plugins_chrome");
    if (isChrome && !(w as { chrome?: unknown }).chrome) bot.push("chrome_object_missing");
    if (webglSoftware) bot.push("software_renderer");
    if (canvasNoisy) bot.push("canvas_noise");
  } catch {
    /* ignore */
  }

  let tampered = false;
  try {
    const checks: unknown[] = [
      HTMLCanvasElement.prototype.toDataURL,
      CanvasRenderingContext2D.prototype.getImageData,
      typeof WebGLRenderingContext !== "undefined" ? WebGLRenderingContext.prototype.getParameter : undefined,
      Function.prototype.toString,
      navigator.permissions?.query,
    ].filter((f) => f !== undefined);
    tampered = checks.some((f) => !isNative(f));
    const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, "webdriver");
    if (desc && desc.get && !isNative(desc.get)) tampered = true;
  } catch {
    /* ignore */
  }
  return { bot, tampered };
}

export interface DevicePayload {
  clientId: string | null;
  fpHash: string;
  parts: Record<string, string>;
  bot: string[];
  tampered: boolean;
  ua: string;
  langs: string[];
  tz: string;
  storage: { cookie: boolean; ls: boolean; idb: boolean; conflict: boolean };
}

let payloadPromise: Promise<DevicePayload> | null = null;

export function collectDevicePayload(): Promise<DevicePayload> {
  if (!payloadPromise) payloadPromise = doCollect();
  return payloadPromise;
}

async function doCollect(): Promise<DevicePayload> {
  const stored = await readStoredId();
  const canvas = canvasHash();
  const gl = webglInfo();
  const [audio] = await Promise.all([audioHash()]);
  const fonts = fontsHash();
  const nav = navigator as Navigator & { deviceMemory?: number };
  const n = (v: unknown) => String(v ?? "");

  const screenSig = [screen.width, screen.height, screen.availWidth, screen.availHeight, screen.colorDepth, window.devicePixelRatio].join("x");
  let tz = "";
  let locale = "";
  try {
    const o = Intl.DateTimeFormat().resolvedOptions();
    tz = o.timeZone || "";
    locale = [o.locale, o.calendar, o.numberingSystem].join("|");
  } catch {
    /* ignore */
  }
  const env = [
    n(nav.platform), n(nav.hardwareConcurrency), n(nav.deviceMemory), n(nav.maxTouchPoints), tz, locale,
    (nav.languages || []).join(","), new Date().getTimezoneOffset(),
    window.matchMedia?.("(color-gamut: p3)")?.matches ? "p3" : "srgb",
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "rm" : "",
  ].join("|");

  const partsRaw: Record<string, string> = {
    canvas: canvas.hash,
    webgl: gl.hash,
    gpu: gl.gpu,
    audio,
    fonts,
    screen: screenSig,
    env,
    math: mathHash(),
  };
  const parts: Record<string, string> = {};
  for (const [k, v] of Object.entries(partsRaw)) parts[k] = await sha(`${k}:${v}`);
  const fpHash = await sha(Object.keys(parts).sort().map((k) => `${k}=${parts[k]}`).join("&"));

  const { bot, tampered } = automationSignals(gl.software, canvas.noisy);
  return {
    clientId: stored.id,
    fpHash,
    parts,
    bot,
    tampered,
    ua: navigator.userAgent,
    langs: Array.from(navigator.languages || []),
    tz,
    storage: { cookie: !!readCookie(), ls: !!readLs(), idb: !!stored.id, conflict: stored.conflict },
  };
}

// ---- registration with the server --------------------------------------------------------

export interface RegisterOutcome {
  deviceId: string | null;
  blocked: { message: string; until: string | null } | null;
}

let inflight: Promise<RegisterOutcome> | null = null;
let lastUid: string | null | undefined;
let last: RegisterOutcome | null = null;

/** Registers (or refreshes) this browser with the server. Cached per
 * signed-in uid so it runs once per page load / sign-in change. */
export function registerDevice(getToken: () => Promise<string | null>, uid: string | null): Promise<RegisterOutcome> {
  if (last && lastUid === uid && !last.blocked) return Promise.resolve(last);
  if (inflight && lastUid === uid) return inflight;
  lastUid = uid;
  inflight = (async () => {
    try {
      const payload = await collectDevicePayload();
      const token = uid ? await getToken() : null;
      const res = await fetch("/api/device/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          clientId: payload.clientId,
          fpHash: payload.fpHash,
          parts: payload.parts,
          bot: payload.bot,
          tampered: payload.tampered,
          ua: payload.ua,
          langs: payload.langs,
          tz: payload.tz,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { deviceId?: string | null; blocked?: RegisterOutcome["blocked"] };
      if (data.deviceId) await persistDeviceId(data.deviceId);
      last = { deviceId: data.deviceId || null, blocked: data.blocked || null };
    } catch {
      last = { deviceId: null, blocked: null };
    }
    return last;
  })();
  return inflight;
}

let authCtx: { getToken: () => Promise<string | null>; uid: string | null } | null = null;
export function setDeviceAuthContext(getToken: () => Promise<string | null>, uid: string | null) {
  authCtx = { getToken, uid };
}
export function ensureDeviceReadyFromContext(): Promise<void> {
  return authCtx ? ensureDeviceReady(authCtx.getToken, authCtx.uid) : Promise.resolve();
}

/** Awaited before expensive API calls so the signed device cookie exists
 * by the time the audit request reaches the server. Bounded wait. */
export async function ensureDeviceReady(getToken: () => Promise<string | null>, uid: string | null, timeoutMs = 4000): Promise<void> {
  try {
    await Promise.race([registerDevice(getToken, uid), new Promise((r) => setTimeout(r, timeoutMs))]);
  } catch {
    /* never block the audit on bookkeeping */
  }
}

export function currentDeviceId(): string | null {
  return last?.deviceId || readCookie() || readLs();
}
