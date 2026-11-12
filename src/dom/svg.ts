/**
 * A tiny SVG element builder.
 *
 * `h()` can only create HTML: `document.createElement('svg')` produces an
 * element in the HTML namespace, which the browser draws as nothing. Icons are
 * the first SVG in the game, so this is the one place that knows the namespace.
 *
 * Like `h()`, it builds nodes rather than parsing markup, so an icon can never
 * carry a string a player typed.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** One shape in a 24×24 drawing. `fill` is for a dot; everything else strokes. */
export interface Shape {
  /** The SVG path data. */
  readonly d: string;
  /** Fill the shape instead of stroking its outline. */
  readonly fill?: boolean;
}

type Attrs = Record<string, string>;

/**
 * An `<svg>` in the SVG namespace, holding one path per shape.
 *
 * The caller sets `class` and `aria-hidden`, because an icon's meaning depends
 * on where it is used: a decorative pictogram is hidden, a lone icon is not.
 */
export function svg(shapes: readonly Shape[], attrs: Attrs = {}): SVGSVGElement {
  const element = document.createElementNS(SVG_NS, 'svg');

  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);

  element.setAttribute('viewBox', '0 0 24 24');
  element.setAttribute('focusable', 'false');

  for (const shape of shapes) {
    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', shape.d);

    if (shape.fill === true) path.setAttribute('fill', 'currentColor');
    else {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
    }

    element.append(path);
  }

  return element;
}
