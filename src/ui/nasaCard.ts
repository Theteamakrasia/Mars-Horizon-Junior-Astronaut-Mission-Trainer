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

import type { NasaCard } from '../data/nasaGallery';
import { h } from '../dom/h';
import { canReadAloud, readAloud, stopReading } from './readAloud';

import './nasa-card.css';

/**
 * A figure, its picture, and the words that make it a lesson.
 *
 * `kicker` overrides the "Sol N" label for cards shown outside the sol loop,
 * such as the closing card on the debrief.
 */
export function nasaCard(
  card: NasaCard,
  kicker = `A real picture from NASA · Sol ${card.sol}`,
): HTMLElement {
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

  /* The browser's own voice, only where it exists. A browser without speech
     simply does not get the button rather than getting one that does nothing. */
  if (canReadAloud()) {
    const button = h('button', { class: 'nasa-card__read', type: 'button' });
    let reading = false;
    let generation = 0;

    const paint = (): void => {
      button.textContent = reading ? '⏹ Stop reading' : '🔊 Read to me';
      button.setAttribute('aria-pressed', String(reading));
      button.setAttribute('aria-label', reading ? 'Stop reading this card aloud' : 'Read this card aloud');
    };

    button.addEventListener('click', () => {
      if (reading) {
        generation += 1;
        reading = false;
        stopReading();
        paint();

        return;
      }

      const mine = ++generation;

      reading = readAloud(`${card.title}. ${card.caption} ${card.fact}`, () => {
        /* A cancelled passage can still fire its end callback after a new one
           starts, so only the newest request is allowed to reset the button. */
        if (mine !== generation) return;

        reading = false;
        paint();
      });
      paint();
    });

    paint();
    actions.append(button);
  }

  const body = h(
    'figcaption',
    { class: 'nasa-card__body' },
    h('p', { class: 'nasa-card__kicker', text: kicker }),
    h('p', { class: 'nasa-card__title', text: card.title }),
    h('p', { class: 'nasa-card__caption', text: card.caption }),
    h('p', { class: 'nasa-card__fact' }, h('strong', { text: 'Did you know? ' }), card.fact),
    h('div', { class: 'nasa-card__foot' }, h('p', { class: 'nasa-card__credit' }, `${card.credit} · `, source), actions),
  );

  figure.append(image, body);

  return figure;
}
