/**
 * The encyclopedia screen: a reference for every piece of equipment, with the
 * one line a player needs to build, plus full detail and a real NASA fact.
 *
 * Drawn inside the shared game-loop shell (header + panel). The list and its
 * detail cards are the only screen-specific markup; everything in `enc/` is
 * imported by this view only (R-15).
 *
 * Pure presentation: the data comes from ./model, and navigation goes through
 * the router. The screen never mutates the run.
 */

import { h } from '../../dom/h';
import { navigate } from '../../ui/router';
import { gameScreen, gamePanel, moduleArt } from '../../ui/gameLoop';
import { entries, type EncyclopediaEntry } from './model';
import type { RunState } from '../../sim/run';
import { factFor, type NasaFact } from '../../data/nasaGallery';

import '../../styles/game-loop.css';
import './encyclopedia.css';

export function mountEncyclopedia(
  mount: HTMLElement,
  _run: RunState | null,
  _setRun: (next: RunState | null) => void,
): () => void {
  let openKey: string | null = null;

  function render(): void {
    const list = entries().map((entry) => buildEntry(entry));

    const back = h('button', { class: 'gl__btn gl__btn--primary', type: 'button' }, '← Back to outpost');
    back.addEventListener('click', () => navigate('base'));

    const panel = gamePanel({
      kicker: 'Reference',
      title: 'Encyclopedia',
      sub: 'Tap any item to read how it works — each one carries a real NASA fact.',
      body: [h('div', { class: 'enc__grid' }, ...list)],
      footer: [
        back,
        h('p', { class: 'gl__note', text: 'NASA facts credited to NASA. Use the menu to leave the mission.' }),
      ],
    });

    mount.replaceChildren(
      gameScreen({
        hud: [],
        panel,
        variant: 'gl--encyclopedia',
        headerSub: 'ENCYCLOPEDIA',
        onLeave: () => navigate('naming'),
        fullWidth: true,
      }),
    );

    // If an entry is open, mount its detail modal on top of the screen root.
    if (openKey !== null) {
      const entry = entries().find((e) => e.kind === openKey);
      if (entry) mount.appendChild(buildDetailModal(entry));
    }
  }

  function buildEntry(entry: EncyclopediaEntry): HTMLElement {
    const open = openKey === entry.kind;

    const card = h(
      'div',
      {
        class: `enc__card${open ? ' enc__card--open' : ''}`,
        role: 'button',
        tabindex: '0',
        'aria-expanded': String(open),
        'aria-label': `Read ${entry.name} details`,
      },
      h('img', {
        class: 'enc__card-art',
        src: moduleArt(entry.kind),
        alt: entry.name,
        loading: 'lazy',
      }),
      h(
        'div',
        { class: 'enc__card-body' },
        h('h3', { class: 'enc__card-name', text: entry.name }),
        h('p', { class: 'enc__card-one-line', text: entry.oneLine }),
        h('span', {
          class: 'enc__card-cost',
          text: entry.cost === 0 ? 'Free with lander' : `✦ ${entry.cost}`,
        }),
      ),
    );

    const toggle = (): void => {
      openKey = open ? null : entry.kind;
      render();
    };

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });

    return card;
  }

  /** Modal popup showing full detail for one piece of equipment, including its artwork. */
  function buildDetailModal(entry: EncyclopediaEntry): HTMLElement {
    const fact: NasaFact = factFor(entry.nasaFactIndex);
    const overlay = h('div', { class: 'enc__modal-overlay' });
    const modal = h(
      'div',
      { class: 'enc__modal' },
      h('button', {
        class: 'enc__modal-close',
        type: 'button',
        'aria-label': 'Close details',
        text: '✕',
      }),
      h('img', {
        class: 'enc__modal-art',
        src: moduleArt(entry.kind),
        alt: entry.name,
      }),
      h(
        'div',
        { class: 'enc__modal-body' },
        h('h2', { class: 'enc__modal-name', text: entry.name }),
        h('p', { class: 'enc__modal-gives', text: entry.gives }),
        entry.needs ? h('p', { class: 'enc__modal-needs', text: entry.needs }) : null,
        h(
          'div',
          { class: 'enc__modal-nasa' },
          h('p', { class: 'enc__modal-nasa-label', text: 'From NASA' }),
          h('p', { class: 'enc__modal-nasa-fact', text: fact.text }),
          h('p', { class: 'enc__modal-nasa-credit', text: fact.credit }),
        ),
      ),
    );
    overlay.appendChild(modal);

    const close = () => {
      openKey = null;
      overlay.remove();
    };

    modal.querySelector('.enc__modal-close')!.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      // Close when clicking the overlay backdrop, not the modal itself.
      if (event.target === overlay) close();
    });

    return overlay;
  }

  render();

  return () => {
    mount.replaceChildren();
  };
}
