import { ReactElement } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayer } from '../services/audio-player/player';
import { TrackConfig } from '../services/audio-player/types';
import { AudioVolumeProps } from '../components/AudioVolume';
import { useVolumeControls } from './useVolumeControls';

const { settings } = vi.hoisted(() => ({
  settings: {
    mixerLevels: {},
    setMixerLevels: vi.fn(),
  },
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => settings,
}));

type Result = { current: ReturnType<typeof useVolumeControls> };

function makePlayer(names: string[]) {
  const audioTracks = names.map((name) => ({ name, setVolume: vi.fn() }));

  return {
    audioTracks,
  } as unknown as AudioPlayer & {
    audioTracks: { name: string; setVolume: ReturnType<typeof vi.fn> }[];
  };
}

function tracks(...names: string[]): TrackConfig[] {
  return names.map((name) => ({ name, urls: [`${name}.ogg`] }));
}

function render(names: string[], player: AudioPlayer | null) {
  const td = tracks(...names);

  return renderHook(() => useVolumeControls(td, player));
}

function control(result: Result, name: string) {
  const found = result.current.volumeControls.find((c) => c.stemName === name);

  if (!found) {
    throw new Error(`no control for ${name}`);
  }

  return found;
}

function sliderProps(result: Result, name: string): AudioVolumeProps {
  const el = result.current.volumeSliders.find(
    (s) => (s as ReactElement<AudioVolumeProps>).props.name === name,
  ) as ReactElement<AudioVolumeProps> | undefined;

  if (!el) {
    throw new Error(`no slider for ${name}`);
  }

  return el.props;
}

function mute(result: Result, name: string) {
  act(() => sliderProps(result, name).onMuteClick());
}

function solo(result: Result, name: string) {
  act(() => sliderProps(result, name).onSoloClick());
}

function setVolume(result: Result, name: string, value: number) {
  act(() => sliderProps(result, name).onChange(value));
}

describe('useVolumeControls', () => {
  it('initialises a control per track at full volume', () => {
    const { result } = render(
      ['drums', 'guitar'],
      makePlayer(['drums', 'guitar']),
    );

    expect(result.current.volumeControls).toHaveLength(2);
    result.current.volumeControls.forEach((c) => {
      expect(c.volume).toBe(100);
      expect(c.isSoloed).toBe(false);
    });
  });

  it('returns nothing with no tracks', () => {
    const { result } = render([], null);

    expect(result.current.volumeControls).toEqual([]);
    expect(result.current.volumeSliders).toEqual([]);
  });

  it('builds no sliders without an audio player', () => {
    const { result } = render(['drums'], null);

    expect(result.current.volumeControls).toHaveLength(1);
    expect(result.current.volumeSliders).toEqual([]);
  });

  it('pushes the initial volume to each track', () => {
    const player = makePlayer(['drums', 'guitar']);

    render(['drums', 'guitar'], player);

    expect(player.audioTracks[0].setVolume).toHaveBeenCalledWith(1);
    expect(player.audioTracks[1].setVolume).toHaveBeenCalledWith(1);
  });

  it('mutes to zero and restores the previous volume', () => {
    const player = makePlayer(['drums']);
    const { result } = render(['drums'], player);

    setVolume(result, 'drums', 80);
    mute(result, 'drums');

    expect(control(result, 'drums').volume).toBe(0);
    expect(player.audioTracks[0].setVolume).toHaveBeenLastCalledWith(0);

    mute(result, 'drums');

    expect(control(result, 'drums').volume).toBe(80);
    expect(player.audioTracks[0].setVolume).toHaveBeenLastCalledWith(0.8);
  });

  it('soloing one track mutes the others', () => {
    const { result } = render(
      ['drums', 'guitar', 'bass'],
      makePlayer(['drums', 'guitar', 'bass']),
    );

    solo(result, 'drums');

    expect(control(result, 'drums').isSoloed).toBe(true);
    expect(control(result, 'drums').volume).toBe(100);
    expect(control(result, 'guitar').volume).toBe(0);
  });

  it('un-soloing the only soloed track restores everyone', () => {
    const { result } = render(
      ['drums', 'guitar'],
      makePlayer(['drums', 'guitar']),
    );

    solo(result, 'drums');
    solo(result, 'drums');

    expect(control(result, 'drums').isSoloed).toBe(false);
    expect(control(result, 'guitar').volume).toBe(100);
  });

  it('supports soloing a second track alongside the first', () => {
    const { result } = render(
      ['drums', 'guitar', 'bass'],
      makePlayer(['drums', 'guitar', 'bass']),
    );

    solo(result, 'drums');
    solo(result, 'guitar');

    expect(control(result, 'drums').isSoloed).toBe(true);
    expect(control(result, 'guitar').isSoloed).toBe(true);
    expect(control(result, 'guitar').volume).toBe(100);
  });

  it('un-soloing one of two soloed tracks mutes only that track', () => {
    const { result } = render(
      ['drums', 'guitar', 'bass'],
      makePlayer(['drums', 'guitar', 'bass']),
    );

    solo(result, 'drums');
    solo(result, 'guitar');
    solo(result, 'drums');

    expect(control(result, 'drums').isSoloed).toBe(false);
    expect(control(result, 'drums').volume).toBe(0);
    expect(control(result, 'guitar').isSoloed).toBe(true);
  });

  it('restores the muted volume a solo captured, not a stale default', () => {
    const { result } = render(
      ['drums', 'guitar'],
      makePlayer(['drums', 'guitar']),
    );

    setVolume(result, 'guitar', 40);
    solo(result, 'drums');

    expect(control(result, 'guitar').volume).toBe(0);

    solo(result, 'drums');

    expect(control(result, 'guitar').volume).toBe(40);
  });

  it('rebuilds controls when the track list changes', () => {
    const one = tracks('drums');
    const two = tracks('drums', 'guitar');
    const player = makePlayer(['drums', 'guitar']);
    const { result, rerender } = renderHook(
      ({ td }: { td: TrackConfig[] }) => useVolumeControls(td, player),
      { initialProps: { td: one } },
    );

    mute(result, 'drums');
    expect(control(result, 'drums').volume).toBe(0);

    rerender({ td: two });

    expect(result.current.volumeControls).toHaveLength(2);
    expect(control(result, 'drums').volume).toBe(100);
  });

  describe('persistence', () => {
    beforeEach(() => {
      settings.setMixerLevels.mockClear();
      settings.mixerLevels = {};
    });

    it('initialises from a persisted level', () => {
      settings.mixerLevels = { drums: 60, guitar: 80 };

      const { result } = render(
        ['drums', 'guitar'],
        makePlayer(['drums', 'guitar']),
      );

      expect(control(result, 'drums').volume).toBe(60);
      expect(control(result, 'guitar').volume).toBe(80);
    });

    it('falls back to 100 for a stem with no persisted level', () => {
      settings.mixerLevels = { drums: 60 };

      const { result } = render(
        ['drums', 'guitar'],
        makePlayer(['drums', 'guitar']),
      );

      expect(control(result, 'guitar').volume).toBe(100);
    });

    it('uses the persisted level when the track list changes, not the transient muted volume', () => {
      settings.mixerLevels = { drums: 80 };

      const one = tracks('drums');
      const two = tracks('drums', 'guitar');
      const player = makePlayer(['drums', 'guitar']);
      const { result, rerender } = renderHook(
        ({ td }: { td: TrackConfig[] }) => useVolumeControls(td, player),
        { initialProps: { td: one } },
      );

      mute(result, 'drums');
      expect(control(result, 'drums').volume).toBe(0);

      rerender({ td: two });

      expect(control(result, 'drums').volume).toBe(80);
    });

    it('writes to mixerLevels when the slider changes', () => {
      const { result } = render(['drums'], makePlayer(['drums']));

      setVolume(result, 'drums', 75);

      expect(settings.setMixerLevels).toHaveBeenCalledWith({ drums: 75 });
    });

    it('writes zero to mixerLevels when muting', () => {
      const { result } = render(['drums'], makePlayer(['drums']));

      setVolume(result, 'drums', 80);
      settings.setMixerLevels.mockClear();
      mute(result, 'drums');

      expect(settings.setMixerLevels).toHaveBeenCalledWith({ drums: 0 });
    });

    it('writes the restored volume to mixerLevels when unmuting', () => {
      const { result } = render(['drums'], makePlayer(['drums']));

      setVolume(result, 'drums', 80);
      mute(result, 'drums');
      settings.setMixerLevels.mockClear();
      mute(result, 'drums');

      expect(settings.setMixerLevels).toHaveBeenCalledWith({ drums: 80 });
    });

    it('does not write to mixerLevels when soloing the first track', () => {
      const { result } = render(
        ['drums', 'guitar'],
        makePlayer(['drums', 'guitar']),
      );

      solo(result, 'drums');

      expect(settings.setMixerLevels).not.toHaveBeenCalled();
    });

    it('does not write to mixerLevels when un-soloing the last soloed track', () => {
      const { result } = render(
        ['drums', 'guitar'],
        makePlayer(['drums', 'guitar']),
      );

      solo(result, 'drums');
      settings.setMixerLevels.mockClear();
      solo(result, 'drums');

      expect(settings.setMixerLevels).not.toHaveBeenCalled();
    });

    it('does not write to mixerLevels when soloing a second track', () => {
      const { result } = render(
        ['drums', 'guitar', 'bass'],
        makePlayer(['drums', 'guitar', 'bass']),
      );

      solo(result, 'drums');
      settings.setMixerLevels.mockClear();
      solo(result, 'guitar');

      expect(settings.setMixerLevels).not.toHaveBeenCalled();
    });

    it('does not write to mixerLevels when un-soloing one of multiple soloed tracks', () => {
      const { result } = render(
        ['drums', 'guitar', 'bass'],
        makePlayer(['drums', 'guitar', 'bass']),
      );

      solo(result, 'drums');
      solo(result, 'guitar');
      settings.setMixerLevels.mockClear();
      solo(result, 'drums');

      expect(settings.setMixerLevels).not.toHaveBeenCalled();
    });
  });
});
