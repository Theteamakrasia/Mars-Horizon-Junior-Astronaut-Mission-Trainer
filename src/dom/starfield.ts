/** Star colours, weighted towards white with a few tinted highlights. */
const STAR_COLORS = ['#ffffff', '#ffffff', '#cfe4ff', '#ffe6c9'] as const;

/** Depth layers, from most distant to nearest. */
const LAYERS = ['star-layer--far', 'star-layer--mid', 'star-layer--near'] as const;

/** Stars per layer — nearer layers get more and larger stars. */
const STARS_PER_LAYER = [70, 45, 25] as const;

/** Random float in an inclusive range. */
function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Builds the pulsing starfield.
 *
 * Sizes, opacities and animation delays are randomised per star and handed to
 * CSS as custom properties. The twinkle timings are staggered so the stars
 * pulse independently instead of blinking in unison.
 */
export function createStarfield(container: HTMLElement): void {
  const fragment = document.createDocumentFragment();

  LAYERS.forEach((layerClass, layerIndex) => {
    const layer = document.createElement('div');
    layer.className = `star-layer ${layerClass}`;

    const depth = layerIndex + 1;
    const count = STARS_PER_LAYER[layerIndex];

    for (let i = 0; i < count; i++) {
      const star = document.createElement('span');

      // The occasional hero star gets a halo and a wider twinkle.
      const isBright = Math.random() < 0.12;
      const size = isBright ? randomBetween(2.4, 3.4) : randomBetween(0.8, 2.2) * (depth / 3 + 0.7);

      star.className = isBright ? 'star star--glow' : 'star';
      star.style.left = `${randomBetween(0, 100).toFixed(2)}%`;
      star.style.top = `${randomBetween(0, 100).toFixed(2)}%`;

      star.style.setProperty('--star-size', `${size.toFixed(2)}px`);
      star.style.setProperty(
        '--star-color',
        STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      );
      // Base opacity is the resting brightness; the peak is what it pulses to.
      star.style.setProperty('--star-opacity', randomBetween(0.25, 0.6).toFixed(2));
      star.style.setProperty('--star-peak', isBright ? '1' : randomBetween(0.7, 1).toFixed(2));
      star.style.setProperty('--twinkle-duration', `${randomBetween(1.8, 5).toFixed(2)}s`);
      // Negative delay starts each star mid-cycle, so the field never pulses
      // as one block on first paint.
      star.style.setProperty('--twinkle-delay', `${(-randomBetween(0, 5)).toFixed(2)}s`);

      layer.appendChild(star);
    }

    fragment.appendChild(layer);
  });

  container.appendChild(fragment);
}
