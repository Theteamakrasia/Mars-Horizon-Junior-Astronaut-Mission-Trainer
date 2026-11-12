/**
 * One real NASA image with its story, drawn as a card.
 *
 * Lives in `ui/` because it is shared chrome: `act` shows one after each sol,
 * and another screen can show one without copying markup. It knows nothing
 * about the run; the card arrives already chosen from `data/nasaGallery.ts`.
 *
 * The picture is lazy-loaded and a broken image is removed rather than shown
 * as a broken icon, so a blocked network never makes the card look broken. The
 * caption, the fact and the NASA link stay either way.
 */

import type { NasaFigure } from '../data/nasaGallery';
import { h } from '../dom/h';
import { readButton } from './readButton';

import './nasa-card.css';

/**
 * A figure, its picture, and the words that make it a lesson.
 *
 * Works for a sol card, a region card, or the closing card: the only difference
 * is the kicker. It defaults to the sol when the card has one, and to a plain
 * NASA label when it does not.
 */
export function nasaCard(card: NasaFigure, kicker?: string): HTMLElement {
  const label = kicker ?? ('sol' in card ? `A real picture from NASA · Sol ${card.sol}` : 'A real picture from NASA');

  const image = h('img', {
    class: 'nasa-card__img',
    src: card.imageUrl,
    alt: card.alt,
    loading: 'lazy',
    decoding: 'async',
  });

  const figure = h('figure', { class: 'nasa-card' });

  /* A broken image would be a grey box with an icon where the lesson should be.
     Remove it and keep the caption, the fact and the link. */
  image.addEventListener('error', () => {
    image.remove();
    figure.classList.add('nasa-card--no-image');
  });

  const source = h(
    'a',
    {
      class: 'nasa-card__source',
      href: card.sourceUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'See it at NASA ↗',
    },
  );

  const actions = h('div', { class: 'nasa-card__actions' });
  const read = readButton(() => `${card.title}. ${card.caption} ${card.fact}`, {
    className: 'nasa-card__read',
    idleLabel: 'Read to me',
    stopLabel: 'Stop reading',
    ariaLabel: 'Read this card aloud',
  });

  if (read !== null) actions.append(read);

  const body = h(
    'figcaption',
    { class: 'nasa-card__body' },
    h('p', { class: 'nasa-card__kicker', text: label }),
    h('p', { class: 'nasa-card__title', text: card.title }),
    h('p', { class: 'nasa-card__caption', text: card.caption }),
    h('p', { class: 'nasa-card__fact' }, h('strong', { text: 'Did you know? ' }), card.fact),
    h('div', { class: 'nasa-card__foot' }, h('p', { class: 'nasa-card__credit' }, `${card.credit} · `, source), actions),
  );

  figure.append(image, body);

  return figure;
}
