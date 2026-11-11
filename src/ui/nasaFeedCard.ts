/**
 * One live NASA picture and its story, drawn as a card.
 *
 * Lives in `ui/` because it is shared chrome and because `ui/` is the only
 * layer that may reach both `data/` and `dom/`. It draws the same shape as the
 * curated card in `nasaCard.ts` — same classes, same credit line, same
 * read-aloud — so the two kinds of NASA card are indistinguishable to the eye
 * and the only difference the player sees is the kicker.
 *
 * The picture is optional: NASA sends a video for some days, and a video's
 * page is not a picture. A card with no picture keeps its words, which are
 * the lesson anyway.
 */

import type { DailyFact } from '../data/nasaDaily';
import { h } from '../dom/h';
import { readButton } from './readButton';

import './nasa-card.css';

/** Draw one live NASA picture with its story. */
export function nasaFeedCard(fact: DailyFact, kicker = 'From NASA today'): HTMLElement {
  const figure = h('figure', { class: 'nasa-card' });

  if (fact.imageUrl !== null) {
    const image = h('img', {
      class: 'nasa-card__img',
      src: fact.imageUrl,
      alt: `${fact.title}, a picture from NASA.`,
      loading: 'lazy',
      decoding: 'async',
    });

    /* A blocked or broken image is removed rather than shown as a broken icon:
       the caption and the fact are the lesson, the picture is the
       illustration. */
    image.addEventListener('error', () => {
      image.remove();
      figure.classList.add('nasa-card--no-image');
    });

    figure.append(image);
  } else {
    figure.classList.add('nasa-card--no-image');
  }

  const source = h(
    'a',
    {
      class: 'nasa-card__source',
      href: fact.sourceUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'See it at NASA ↗',
    },
  );

  const actions = h('div', { class: 'nasa-card__actions' });
  const read = readButton(() => `${fact.title}. ${fact.text}`, {
    className: 'nasa-card__read',
    idleLabel: '🔊 Read to me',
    stopLabel: '⏹ Stop reading',
    ariaLabel: 'Read this card aloud',
  });

  if (read !== null) actions.append(read);

  const body = h(
    'figcaption',
    { class: 'nasa-card__body' },
    h('p', { class: 'nasa-card__kicker', text: kicker }),
    h('p', { class: 'nasa-card__title', text: fact.title }),
    h('p', { class: 'nasa-card__caption', text: fact.text }),
    h(
      'div',
      { class: 'nasa-card__foot' },
      h(
        'p',
        { class: 'nasa-card__credit' },
        fact.date.length > 0 ? `${fact.credit} · ${fact.date} · ` : `${fact.credit} · `,
        source,
      ),
      actions,
    ),
  );

  figure.append(body);

  return figure;
}
