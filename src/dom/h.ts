/**
 * A tiny element builder.
 *
 * The game screens are drawn with `createElement` and `textContent` rather than
 * `innerHTML`, so a player's name or a NASA string can never become markup. No
 * framework is used here (see docs/architecture.md), so this is the one helper
 * the views share.
 */

type Attrs = Record<string, string | boolean | null | undefined>;
type Child = Node | string | null | undefined | false;

/**
 * Create an element. `class` and `text` are shortcuts; every other key is set as
 * an attribute, and a boolean `true` becomes a bare attribute (`disabled`).
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') element.className = String(value);
    else if (key === 'text') element.textContent = String(value);
    else element.setAttribute(key, value === true ? '' : String(value));
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child);
  }

  return element;
}

/** Remove every child of an element. */
export function clear(element: Element): void {
  element.replaceChildren();
}
