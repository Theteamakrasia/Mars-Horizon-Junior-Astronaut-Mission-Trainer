/**
 * @deprecated The rover is now part of `RunState` and is rendered by the act
 * screen. This compatibility entry point remains only for any old imports;
 * the former wall-clock widget no longer matches the sol-based simulation.
 */
export function roverWidget(): HTMLElement {
  const placeholder = document.createElement('div');

  placeholder.hidden = true;

  return placeholder;
}
