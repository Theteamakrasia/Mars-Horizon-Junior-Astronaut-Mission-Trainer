/*
 * Playing the training games in a headless browser.
 *
 * The desk's work orders are locked until the crew has done two training games
 * (D-075), so any check that wants to stamp an order has to train first. This
 * is that training, in one place, so the two checks that need it do not each
 * grow their own copy.
 *
 * The games are played for real: a crate is put in the store it names, and an
 * asteroid is clicked when it drifts past. A mock of the game would check the
 * mock.
 */

/** The store a crate belongs in, from what the crate is called. */
export const STORE_OF = {
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

/** Play the cargo round honestly: every crate into the store it names. */
export async function playCargoGame(evaluate, sleep) {
  for (let round = 0; round < 12; round += 1) {
    const left = await evaluate(`document.querySelectorAll('#act .trn__crate').length`);

    if (left === 0) break;

    const labels = await evaluate(`[...document.querySelectorAll('#act .trn__crate')].map((n) => n.getAttribute('aria-label'))`);

    for (const label of labels) {
      const store = STORE_OF[label];

      if (store === undefined) continue;

      await evaluate(`(() => { const c = [...document.querySelectorAll('#act .trn__crate')].find((n) => n.getAttribute('aria-label') === ${JSON.stringify(label)}); if (c) c.click(); })()`);
      await sleep(120);
      await evaluate(`(() => { const b = [...document.querySelectorAll('#act .trn__store')].find((n) => n.getAttribute('aria-label') === ${JSON.stringify(store)}); if (b) b.click(); })()`);
      await sleep(120);
    }
  }

  /* The last crate is taken and then the game says so: wait for the screen. */
  for (let tick = 0; tick < 40; tick += 1) {
    if (await evaluate(`!!document.querySelector('#act .trn__done-points')`)) return true;

    await sleep(150);
  }

  return false;
}

/** Play the asteroid round honestly: click the rocks, leave the satellites. */
export async function playAsteroidGame(evaluate, sleep) {
  for (let tick = 0; tick < 900; tick += 1) {
    const done = await evaluate(`!!document.querySelector('#act .trn__done-points')`);

    if (done) return true;

    await evaluate(`(() => { const t = document.querySelector('#act .trn__target:not(.trn__target--friendly)'); if (t) t.click(); })()`);
    await sleep(100);
  }

  return false;
}

/**
 * Train the crew: two games, played for real, so the work orders open.
 *
 * `openGame` is given the name of a training game and has to open it from the
 * Standing orders sheet; it is the check's own business how it gets there.
 */
export async function doTheTraining(evaluate, sleep, openGame) {
  const cargo = await openGame("Cargo Sorting");

  if (!cargo) return { cargo: false, asteroid: false };

  const cargoWon = await playCargoGame(evaluate, sleep);

  await evaluate(`(() => { const b = document.querySelector('#act .trn__close'); if (b) b.click(); })()`);
  await sleep(400);

  const asteroid = await openGame("Asteroid Defender");

  if (!asteroid) return { cargo: cargoWon, asteroid: false };

  const asteroidWon = await playAsteroidGame(evaluate, sleep);

  await evaluate(`(() => { const b = document.querySelector('#act .trn__close'); if (b) b.click(); })()`);
  await sleep(400);

  return { cargo: cargoWon, asteroid: asteroidWon };
}
