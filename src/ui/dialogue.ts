/**
 * A reusable full-width, fixed-height bottom dialogue panel in the visual-novel
 * style: speaker label, dialogue text, a Next button, and optional choice
 * buttons stacked underneath the text.
 *
 * One panel is created per screen that wants it. The panel owns its own DOM
 * subtree inside the screen's root element; theming (colours, borders) is done
 * by overriding the --ui-dialogue-* CSS variables from the feature's stylesheet.
 * Structural styles live in ./dialogue.css.
 *
 * Content is written straight into the panel and is readable immediately - no
 * animation is load-bearing, per the codebase's standing rule. Under reduced
 * motion the panel simply appears without transitions.
 *
 * DOM only. No model, no sim, no network.
 */

import './dialogue.css';

export type DialogueChoice = {
  /** What the player reads on the button. */
  readonly label: string;
  /** The value handed back to the choice handler when picked. */
  readonly value: string;
};

/** Everything the panel exposes to the screen that owns it. */
export type DialoguePanel = {
  /** Set the speaker label shown above the text. Pass '' to hide the label. */
  setSpeaker(label: string): void;
  /** Replace the main dialogue text. */
  setText(text: string): void;
  /** Set supplementary detail text shown below the main text (e.g. working). */
  setDetail(text: string): void;
  /** Show or hide the Next button and wire its click handler. */
  setNext(visible: boolean, handler: () => void): void;
  /** Show choice buttons and hide the Next button while they are open. */
  setChoices(items: readonly DialogueChoice[], handler: (value: string) => void): void;
  /** Hide the choice buttons and restore the Next button if it was set. Buttons and handler are kept. */
  clearChoices(): void;
  /** Show the previously created choice buttons and hide the Next button. */
  showChoices(): void;
  /** Enable or disable all non-locked choice buttons. */
  setChoicesEnabled(enabled: boolean): void;
  /** Lock or unlock a single choice button by value. Locked buttons stay disabled. */
  setChoiceLocked(value: string, locked: boolean): void;
  /** Remove the panel from the DOM and detach all listeners. */
  teardown(): void;
};

/** Build the panel inside `container` and return its API. */
export function createDialoguePanel(container: HTMLElement): DialoguePanel {
  const panel = document.createElement('div');
  panel.className = 'ui-dialogue__panel';

  const speaker = document.createElement('p');
  speaker.className = 'ui-dialogue__speaker';
  speaker.hidden = true;

  const text = document.createElement('p');
  text.className = 'ui-dialogue__text';
  text.role = 'status';
  text.setAttribute('aria-live', 'polite');

  const detail = document.createElement('p');
  detail.className = 'ui-dialogue__detail';
  detail.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'ui-dialogue__actions';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'ui-dialogue__next';
  next.textContent = 'Next';
  next.hidden = true;

  const choices = document.createElement('ul');
  choices.className = 'ui-dialogue__choices';
  choices.hidden = true;

  actions.appendChild(next);
  panel.appendChild(speaker);
  panel.appendChild(text);
  panel.appendChild(detail);
  panel.appendChild(actions);
  panel.appendChild(choices);
  container.appendChild(panel);

  let nextHandler: (() => void) | null = null;
  let choiceHandler: ((value: string) => void) | null = null;
  let nextWasSet = false;
  const choiceButtons: HTMLButtonElement[] = [];

  const onNextClick = (): void => {
    if (nextHandler !== null) nextHandler();
  };

  const onChoiceClick = (event: Event): void => {
    if (choiceHandler === null) return;
    const button = event.currentTarget as HTMLButtonElement;
    const value = button.dataset.uiDialogueChoice;
    if (value === undefined) return;
    choiceHandler(value);
  };

  next.addEventListener('click', onNextClick);

  const setSpeaker = (label: string): void => {
    speaker.textContent = label;
    speaker.hidden = label === '';
  };

  const setText = (value: string): void => {
    text.textContent = value;
  };

  const setDetail = (value: string): void => {
    detail.textContent = value;
    detail.hidden = value === '';
  };

  const setNext = (visible: boolean, handler: () => void): void => {
    nextWasSet = visible;
    nextHandler = handler;
    next.hidden = !visible || choicesOpen();
  };

  const choicesOpen = (): boolean => !choices.hidden;

  const setChoices = (
    items: readonly DialogueChoice[],
    handler: (value: string) => void,
  ): void => {
    choiceHandler = handler;
    choices.replaceChildren();
    choiceButtons.length = 0;

    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ui-dialogue__choice-button';
      button.dataset.uiDialogueChoice = item.value;
      button.textContent = item.label;
      button.addEventListener('click', onChoiceClick);
      choices.appendChild(button);
      choiceButtons.push(button);
    }

    choices.hidden = false;
    next.hidden = true;
  };

  const clearChoices = (): void => {
    choices.hidden = true;
    next.hidden = !nextWasSet;
  };

  const showChoices = (): void => {
    choices.hidden = false;
    next.hidden = true;
  };

  const setChoicesEnabled = (enabled: boolean): void => {
    for (const button of choiceButtons) {
      if (button.dataset.uiDialogueLocked === 'true') continue;
      button.disabled = !enabled;
    }
  };

  const setChoiceLocked = (value: string, locked: boolean): void => {
    const button = choiceButtons.find((b) => b.dataset.uiDialogueChoice === value);
    if (button === undefined) return;
    button.dataset.uiDialogueLocked = String(locked);
    button.disabled = locked;
    button.classList.toggle('is-locked', locked);
  };

  const teardown = (): void => {
    next.removeEventListener('click', onNextClick);
    for (const button of choiceButtons) {
      button.removeEventListener('click', onChoiceClick);
    }
    choiceButtons.length = 0;
    nextHandler = null;
    choiceHandler = null;
    nextWasSet = false;
    panel.remove();
  };

  return { setSpeaker, setText, setDetail, setNext, setChoices, clearChoices, showChoices, setChoicesEnabled, setChoiceLocked, teardown };
}
