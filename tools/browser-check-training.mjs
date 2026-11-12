/*
 * A headless pass over the astronaut training: the section on the Standing
 * orders sheet, the two games a sol, the lock on today's tasks, and what
 * survives a refresh.
 *
 *   npm run build && npm run preview
 *   node tools/browser-check-training.mjs
 *
 * It needs a served build and Chrome on the machine. It is a check, not a
 * test: `npm test` stays free of a browser.
 *
 * The games are played for real — a crate is put in its store by clicking it,
 * an asteroid is clicked when it drifts past — because a mock of the game
 * would check the mock. The two games picked here are the ones a script can
 * play honestly: the cargo round says what every crate is, and an asteroid is
 * an asteroid.
 */
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

/* A clean profile, so the check always starts from a clean day. */
rmSync(process.env.TEMP + '\\training-chrome-profile', { recursive: true, force: true });

const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--remote-debugging-port=9251", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--window-size=1600,1000", "--user-data-dir=" + process.env.TEMP + "\\training-chrome-profile", "about:blank"], { stdio: "ignore" });

let socket;
let nextId = 1;
const pending = new Map();
const errors = [];
const notes = [];
/** True until the check has cleared the record for itself. */
let fresh = true;
/** Set by the page's load event, so a reload can be waited for properly. */
let pageLoaded = false;

function note(text, ok, detail = "") {
  notes.push({ text, ok, detail });
  console.log((ok ? "  ok   " : "  FAIL ") + text + (detail ? "  (" + detail + ")" : ""));
}

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));

  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function ev(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });

  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);

  return result.result.value;
}

async function waitFor(expression, tries = 80) {
  for (let index = 0; index < tries; index += 1) {
    if (await ev(expression)) return true;
    await sleep(250);
  }

  return false;
}

async function tap(selector) {
  const outcome = await ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}); if (!b) return "missing"; if (b.disabled) return "disabled"; b.click(); return "clicked"; })()`);
  await sleep(500);

  return outcome;
}

/** Where the game is. */
async function where() {
  return await ev(`(() => { const ids = ["naming","briefing","supply","launch","interior","landing-site","base","act","debrief"]; const on = ids.find((i) => { const e = document.getElementById(i); return e && !e.hidden; }); return on ?? "none"; })()`);
}

/** Walk the journey to the outpost. */
async function toAct() {
  await send("Page.navigate", { url: "http://localhost:4173/#naming" });
  await sleep(500);

  /* The check starts from a clean record: the training is written down, and
     the last run of this check would otherwise be waiting in the profile. The
     page is reloaded as well, because Chrome restores the last session in a
     profile it has used before, and that restored page still holds the run of
     the last session in its memory - which the storage cannot reach. */
  if (fresh) {
    fresh = false;
    await ev(`(() => { localStorage.clear(); })()`);
    await send("Page.reload", {});
    await sleep(1500);
  }

  await waitFor(`!!document.getElementById("naming") && !document.getElementById("naming").hidden`);
  await waitFor(`(() => { const i = document.querySelector("[data-naming-input]"); const s = document.querySelector("[data-naming-submit]"); if (!i || !s) return false; i.value = "Alex"; i.dispatchEvent(new Event("input", { bubbles: true })); return !s.disabled; })()`);
  await tap("[data-naming-submit]");
  for (let index = 0; index < 10; index += 1) { if ((await tap("#briefing [data-briefing-next]")) !== "clicked") break; }
  await sleep(3400);
  for (let index = 0; index < 6; index += 1) { if ((await tap("#supply [data-supply-next]")) !== "clicked") break; }
  await ev(`(() => { const b = document.querySelector("#supply .supply__choice-button:not([disabled])"); if (b) b.click(); })()`);
  await sleep(500);
  await tap("#supply [data-supply-next]");
  await tap("#supply [data-supply-continue]");
  await waitFor(`(() => { const e = document.getElementById("launch"); return !!e && !e.hidden; })()`);
  await sleep(400);
  await waitFor(`(() => { const b = document.querySelector("#launch [data-launch-skip]"); return !!b && !b.hidden; })()`, 80);
  await tap("#launch [data-launch-skip]");
  await waitFor(`(() => { const p = document.querySelector("#launch [data-launch-parts-panel]"); return !!p && !p.hidden; })()`, 20);
  await tap("#launch [data-launch-parts-continue]");
  await sleep(2000);
  for (let index = 0; index < 8; index += 1) { if ((await tap("#interior [data-interior-next]")) !== "clicked") break; }
  await sleep(1200);
  await tap("#interior [data-interior-landing-go]");
  await sleep(1500);
  await ev(`(() => { const p = document.querySelector("#landing-site .landing-site__pin"); if (p) p.click(); })()`);
  await sleep(800);
  await tap("#landing-site [data-landing-land]");
  await sleep(1500);
  await ev(`(() => { const b = [...document.querySelectorAll("#base button")].find((n) => n.textContent.includes("Land & start sol 1")); if (b) b.click(); })()`);
  await waitFor(`!!document.getElementById("act") && !document.getElementById("act").hidden`);
  await sleep(1500);
}

/** The store a crate belongs in, from what the crate is called. */
const STORE_OF = {
  Fruit: "The Food store",
  Rations: "The Food store",
  Water: "The Water store",
  "Water tank": "The Water store",
  Air: "The Oxygen store",
  "Oxygen tank": "The Oxygen store",
  Battery: "The Energy store",
  "Power cable": "The Energy store",
  Medicine: "The Medical store",
  Bandage: "The Medical store",
  Brick: "The Building store",
  Wrench: "The Building store",
};

/** Open one of the training games from the card. */
async function playCard(name) {
  await ev(`(() => { const b = [...document.querySelectorAll("#act .trn__card")].find((c) => c.querySelector(".trn__card-name")?.textContent === ${JSON.stringify(name)}); if (b) b.querySelector(".trn__play").click(); })()`);
  await sleep(700);

  return await ev(`!!document.querySelector("#act .trn__backdrop")`);
}

/**
 * Drag a crate into its store with the pointer.
 *
 * The cargo round can be played by tapping, and the check used to tap every
 * crate - so the drag was never exercised, and a drag that only worked for the
 * first crate went unnoticed (ISS-086). This drags, and the pointer events are
 * the same ones a finger makes.
 */
async function dragCrate(label, store) {
  await ev(`(() => {
    const crate = [...document.querySelectorAll("#act .trn__crate")].find((n) => n.getAttribute("aria-label") === ${JSON.stringify(label)});
    const shop = [...document.querySelectorAll("#act .trn__store")].find((n) => n.getAttribute("aria-label") === ${JSON.stringify(store)});
    if (!crate || !shop) return false;

    const from = crate.getBoundingClientRect();
    const to = shop.getBoundingClientRect();

    const point = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', bubbles: true, cancelable: true });

    crate.dispatchEvent(new PointerEvent('pointerdown', point(from.left + from.width / 2, from.top + from.height / 2)));
    window.dispatchEvent(new PointerEvent('pointermove', point(from.left + from.width / 2 + 30, from.top + from.height / 2)));
    window.dispatchEvent(new PointerEvent('pointermove', point(to.left + to.width / 2, to.top + to.height / 2)));
    window.dispatchEvent(new PointerEvent('pointerup', point(to.left + to.width / 2, to.top + to.height / 2)));

    return true;
  })()`);
  await sleep(200);
}

/** Play the cargo round honestly: every crate into the store it names. */
async function playCargo() {
  /* The first two crates are dragged and the rest are tapped, so both ways of
     playing are covered - and so a drag that only worked for the first crate
     would fail (ISS-086). */
  const first = await ev(`[...document.querySelectorAll("#act .trn__crate")].map((n) => n.getAttribute("aria-label"))`);
  let dragged = 0;

  for (const label of first.slice(0, 2)) {
    const store = STORE_OF[label];

    if (store === undefined) continue;

    await dragCrate(label, store);
    dragged += 1;
  }

  const left = await ev(`document.querySelectorAll("#act .trn__crate").length`);

  note(
    'the second crate can be dragged as well as the first',
    dragged === 2 && left === first.length - 2,
    `${first.length - left} crates dragged away, ${left} left in the tray`,
  );

  for (let round = 0; round < 12; round += 1) {
    const remaining = await ev(`document.querySelectorAll("#act .trn__crate").length`);

    if (remaining === 0) break;

    const labels = await ev(`[...document.querySelectorAll("#act .trn__crate")].map((n) => n.getAttribute("aria-label"))`);

    for (const label of labels) {
      const store = STORE_OF[label];

      if (store === undefined) continue;

      await ev(`(() => { const c = [...document.querySelectorAll("#act .trn__crate")].find((n) => n.getAttribute("aria-label") === ${JSON.stringify(label)}); if (c) c.click(); })()`);
      await sleep(120);
      await ev(`(() => { const b = [...document.querySelectorAll("#act .trn__store")].find((n) => n.getAttribute("aria-label") === ${JSON.stringify(store)}); if (b) b.click(); })()`);
      await sleep(120);
    }
  }

  return await waitFor(`!!document.querySelector("#act .trn__done-points")`, 40);
}

/** Play the asteroid round honestly: click the rocks, leave the satellites. */
async function playAsteroids() {
  for (let tick = 0; tick < 900; tick += 1) {
    const done = await ev(`!!document.querySelector("#act .trn__done-points")`);

    if (done) return true;

    await ev(`(() => { const t = document.querySelector("#act .trn__target:not(.trn__target--friendly)"); if (t) t.click(); })()`);
    await sleep(100);
  }

  return false;
}

/**
 * Find one pair of matching cards, and check that it is taken off the table.
 *
 * The faces are not in the markup until a card is turned over, so the check
 * turns cards over the way a player does and reads what each one is. The two
 * faces of a pair the game takes away must be the **same face**: a game that
 * compared the wrong cards would take away two cards that look different.
 */
async function findAMemoryPair() {
  const count = async () => await ev(`document.querySelectorAll("#act .trn__face").length`);

  /* The pair is lit up for a moment and then taken off the table, so the
     check waits longer than that before it counts the cards. */
  const SETTLE_MS = 700;

  for (let i = 0; i < 12; i += 1) {
    for (let j = i + 1; j < 12; j += 1) {
      const before = await count();

      if (j >= before) continue;

      /* Turn the first card over and read what it is. The board is drawn again
         after the click, so the card is read from the new board. */
      const first = await ev(`(() => {
        const card = document.querySelectorAll("#act .trn__face")[${i}];
        if (!card) return "";
        card.click();
        const after = document.querySelectorAll("#act .trn__face")[${i}];
        return after ? after.getAttribute("aria-label") : "";
      })()`);
      await sleep(120);

      const second = await ev(`(() => {
        const card = document.querySelectorAll("#act .trn__face")[${j}];
        if (!card) return "";
        card.click();
        const after = document.querySelectorAll("#act .trn__face")[${j}];
        return after ? after.getAttribute("aria-label") : "";
      })()`);
      await sleep(SETTLE_MS);

      const after = await count();

      if (after < before) {
        const hint = await ev(`document.querySelector("#act .trn__hint")?.textContent ?? ""`);

        return { matched: true, before, after, first, second, hint };
      }

      /* Not a pair: they turn back down, and the check tries another two. */
      await sleep(250);
    }
  }

  return { matched: false, before: await count(), after: await count(), first: "", second: "", hint: "" };
}

/** Make sure the Standing orders sheet is open, so the training can be read. */
async function openTraining() {
  await ev(`(() => { if (document.querySelector("#act .trn")) return; const b = document.querySelector('#act .act-tile[data-tile="orders"]'); if (b) b.click(); })()`);
  await sleep(700);
}

/** What the training section says right now. */
async function trainingState() {
  await openTraining();

  return await ev(`(() => {
    const section = document.querySelector("#act .trn");
    const tasks = document.querySelector('#act .act-tile[data-tile="tasks"]');
    return {
      section: !!section,
      cards: document.querySelectorAll("#act .trn__card").length,
      count: document.querySelector("#act .trn__progress-count")?.textContent ?? "",
      points: document.querySelector("#act .trn__progress-meta")?.textContent ?? "",
      tasks: tasks?.querySelector(".act-tile__status")?.textContent ?? "",
      tasksLocked: tasks?.dataset.locked ?? "",
      science: document.querySelector("#act .act-points")?.textContent ?? "",
      callout: document.querySelector("#act .gl__callout")?.textContent ?? "",
    };
  })()`);
}

try {
  let target = null;

  for (let index = 0; index < 40 && target === null; index += 1) {
    await sleep(250);

    try {
      target = (await (await fetch("http://localhost:9251/json")).json()).find((t) => t.type === "page");
    } catch {
      /* Chrome is still starting. */
    }
  }

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }

    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args.map((a) => a.value ?? a.description).join(" "));
    if (message.method === "Page.loadEventFired") pageLoaded = true;
  });

  await send("Runtime.enable");
  await send("Page.enable");

  console.log("1 the journey to the desk");
  await toAct();
  note("the desk is up", (await where()) === "act", await where());

  console.log("2 a new sol: the tasks are locked");
  const first = await trainingState();
  note("the tasks are locked", first.tasksLocked === "true", first.tasks);
  note("the desk says so", first.callout.includes("locked"), first.callout.trim().slice(0, 60));
  note("the desk says how to unlock it", first.callout.includes("training games"), first.callout.trim().slice(0, 80));

  console.log("3 the standing orders hold the training");
  await tap('#act .act-tile[data-tile="orders"]');
  await sleep(700);
  const sheet = await ev(`(() => ({
    section: !!document.querySelector("#act .sheet__body .trn"),
    cards: document.querySelectorAll("#act .trn__card").length,
    count: document.querySelector("#act .trn__progress-count")?.textContent ?? "",
    names: [...document.querySelectorAll("#act .trn__card-name")].map((n) => n.textContent),
  }))()`);
  note("the section is in the standing orders", sheet.section === true);
  note("it holds six games", sheet.cards === 6, sheet.names.join(", "));
  note("the day starts at zero", sheet.count.includes("0/2"), sheet.count);

  console.log("4 every game opens and draws itself");
  for (const [name, drawn] of [
    ["Resource Merge", "#act .trn__tile"],
    ["Memory Match", "#act .trn__face"],
    ["Rover Parking", "#act .trn__ground"],
    ["Solar Panel Power-Up", "#act .trn__wire"],
    ["Cargo Sorting", "#act .trn__crate"],
    ["Asteroid Defender", "#act .trn__arena"],
  ]) {
    const opened = await playCard(name);
    const count = await ev(`document.querySelectorAll(${JSON.stringify(drawn)}).length`);

    note(`${name} opens`, opened === true);
    note(`${name} draws itself`, count > 0, `${count} drawn`);

    if (name === "Memory Match") {
      const pair = await findAMemoryPair();

      note("a matched pair is taken off the table", pair.matched === true, `${pair.before} cards, then ${pair.after}`);
      note("and the two cards were the same face", pair.first === pair.second, `${pair.first} and ${pair.second}`);
      note("and the player is told", pair.hint.includes("pair"), pair.hint);
    }

    await tap("#act .trn__close");
    await sleep(300);
  }

  console.log("5 the first game");
  await tap('#act .act-tile[data-tile="orders"]');
  await sleep(700);
  note("the cargo round opened", (await playCard("Cargo Sorting")) === true);
  const won = await playCargo();
  note("the cargo round was won", won === true);
  const done = await ev(`document.querySelector("#act .trn__done-points")?.textContent ?? ""`);
  note("it paid points", /^\+\d+ POINTS$/.test(done), done);
  await tap("#act .trn__btn--primary");
  await sleep(800);

  const second = await trainingState();
  note("the day is one game on", second.count.includes("1/2"), second.count);
  note("the tasks are still locked", second.tasksLocked === "true", second.tasks);
  note("the science score moved", second.science !== first.science, `${first.science} then ${second.science}`);

  console.log("6 the second game");
  await tap('#act .act-tile[data-tile="orders"]');
  await sleep(700);
  note("the asteroid round opened", (await playCard("Asteroid Defender")) === true);
  note("the asteroid round was won", (await playAsteroids()) === true);
  const paid = await ev(`document.querySelector("#act .trn__done-points")?.textContent ?? ""`);
  note("it paid points", /^\+\d+ POINTS$/.test(paid), paid);
  const unlocked = await ev(`document.querySelector("#act .trn__done-unlocked")?.textContent ?? ""`);
  note("the tasks are unlocked", unlocked.includes("unlocked"), unlocked);
  await tap("#act .trn__btn--primary");
  await sleep(900);

  const third = await trainingState();
  note("the day is two games on", third.count.includes("2/2"), third.count);
  note("the tasks are open", third.tasksLocked === "false", third.tasks);

  console.log("7 a third game is refused");
  await tap('#act .act-tile[data-tile="orders"]');
  await sleep(700);
  await ev(`(() => { const b = [...document.querySelectorAll("#act .trn__card")].find((c) => c.querySelector(".trn__card-name")?.textContent === "Rover Parking"); if (b) b.querySelector(".trn__play").click(); })()`);
  await sleep(700);
  const notice = await ev(`document.querySelector("#act .trn__notice")?.textContent ?? ""`);
  const opened = await ev(`!!document.querySelector("#act .trn__backdrop")`);
  note("the third game does not open", opened === false);
  note("and the player is told why", notice.includes("next sol"), notice);

  console.log("8 a refresh keeps the training");
  const before = await trainingState();

  /*
   * The page is reloaded, not re-walked. `toAct()` starts a *new* mission, and
   * naming clears the training day for one - a new mission is a new day - so
   * the re-walk threw away the very thing this step is about to measure
   * (ISS-096). A refresh is the thing under test.
   *
   * The wait is for the new document's load event: for a moment after a reload
   * CDP still evaluates against the page being left, and that page has a desk
   * on show too, so a poll would answer from the wrong document and the step
   * would pass for the wrong reason.
   */
  pageLoaded = false;
  await send("Page.reload", {});
  for (let index = 0; index < 40 && !pageLoaded; index += 1) await sleep(250);
  await waitFor(`!!document.getElementById("act") && !document.getElementById("act").hidden`);
  await sleep(1200);

  const after = await trainingState();
  note("the day is still two games on", after.count.includes("2/2"), after.count);
  note("the tasks are still open", after.tasksLocked === "false", after.tasks);
  note("the points are still on the score", after.science !== "", after.science);
  note("the science score did not go back to nothing", after.science === before.science, `${before.science} then ${after.science}`);

  console.log("9 the same game again, on the next sol");
  /* The day's training starts again with the sol, so the replay is tested on
     a clean day: the same game twice, and the board has to be a new one - the
     crew is playing again, so the game deals again (ISS-085). */
  await tap('#act .act-tile[data-tile="tasks"]');
  await sleep(700);
  await ev(`(() => { const card = [...document.querySelectorAll("#act .act-order")].find((c) => !c.disabled); if (card) card.click(); })()`);
  await sleep(600);
  /* The button is disabled while the space weather is loading, and a crisis
     replaces the hub on the sol. */
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const crisis = await ev(`!!document.querySelector("#act .gl__choices")`);

    if (crisis) {
      await ev(`(() => { const c = document.querySelector("#act .gl__choice"); if (c) c.click(); })()`);
      await sleep(1400);
      break;
    }

    const outcome = await ev(`(() => {
      const screen = document.getElementById("act");
      const el = [...screen.querySelectorAll("button")].find((n) => n.textContent.trim().includes("Run sol"));
      if (!el) return "missing";
      if (el.disabled) return "disabled";
      el.click();
      return "clicked";
    })()`);

    if (outcome === "clicked") {
      await sleep(1600);
      break;
    }

    await sleep(600);
  }

  await tap('#act .act-tile[data-tile="orders"]');
  await sleep(700);
  const nextSol = await trainingState();
  note("the next sol starts the training again", nextSol.count.includes("0/2"), nextSol.count);

  note("the cargo round opened", (await playCard("Cargo Sorting")) === true);
  const firstBoard = await ev(`[...document.querySelectorAll("#act .trn__crate")].map((n) => n.getAttribute("aria-label")).join(",")`);
  note("the cargo round was won", (await playCargo()) === true);
  await tap("#act .trn__btn--primary");
  await sleep(800);

  await tap('#act .act-tile[data-tile="orders"]');
  await sleep(700);
  note("the same game opens again", (await playCard("Cargo Sorting")) === true);
  const secondBoard = await ev(`[...document.querySelectorAll("#act .trn__crate")].map((n) => n.getAttribute("aria-label")).join(",")`);
  note("and it deals a new board", firstBoard !== secondBoard, `${firstBoard} then ${secondBoard}`);
  note("the second play was won too", (await playCargo()) === true);
  const paidAgain = await ev(`document.querySelector("#act .trn__done-points")?.textContent ?? ""`);
  note("and it paid again", /^\+\d+ POINTS$/.test(paidAgain), paidAgain);
  await tap("#act .trn__btn--primary");
  await sleep(900);

  const replayed = await trainingState();
  note("the day is two games on", replayed.count.includes("2/2"), replayed.count);
  note("the tasks are open", replayed.tasksLocked === "false", replayed.tasks);
  const card = await ev(`(() => { const c = [...document.querySelectorAll("#act .trn__card")].find((x) => x.querySelector(".trn__card-name")?.textContent === "Cargo Sorting"); return (c?.textContent ?? "").replace(/\\s+/g, " "); })()`);
  note("the card says it was played twice", card.includes("2×"), card.trim());

  console.log("ERRORS: " + (errors.length === 0 ? "none" : errors.slice(0, 4).join(" | ")));
  const failed = notes.filter((n) => !n.ok);

  console.log(`${notes.length - failed.length}/${notes.length} checks passed`);

  if (failed.length > 0 || errors.length > 0) process.exitCode = 1;
} catch (error) {
  console.error("failed: " + error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  chrome.kill();
}
