import './style.css';

import astronautUrl from '../Assets/images/floating.png';
import { centreAstronaut, startFloatingAstronaut } from './core/floatAstronaut';
import { createStarfield } from './core/starfield';

/**
 * Resolves an element by id, throwing a clear error if the markup and the
 * script have drifted apart — easier to debug than a null dereference.
 */
function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}

/**
 * Explicit motion override, for previewing the drift on a machine whose OS
 * reports reduced motion: `?motion=force` always animates, `?motion=reduce`
 * never does. Returns null when no override was requested, in which case the
 * OS preference decides — so the accessibility behaviour is the default and the
 * override only ever applies to a URL somebody typed on purpose.
 */
function readMotionOverride(): boolean | null {
  const requested = new URLSearchParams(window.location.search).get('motion');

  if (requested === 'force') return false;
  if (requested === 'reduce') return true;

  return null;
}

function bootstrap(): void {
  const starfield = requireElement<HTMLElement>('starfield');
  const astronaut = requireElement<HTMLElement>('astronaut');
  const astronautImg = requireElement<HTMLImageElement>('astronaut-img');

  // Typed asset import — Vite fingerprints this and emits it into dist/.
  astronautImg.src = astronautUrl;

  createStarfield(starfield);

  // Respect the OS-level motion preference for the drifting sprite as well as
  // for the CSS animations.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Teardown handle for the animation loop, so the preference can be
  // re-applied without stacking up duplicate rAF loops.
  let stopFloating: (() => void) | null = null;

  const motionOverride = readMotionOverride();

  // With reduced motion the sprite is centred rather than simply frozen where
  // it happens to be, so it stays visible. Toggling the OS setting mid-session
  // must also take effect, so this is wired up as a live listener rather than
  // a one-off check at load.
  const applyMotionPreference = (): void => {
    stopFloating?.();
    stopFloating = null;

    if (motionOverride ?? motionQuery.matches) {
      centreAstronaut(astronaut);
    } else {
      stopFloating = startFloatingAstronaut(astronaut);
    }
  };

  // Only listen for OS changes when the OS is actually the thing in charge.
  // Otherwise an override would be discarded and replaced the moment the
  // preference flipped, which is surprising when the URL asked for a mode.
  if (motionOverride === null) {
    motionQuery.addEventListener('change', applyMotionPreference);
  }

  applyMotionPreference();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
