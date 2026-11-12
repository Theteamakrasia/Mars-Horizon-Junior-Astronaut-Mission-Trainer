/**
 * Every sound the game can make, and what each one is worth.
 *
 * This file is **data only**. It imports the audio files — Vite fingerprints
 * them and emits only the ones actually referenced, exactly the way
 * `ui/icons.ts` handles the drawings — and it says how each cue is trimmed.
 * Nothing here touches the DOM, so a test can read the whole table without a
 * browser (`sfxMap.test.ts`).
 *
 * The ids are the contract between a screen and the sound: a screen asks for
 * `'order-stamp'`, never for a file. That is what lets the same cue be
 * re-trimmed, re-pitched or replaced without hunting through features, and it
 * is what `docs/audio.md` documents.
 *
 * ## One file, several sounds
 *
 * The supplied set is 34 files for 110 cues, and that is the design rather
 * than a shortage. A cue may name a `rate`: 1 is the file as recorded, 0.92 is
 * the same sound lower and slower, 1.12 higher and shorter. Three stars climb
 * the same file, a dust storm is the flare alarm pitched down, and
 * `radar-cold` / `radar-warm` / `radar-hot` are three different cues that
 * happen to share two files with a rate between them. Nothing is faked: the
 * browser plays the file slower, so the pitch follows.
 *
 * ## Why the gains are what they are
 *
 * The pack was not mastered as a set: measured at the source, `_V03` peaks at
 * -1.6 dBFS and `UI_Reward_Coin_Pickup` at -12.8 dBFS, an 11 dB spread between
 * two cues meant to sit at the same level. Played at full volume, the
 * achievement bells would be the only thing anybody heard.
 *
 * So each entry carries a `gain` that brings the file's measured peak to the
 * level that cue should sit at: quiet for a hover (about -24 dBFS), ordinary
 * for a click (-12), loud only for a moment worth looking up for (-5 to -8).
 * The number came from `tools/compress-audio.py`, which prints the peak of
 * every file it converts; `gain = 10 ** ((target - peak) / 20)`. The MP3s
 * could not be measured without a decoder, so they assume a peak near full
 * scale, which is what the pack does. If a cue sounds wrong next to its
 * neighbours, change its `gain` here and nowhere else.
 *
 * ## Voices
 *
 * `voices` is how many copies of one cue may be sounding at once. Two is the
 * default, because a fast double-click should overlap rather than cut itself
 * off; three where a player can genuinely tap faster than the sound ends
 * (typing, science points ticking up), one where the cue is a statement and
 * two of it would be a stutter (a mission start, a rank-up).
 */

import uiClickPaper from '../../Assets/audio/sfx/ui/UI_Click_Paper_V01.wav';
import uiClickPaperSoft from '../../Assets/audio/sfx/ui/UI_Click_Paper_V04.wav';
import uiHoverBlip from '../../Assets/audio/sfx/ui/UI_Hover_Bubble_Blip_V01.wav';
import uiDigitalBlip from '../../Assets/audio/sfx/landing/UI_Hover_Digital_Blip_V05.wav';
import uiCancelBack from '../../Assets/audio/sfx/ui/UI_Cancel_Back_V01.wav';
import uiBubblePop from '../../Assets/audio/sfx/ui/UI_Click_Bubble_Pop_V04.wav';
import uiBubblePopClose from '../../Assets/audio/sfx/ui/UI_Click_Bubble_Pop_V06.wav';
import uiPlushSwitch from '../../Assets/audio/sfx/ui/UI_Click_Plush_Switch_V01.wav';
import uiSaveComplete from '../../Assets/audio/sfx/ui/UI_Save_Complete_V01.wav';
import uiErrorGentle from '../../Assets/audio/sfx/ui/UI_Error_Gentle_V01.wav';
import uiErrorNeutral from '../../Assets/audio/sfx/ui/UI_Error_Gentle_V05.wav';
import uiWoodenTap from '../../Assets/audio/sfx/ui/UI_Confirm_Wooden_Double_Tap_V01.wav';
import uiNotifyAttention from '../../Assets/audio/sfx/desk/UI_Notify_Attention_V01.wav';
import uiNotifyFriend from '../../Assets/audio/sfx/desk/UI_Notify_New_Friend_V04.wav';
import uiLevelCompleteLong from '../../Assets/audio/sfx/desk/UI_Level_Complete_V04.wav';
import uiCoinPickup from '../../Assets/audio/sfx/desk/UI_Reward_Coin_Pickup_V02.wav';
import uiAchievementV01 from '../../Assets/audio/sfx/interior/UI_Achievement_Unlocked_V01.wav';
import uiAchievementV03 from '../../Assets/audio/sfx/debrief/UI_Achievement_Unlocked_V03.wav';
import uiAchievementV04 from '../../Assets/audio/sfx/debrief/UI_Achievement_Unlocked_V04.wav';
import uiPositiveChime from '../../Assets/audio/sfx/tools/UI_Confirm_Positive_Chime_V02.wav';
import uiLevelComplete from '../../Assets/audio/sfx/tools/UI_Level_Complete_V02.wav';
import uiQuestUpdate from '../../Assets/audio/sfx/training/UI_Notify_Quest_Update_V02.wav';
import sfxClockTicking from '../../Assets/audio/sfx/tools/clock-ticking.mp3';
import sfxFootstepsMetal from '../../Assets/audio/sfx/interior/footsteps-on-metal-floor.mp3';
import sfxAirlockCycle from '../../Assets/audio/sfx/interior/airlock-cycle-open.wav';
import sfxCameraFlash from '../../Assets/audio/sfx/launch/camera-flash.mp3';
import sfxDockingClamp from '../../Assets/audio/sfx/launch/docking-clamp-engage.wav';
import sfxRocketLaunch from '../../Assets/audio/sfx/launch/rocket-launch-ignition-and-liftoff.mp3';
import sfxPowerDown from '../../Assets/audio/sfx/resources/power-down.mp3';
import sfxPowerUp from '../../Assets/audio/sfx/resources/power-up.mp3';
import sfxAlarm from '../../Assets/audio/sfx/crisis/alarm.mp3';
import sfxThud from '../../Assets/audio/sfx/crisis/thud.mp3';
import sfxWin from '../../Assets/audio/sfx/training/win.mp3';
import sfxDestroyed from '../../Assets/audio/sfx/training/destroyed.mp3';

/** One cue: the file, and how to play it. */
export interface SfxDef {
  /** The bundled file. */
  readonly src: string;
  /** Peak trim, 0..1. See the note at the top of this file. */
  readonly gain: number;
  /** Playback rate. Above 1 is higher and shorter. Defaults to 1. */
  readonly rate?: number;
  /** How many copies may sound at once. Defaults to 2. */
  readonly voices?: number;
  /** Loop the sound while it is active. Looped cues are started/stopped explicitly. */
  readonly loop?: boolean;
  /** Stop this many milliseconds before the file's natural end. */
  readonly endEarlyMs?: number;
  /** Duck under read-aloud speech. Defaults to true. */
  readonly duck?: boolean;
}

/**
 * The whole set.
 *
 * Ordered the way the player meets it: the chrome, then the journey from the
 * menu to the debrief, then the things that can interrupt any of it.
 */
export const SFX = {
  /* ------------------------------------------------------------ global UI -- */
  'ui-click': { src: uiClickPaper, gain: 0.61, voices: 3 },
  'ui-hover': { src: uiHoverBlip, gain: 0.13, voices: 1 },
  'ui-disabled': { src: uiCancelBack, gain: 0.31, voices: 1 },
  'ui-open-sheet': { src: uiBubblePop, gain: 0.4 },
  'ui-close-sheet': { src: uiBubblePopClose, gain: 0.32 },
  'ui-toggle-on': { src: uiPlushSwitch, gain: 0.9, rate: 1.06, voices: 1 },
  'ui-toggle-off': { src: uiPlushSwitch, gain: 0.9, rate: 0.94, voices: 1 },
  'ui-confirm': { src: uiSaveComplete, gain: 0.93, voices: 1 },
  'ui-error': { src: uiErrorGentle, gain: 0.33, voices: 1 },

  /* --------------------------------------------------- naming and briefing -- */
  'type-key': { src: uiClickPaperSoft, gain: 0.37 },
  'mission-start': { src: uiSaveComplete, gain: 1, voices: 1 },
  'dialogue-next': { src: uiPlushSwitch, gain: 0.71, voices: 1 },
  'dialogue-pop': { src: uiBubblePop, gain: 0.4 },
  'yes-confirm': { src: uiClickPaperSoft, gain: 0.93, voices: 1 },
  'astronaut-grab': { src: uiPlushSwitch, gain: 0.8, rate: 0.9, voices: 1 },
  'astronaut-toss': { src: uiBubblePop, gain: 0.4, rate: 1.18 },
  'astronaut-bounce': { src: sfxThud, gain: 0.14, rate: 1.1 },

  /* --------------------------------------------------------- supply check -- */
  'answer-select': { src: uiPlushSwitch, gain: 0.71, voices: 1 },
  'answer-correct': { src: uiWoodenTap, gain: 0.68, voices: 1 },
  'answer-wrong': { src: uiErrorGentle, gain: 0.33, voices: 1 },
  'retry-ready': { src: uiPlushSwitch, gain: 0.71, voices: 1 },
  'supply-buy': { src: uiClickPaper, gain: 0.54, voices: 1 },
  'supply-pod-away': { src: sfxThud, gain: 0.22, rate: 0.85, voices: 1 },

  /* --------------------------------------------------- launch and interior -- */
  'camera-flash': { src: sfxCameraFlash, gain: 0.18, voices: 3 },
  'launch-rumble-liftoff': { src: sfxRocketLaunch, gain: 0.45, voices: 1, endEarlyMs: 3000 },
  'launch-title': { src: uiNotifyAttention, gain: 0.54, rate: 0.85, voices: 1 },
  'docking-clunk': { src: sfxDockingClamp, gain: 1, voices: 1 },
  'skip-whoosh': { src: uiPlushSwitch, gain: 0.8, rate: 1.25, voices: 1 },
  'tour-turn': { src: uiClickPaperSoft, gain: 0.83, voices: 1 },
  'footstep-metal': { src: sfxFootstepsMetal, gain: 1, loop: true, voices: 1, duck: false },
  'airlock-phase': { src: sfxAirlockCycle, gain: 0.41, voices: 1 },
  'tour-complete': { src: uiAchievementV01, gain: 1, rate: 0.96, voices: 1 },

  /* --------------------------------------------------------- landing site -- */
  'map-pin-select': { src: uiDigitalBlip, gain: 0.4 },
  'nasa-data-open': { src: uiBubblePop, gain: 0.4, voices: 1 },
  'land-confirm': { src: uiSaveComplete, gain: 1, voices: 1 },

  /* ----------------------------------------------------------------- base -- */
  'module-add': { src: uiPlushSwitch, gain: 0.71, rate: 1.06, voices: 1 },
  'module-remove': { src: uiPlushSwitch, gain: 0.71, rate: 0.94, voices: 1 },
  'module-limit': { src: uiCancelBack, gain: 0.39, voices: 1 },
  'outpost-land': { src: uiSaveComplete, gain: 1, voices: 1 },
  'guide-page-turn': { src: uiPlushSwitch, gain: 0.57, voices: 1 },
  'guide-done': { src: uiPlushSwitch, gain: 0.71, voices: 1 },
  'mission-leave': { src: uiNotifyAttention, gain: 0.43, rate: 0.8, voices: 1 },

  /* ----------------------------------------------------------------- desk -- */
  'desk-tile-open': { src: uiBubblePop, gain: 0.4, voices: 1 },
  'order-select': { src: uiClickPaper, gain: 0.54, voices: 1 },
  'order-stamp': { src: uiClickPaperSoft, gain: 1, voices: 1 },
  'order-locked': { src: uiCancelBack, gain: 0.39, rate: 0.92, voices: 1 },
  'standing-order-new': { src: uiNotifyAttention, gain: 0.6, voices: 1 },
  'note-arrive': { src: uiNotifyFriend, gain: 0.6, voices: 1 },
  'sol-advance': { src: uiLevelCompleteLong, gain: 0.61, voices: 1 },
  'science-up': { src: uiCoinPickup, gain: 1, voices: 3 },
  'rank-up': { src: uiAchievementV03, gain: 0.64, rate: 1.12, voices: 1 },

  /* ---------------------------------------------------------------- tools -- */
  'tool-start': { src: uiClickPaperSoft, gain: 0.83, voices: 1 },
  'tool-finish': { src: uiClickPaperSoft, gain: 0.93, rate: 0.94, voices: 1 },
  'checklist-press': { src: uiClickPaperSoft, gain: 0.83, voices: 1 },
  'timing-tick': { src: sfxClockTicking, gain: 0.1, loop: true, voices: 1, duck: false },
  'timing-stop': { src: uiPlushSwitch, gain: 0.71, voices: 1 },
  'radar-ping': { src: uiClickPaperSoft, gain: 0.74, voices: 1 },
  'radar-cold': { src: uiCancelBack, gain: 0.25, voices: 1 },
  'radar-warm': { src: uiPositiveChime, gain: 0.47, voices: 1 },
  'radar-hot': { src: uiWoodenTap, gain: 0.6, rate: 1.12, voices: 1 },
  'sort-toggle': { src: uiClickPaperSoft, gain: 0.83, voices: 1 },
  'match-select': { src: uiPositiveChime, gain: 0.47, voices: 1 },
  'pack-add': { src: uiClickPaperSoft, gain: 0.83, voices: 1 },
  'pack-overweight': { src: uiCancelBack, gain: 0.39, voices: 1 },
  'star-1': { src: uiLevelComplete, gain: 0.62, rate: 0.92, voices: 1 },
  'star-2': { src: uiLevelComplete, gain: 0.69, voices: 1 },
  'star-3': { src: uiLevelComplete, gain: 0.77, rate: 1.08, voices: 1 },
  'stars-zero': { src: uiErrorNeutral, gain: 0.28, voices: 1 },

  /* ------------------------------------------- resources, crises, warnings -- */
  'countdown-start': { src: uiNotifyAttention, gain: 0.6, rate: 1.1, voices: 1 },
  'countdown-tick': { src: sfxClockTicking, gain: 0.13, voices: 1 },
  'countdown-expire': { src: uiErrorNeutral, gain: 0.32, voices: 1 },
  'store-low': { src: uiErrorGentle, gain: 0.21, rate: 0.95, voices: 1 },
  'store-critical': { src: uiErrorGentle, gain: 0.3, rate: 0.82, voices: 1 },
  'power-blackout': { src: sfxPowerDown, gain: 0.45, voices: 1 },
  'power-restore': { src: sfxPowerUp, gain: 0.45, voices: 1 },
  'crisis-flare': { src: sfxAlarm, gain: 0.35, voices: 1 },
  'crisis-storm': { src: sfxAlarm, gain: 0.35, rate: 0.84, voices: 1 },
  'crisis-supply': { src: sfxThud, gain: 0.4, voices: 1 },
  'shelter-confirm': { src: uiLevelComplete, gain: 0.69, voices: 1 },
  'earth-reply': { src: uiPositiveChime, gain: 0.66, voices: 1 },
  'earth-too-late': { src: uiCancelBack, gain: 0.39, rate: 0.9, voices: 1 },

  /* ---------------------------------------------------------------- rover -- */
  'rover-deploy': { src: uiAchievementV03, gain: 0.57, rate: 1.06, voices: 1 },
  'rover-return': { src: uiCoinPickup, gain: 1, voices: 1 },
  'find-site-log': { src: uiCoinPickup, gain: 1, rate: 1.08, voices: 1 },
  'find-rock-collect': { src: uiCoinPickup, gain: 1, rate: 0.94, voices: 1 },
  'find-rock-leave': { src: uiErrorNeutral, gain: 0.28, rate: 0.9, voices: 1 },

  /* ------------------------------------------------------------- training -- */
  'merge-slide': { src: uiClickPaper, gain: 0.5, voices: 2 },
  'merge-combine': { src: uiCoinPickup, gain: 1 },
  'merge-pod-built': { src: sfxWin, gain: 0.5, voices: 1 },
  'memory-flip': { src: uiPlushSwitch, gain: 0.71 },
  'memory-pair': { src: uiPositiveChime, gain: 0.66, voices: 1 },
  'memory-nomatch': { src: uiErrorNeutral, gain: 0.28, voices: 1 },
  'rover-bump': { src: sfxThud, gain: 0.35, voices: 1 },
  'rover-park': { src: sfxWin, gain: 0.56, voices: 1 },
  'wire-turn': { src: uiClickPaperSoft, gain: 0.83, voices: 1 },
  'battery-charge': { src: sfxWin, gain: 0.5, rate: 1.1, voices: 1 },
  'crate-pickup': { src: sfxThud, gain: 0.2, rate: 1.15 },
  'crate-drop-right': { src: uiPositiveChime, gain: 0.66, voices: 1 },
  'crate-drop-wrong': { src: uiErrorNeutral, gain: 0.28, voices: 1 },
  'asteroid-spawn': { src: uiBubblePop, gain: 0.31, voices: 1 },
  'asteroid-clear': { src: sfxDestroyed, gain: 0.175 },
  'satellite-oops': { src: uiErrorNeutral, gain: 0.28, rate: 0.88, voices: 1 },
  'time-up': { src: uiQuestUpdate, gain: 1, voices: 1 },
  'training-complete': { src: sfxWin, gain: 0.56, rate: 0.95, voices: 1 },
  'training-unlock': { src: uiAchievementV04, gain: 1, voices: 1 },

  /* -------------------------------------------------------------- debrief -- */
  'debrief-win': { src: uiAchievementV03, gain: 0.72, voices: 1 },
  'debrief-lose': { src: uiLevelCompleteLong, gain: 0.49, rate: 0.82, voices: 1 },
  'patch-earned': { src: uiAchievementV01, gain: 0.96, voices: 1 },
  'certificate-reveal': { src: uiAchievementV03, gain: 0.81, rate: 1.05, voices: 1 },
  'debrief-journal': { src: uiBubblePop, gain: 0.4, voices: 1 },
} as const satisfies Readonly<Record<string, SfxDef>>;

/** Any cue the game can ask for. */
export type SfxId = keyof typeof SFX;

/** Every id, for tests and for the browser check. */
export const SFX_IDS = Object.keys(SFX) as readonly SfxId[];

/** How a cue is played when its entry leaves the field out. */
export const SFX_DEFAULT_VOICES = 2;
