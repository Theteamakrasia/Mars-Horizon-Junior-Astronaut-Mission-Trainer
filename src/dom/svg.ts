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

/**
 * One shape in a drawing.
 *
 * The colour belongs to the shape, not to the icon: the drawn set is filled and
 * coloured, and each path says what it is filled with and what it is stroked
 * with. `currentColor` is a legal colour, which is how the one drawing the
 * supplied set has no counterpart for still follows the button it sits in.
 */
export interface Shape {
  /** The SVG path data. */
  readonly d: string;
  /** Fill colour. 'none' — the default — leaves the shape unfilled. */
  readonly fill?: string;
  /** Stroke colour. 'none' — the default — leaves the shape unstroked. */
  readonly stroke?: string;
  /** Stroke width, in the drawing's own units. */
  readonly strokeWidth?: number;
  /** How a stroke ends. */
  readonly linecap?: 'butt' | 'round' | 'square';
  /** How a stroke turns a corner. */
  readonly linejoin?: 'miter' | 'round' | 'bevel';
  /** How a filled shape decides what is inside it. */
  readonly fillRule?: 'nonzero' | 'evenodd';
}

type Attrs = Record<string, string>;

/**
 * An `<svg>` in the SVG namespace, holding one path per shape.
 *
 * The caller sets `class` and `aria-hidden`, because an icon's meaning depends
 * on where it is used: a decorative pictogram is hidden, a lone icon is not.
 * The `viewBox` may be given in the attributes; without one the drawing is
 * assumed to be in a 24-unit box.
 */
export function svg(shapes: readonly Shape[], attrs: Attrs = {}): SVGSVGElement {
  const element = document.createElementNS(SVG_NS, 'svg');

  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);

  if (!element.hasAttribute('viewBox')) element.setAttribute('viewBox', '0 0 24 24');
  element.setAttribute('focusable', 'false');

  for (const shape of shapes) {
    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', shape.d);
    path.setAttribute('fill', shape.fill ?? 'none');
    path.setAttribute('stroke', shape.stroke ?? 'none');

    if (shape.strokeWidth !== undefined) path.setAttribute('stroke-width', String(shape.strokeWidth));
    if (shape.linecap !== undefined) path.setAttribute('stroke-linecap', shape.linecap);
    if (shape.linejoin !== undefined) path.setAttribute('stroke-linejoin', shape.linejoin);
    if (shape.fillRule !== undefined) path.setAttribute('fill-rule', shape.fillRule);

    element.append(path);
  }

  return element;
}
