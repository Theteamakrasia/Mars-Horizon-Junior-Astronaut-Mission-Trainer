/*
 * A headless pass over the whole journey: naming, briefing, supply, launch,
 * interior, landing site and the outpost.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-journey.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 * The other two browser checks look at one screen each. This one is here
 * because a screen can be perfect on its own and unreachable from the one
 * before it, and the launch reel in particular takes its own time before it
 * will let the player on.
 *
 * The reel is cut short with its SKIP button rather than watched to the end:
 * that is the path a player takes, the check finishes in seconds rather than
 * half a minute, and the button gets exercised on the way through.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new","--remote-debugging-port=9250","--disable-gpu","--no-first-run","--no-default-browser-check","--window-size=1600,1000","--user-data-dir=" + process.env.TEMP + "\\journey-chrome-profile","about:blank"], { stdio: "ignore" });
let socket; let nextId = 1; const pending = new Map(); const errors = [];
function send(m, p = {}) { const id = nextId++; socket.send(JSON.stringify({ id, method: m, params: p })); return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej })); }
async function ev(e) { const r = await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; }
async function waitFor(e, t = 80) { for (let i = 0; i < t; i += 1) { if (await ev(e)) return true; await sleep(250); } return false; }
async function tap(sel) { const c = await ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return "missing"; if (b.disabled) return "disabled"; b.click(); return "clicked"; })()`); await sleep(600); return c; }
async function where() { return await ev(`(() => { const ids = ["naming","briefing","supply","launch","interior","landing-site","base","act","debrief"]; const on = ids.find((i) => { const e = document.getElementById(i); return e && !e.hidden; }); return on ?? "none"; })()`); }
try {
  let target = null;
  for (let i = 0; i < 40 && target === null; i += 1) { await sleep(250); try { target = (await (await fetch("http://localhost:9250/json")).json()).find((t) => t.type === "page"); } catch {} }
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.addEventListener("open", res); socket.addEventListener("error", rej); });
  socket.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id !== undefined && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); if (m.error) reject(new Error(m.error.message)); else resolve(m.result); } if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" ")); });
  await send("Runtime.enable"); await send("Page.enable");
  /* `localhost`, not `127.0.0.1`: Vite's dev server listens on the IPv6 loopback
     by default, and a browser asked for the IPv4 address gets nothing at all.
     Every step then reads "none" and the check looks like a game problem. */
  await send("Page.navigate", { url: BASE + "/#naming" });
  await waitFor(`!!document.getElementById("naming") && !document.getElementById("naming").hidden`);
  await waitFor(`(() => { const i = document.querySelector("[data-naming-input]"); const s = document.querySelector("[data-naming-submit]"); if (!i || !s) return false; i.value = "Alex"; i.dispatchEvent(new Event("input", { bubbles: true })); return !s.disabled; })()`);
  await tap("[data-naming-submit]");
  console.log("1 naming -> " + await where());
  for (let i = 0; i < 10; i += 1) { const r = await tap("#briefing [data-briefing-next]"); if (r !== "clicked") break; }
  await sleep(3400);
  console.log("2 briefing -> " + await where());
  for (let i = 0; i < 6; i += 1) { const r = await tap("#supply [data-supply-next]"); if (r !== "clicked") break; }
  const choice = await ev(`(() => { const b = document.querySelector("#supply .supply__choice-button:not([disabled])"); if (!b) return "none"; b.click(); return "clicked"; })()`);
  await sleep(500);
  await tap("#supply [data-supply-next]");
  await tap("#supply [data-supply-continue]");
  console.log("3 supply -> " + await where() + " (choice " + choice + ")");
  // The launch screen is up. The title card is the one beat that always plays,
  // so the SKIP button must not be there yet.
  await waitFor(`(() => { const e = document.getElementById("launch"); return !!e && !e.hidden; })()`);
  const launchAt = Date.now();
  await sleep(400);
  console.log("   skip during the title card: " + await ev(`(() => { const b = document.querySelector("#launch [data-launch-skip]"); if (!b) return "missing"; return b.hidden ? "hidden" : "VISIBLE (wrong)"; })()`));
  // Then it appears - halfway through the departure - and pressing it cuts the
  // reel and opens the parts tour. The button is the way past eight seconds of
  // film, so it has to turn up long before that.
  const skipShown = await waitFor(`(() => { const b = document.querySelector("#launch [data-launch-skip]"); return !!b && !b.hidden; })()`, 80);
  const skipAfter = Date.now() - launchAt;
  console.log("   skip appeared: " + skipShown + " after " + skipAfter + "ms");
  // The number is approximate: the check sees the screen up to 250ms after it
  // mounted, and polls for the button on the same 250ms tick. The threshold is
  // set well above the true 2625ms, so a regression back to the old 5250ms
  // fails loudly rather than passing by a hair.
  if (skipAfter > 3500) errors.push("the skip button took " + skipAfter + "ms to appear - it must be up halfway through the departure, not with the films");
  console.log("   launch skip: " + await tap("#launch [data-launch-skip]"));
  console.log("   parts tour open: " + await waitFor(`(() => { const p = document.querySelector("#launch [data-launch-parts-panel]"); return !!p && !p.hidden; })()`, 20));
  console.log("   launch parts: " + await tap("#launch [data-launch-parts-continue]"));
  await sleep(2000);
  console.log("4 launch -> " + await where());
  for (let i = 0; i < 8; i += 1) { const r = await tap("#interior [data-interior-next]"); if (r !== "clicked") break; }
  await sleep(1200);
  console.log("5 interior -> " + await where());
  await tap("#interior [data-interior-landing-go]");
  await sleep(1500);
  console.log("6 landing -> " + await where());
  await ev(`(() => { const p = document.querySelector("#landing-site .landing-site__pin"); if (p) p.click(); })()`);
  await sleep(800);
  console.log("   land: " + await tap("#landing-site [data-landing-land]") + " -> " + await where());
  /* The landing film plays between the map and the outpost. Its own Skip
     button is the way past it, and it is the path a player takes. */
  await waitFor(`!!document.getElementById("landing-cinematic") && !document.getElementById("landing-cinematic").hidden`);
  await tap("#landing-cinematic .landing-cinematic__skip");
  await sleep(1500);
  console.log("7 base: " + await where() + " | " + await ev(`document.querySelector("#base .gl__title")?.textContent ?? "no panel"`));
  console.log("ERRORS: " + (errors.length === 0 ? "none" : errors.slice(0, 4).join(" | ")));
} catch (e) { console.error("failed: " + e.message); } finally { socket?.close(); chrome.kill(); }
