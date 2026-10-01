import './style.css';

import astronautUrl from '../Assets/images/floating.png';
import { startFloatingAstronaut } from './core/floatAstronaut';
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
  const astronautDeform = requireElement<HTMLElement>('astronaut-deform');
  const astronautImg = requireElement<HTMLImageElement>('astronaut-img');

  // Typed asset import — Vite fingerprints this and emits it into dist/.
  astronautImg.src = astronautUrl;
  // Native image dragging would otherwise hijack the pointer gesture that
  // pointerGrab.ts wants for picking the astronaut up.
  astronautImg.draggable = false;

  createStarfield(starfield);

  // Respect the OS-level motion preference for the drifting sprite as well as
  // for the CSS animations.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Teardown handle for the animation loop, so the preference can be
  // re-applied without stacking up duplicate rAF loops.
  let stopFloating: (() => void) | null = null;

  const motionOverride = readMotionOverride();

  // With reduced motion he still drifts, just slowly and without the snapping
  // deformation, and he stays pick-up-able: moving something in direct response
  // to the pointer is not the kind of self-directed motion the setting targets.
  // Parking him dead in the centre instead left the page looking broken.
  // Toggling the OS setting mid-session must take effect, so this is a live
  // listener rather than a one-off check at load.
  const applyMotionPreference = (): void => {
    stopFloating?.();
    stopFloating = null;

    stopFloating = startFloatingAstronaut(astronaut, {
      deformLayer: astronautDeform,
      reducedMotion: motionOverride ?? motionQuery.matches,
    });
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
