import { StaveNote } from 'vexflow';
import { ParsedChart, RenderData } from '../../chart-parser/types';
import { InputElement, InputMapping } from '../../types';
import { InputEvent } from '../input/types';
import { secondsToTicks, ticksToSeconds } from '../views/utils';

export type ScoringHitHandler = (note: StaveNote, prefixes: string[]) => void;

export interface ScoringContext {
  chart: ParsedChart | undefined;
  renderData: RenderData[];
  mapping: InputMapping;
}

const ELEMENT_TO_KEYS: Partial<Record<InputElement, string[]>> = {
  kick: ['f/4', 'e/4'],
  snare: ['c/5'],
  hihat: ['g/5'],
  tom1: ['e/5'],
  ride: ['f/5'],
  tom2: ['d/5'],
  crash: ['a/5'],
  tom3: ['a/4'],
};
const HIT_TOLERANCE_SECONDS = 0.1;
const ACCENT_VALUE_THRESHOLD = 90;
const GHOST_VALUE_THRESHOLD = 50;

export function keyPrefix(key: string): string {
  const [pitch, octave] = key.split('/');

  return `${pitch}/${octave}`;
}

export class ScoringEngine {
  private chart: ParsedChart | undefined;
  private renderData: RenderData[] = [];
  private mapping: InputMapping = {};
  private enabled = false;
  private currentTick: number | undefined;
  private hitKeys = new Set<string>();
  private incorrectHits = 0;
  private hitListeners = new Set<ScoringHitHandler>();

  setContext(context: ScoringContext): void {
    this.chart = context.chart;
    this.mapping = context.mapping;

    if (this.renderData !== context.renderData) {
      this.renderData = context.renderData;
      this.reset();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setTick(tick: number | undefined): void {
    const prev = this.currentTick;

    if (tick !== undefined && prev !== undefined && tick < prev) {
      for (const key of this.hitKeys) {
        if (parseInt(key, 10) >= tick) {
          this.hitKeys.delete(key);
        }
      }

      this.incorrectHits = 0;
    }

    this.currentTick = tick;
  }

  onHit(listener: ScoringHitHandler): () => void {
    this.hitListeners.add(listener);

    return () => {
      this.hitListeners.delete(listener);
    };
  }

  isHit(tick: number, prefix: string): boolean {
    return this.hitKeys.has(`${tick}:${prefix}`);
  }

  get hitCount(): number {
    return this.hitKeys.size;
  }

  get falseHitCount(): number {
    return this.incorrectHits;
  }

  reset(): void {
    this.hitKeys.clear();
    this.incorrectHits = 0;
  }

  handleInput({ controlId, value }: InputEvent): void {
    if (value === 0 || !this.enabled) {
      return;
    }

    const mapping = this.mapping;
    const hitElements = (Object.keys(mapping) as InputElement[]).filter(
      (key) => ELEMENT_TO_KEYS[key] && mapping[key]?.includes(controlId),
    );

    if (hitElements.length === 0) {
      return;
    }

    const expectedPrefixes = new Set(
      hitElements.flatMap((el) => ELEMENT_TO_KEYS[el] ?? []),
    );
    const tick = this.currentTick;
    const chart = this.chart;

    if (tick === undefined || chart === undefined) {
      return;
    }

    const currentTimeS = ticksToSeconds(tick, chart.resolution, chart.tempos);
    const toleranceTicks =
      secondsToTicks(
        currentTimeS + HIT_TOLERANCE_SECONDS,
        chart.resolution,
        chart.tempos,
      ) - tick;
    let bestDist = Infinity;
    let bestNote: RenderData['renderedNotes'][number] | undefined;

    for (const { renderedNotes } of this.renderData) {
      for (const rn of renderedNotes) {
        if (rn.note.isRest()) {
          continue;
        }

        const dist = Math.abs(rn.tick - tick);

        if (dist > toleranceTicks || dist >= bestDist) {
          continue;
        }

        const hasMatchingKey = rn.note
          .getKeys()
          .some((k) => expectedPrefixes.has(keyPrefix(k)));

        if (hasMatchingKey) {
          bestDist = dist;
          bestNote = rn;
        }
      }
    }

    if (!bestNote) {
      this.incorrectHits += 1;

      return;
    }

    const hit = bestNote;
    const accentPrefixes = new Set((hit.accents ?? []).map(keyPrefix));
    const ghostPrefixes = new Set((hit.ghosts ?? []).map(keyPrefix));
    const passesVelocity = (prefix: string) => {
      if (accentPrefixes.has(prefix)) {
        return value > ACCENT_VALUE_THRESHOLD;
      }

      if (ghostPrefixes.has(prefix)) {
        return value < GHOST_VALUE_THRESHOLD;
      }

      return true;
    };
    const newPrefixes = hit.note
      .getKeys()
      .map(keyPrefix)
      .filter(
        (p) =>
          expectedPrefixes.has(p) &&
          !this.hitKeys.has(`${hit.tick}:${p}`) &&
          passesVelocity(p),
      );

    if (newPrefixes.length === 0) {
      this.incorrectHits += 1;

      return;
    }

    newPrefixes.forEach((p) => this.hitKeys.add(`${hit.tick}:${p}`));
    this.hitListeners.forEach((listener) => listener(hit.note, newPrefixes));
  }
}
