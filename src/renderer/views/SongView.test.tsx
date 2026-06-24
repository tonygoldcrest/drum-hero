import { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseChartFile } from 'scan-chart';
import { ChartParser } from '../../chart-parser/parser';
import { renderMusic } from '../../chart-parser/renderer';
import { IpcLoadSongResponse, SongData } from '../../types';
import { TrackConfig } from '../services/audio-player/types';
import { AppProvider } from '../context/AppContext';
import {
  getNotification,
  installIpcMock,
  installLocalStorage,
  IpcMock,
  resetNotification,
} from '../hooks/test-support';
import { SongView } from './SongView';

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();

  return {
    ...actual,
    App: Object.assign({}, actual.App, {
      useApp: () => ({ notification: getNotification() }),
    }),
  };
});

vi.mock('scan-chart', () => ({ parseChartFile: vi.fn() }));
vi.mock('../../chart-parser/parser', () => ({ ChartParser: vi.fn() }));
vi.mock('../../chart-parser/renderer', () => ({ renderMusic: vi.fn() }));

vi.mock('../services/audio-player/player', () => {
  class MockAudioPlayer {
    static instances: MockAudioPlayer[] = [];

    trackData: TrackConfig[];

    onEnded: () => void;

    ready = Promise.resolve([]);

    currentTime = 0;

    duration = 100;

    isInitialised = false;

    audioTracks: { name: string; setVolume: () => void }[] = [];

    start = vi.fn(() => {
      this.isInitialised = true;
    });

    resume = vi.fn();

    pause = vi.fn();

    stop = vi.fn();

    destroy = vi.fn();

    constructor(trackData: TrackConfig[], onEnded: () => void) {
      this.trackData = trackData;
      this.onEnded = onEnded;
      MockAudioPlayer.instances.push(this);
    }
  }

  return { AudioPlayer: MockAudioPlayer };
});

const parseChartFileMock = vi.mocked(parseChartFile);
const ChartParserMock = vi.mocked(ChartParser);
const renderMusicMock = vi.mocked(renderMusic);
const CHART = {
  resolution: 480,
  tempos: [{ tick: 0, beatsPerMinute: 120, msTime: 0 }],
  trackData: [
    { instrument: 'drums', difficulty: 'hard' },
    { instrument: 'drums', difficulty: 'expert' },
  ],
};
let ipc: IpcMock;

function makeSong(extra: Partial<SongData> = {}): SongData {
  return {
    id: 'song-1',
    name: 'Master of Puppets',
    artist: 'Metallica',
    charter: 'Charter',
    format: 'mid',
    delay: '0',
    five_lane_drums: 'False',
    pro_drums: 'True',
    audio: [{ src: 'song.ogg', name: 'song' }],
    ...extra,
  } as SongData;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <MemoryRouter initialEntries={['/song-1']}>
        <Routes>
          <Route path="/" element={<div data-testid="song-list-stub" />} />
          <Route path=":id" element={children} />
        </Routes>
      </MemoryRouter>
    </AppProvider>
  );
}

async function getInstances() {
  const mod = await import('../services/audio-player/player');

  return (
    mod.AudioPlayer as unknown as { instances: { onEnded: () => void }[] }
  ).instances;
}

async function loadSong(song: SongData = makeSong()) {
  const response: IpcLoadSongResponse = {
    data: song,
    fileData: new Uint8Array([1, 2, 3]) as unknown as Buffer,
  };

  await act(async () => {
    ipc.emit('load-song', response);
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(async () => {
  installLocalStorage();
  ipc = installIpcMock();
  resetNotification();
  parseChartFileMock.mockReset().mockReturnValue(CHART as never);
  ChartParserMock.mockReset().mockImplementation(function ChartParserStub() {
    return { parsed: true } as never;
  } as never);
  renderMusicMock.mockReset().mockReturnValue([]);
  (await getInstances()).length = 0;
});

function renderView() {
  return render(<SongView />, { wrapper });
}

describe('SongView — loading', () => {
  it('requests the song and prevents sleep on mount', () => {
    renderView();

    const channels = ipc.sent.map((s) => s.channel);

    expect(ipc.sent).toContainEqual({ channel: 'load-song', args: ['song-1'] });
    expect(channels).toContain('prevent-sleep');
    expect(channels).toContain('check-dev');
  });

  it('renders song metadata and the sheet once the song loads', async () => {
    renderView();

    await loadSong();

    expect(screen.getAllByText('Master of Puppets').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Metallica').length).toBeGreaterThan(0);
    expect(parseChartFileMock).toHaveBeenCalledTimes(1);
    expect(ChartParserMock).toHaveBeenLastCalledWith(CHART, false, 'expert');
  });

  it('resumes sleep when the view unmounts', () => {
    const { unmount } = renderView();

    unmount();

    expect(ipc.sent.map((s) => s.channel)).toContain('resume-sleep');
  });
});

describe('SongView — playback', () => {
  async function runCountIn() {
    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
    }
  }

  it('counts in before starting, then pauses, from the play button', async () => {
    vi.useFakeTimers();

    try {
      renderView();
      await loadSong();

      const [player] = await getInstances();
      const start = (player as unknown as { start: ReturnType<typeof vi.fn> })
        .start;

      fireEvent.click(screen.getByTestId('play-toggle'));

      expect(start).not.toHaveBeenCalled();
      expect(screen.getByText('1')).toBeInTheDocument();

      await runCountIn();

      expect(start).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('play-toggle'));
      expect(
        (player as unknown as { pause: ReturnType<typeof vi.fn> }).pause,
      ).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels the count-in when the play button is pressed again', async () => {
    vi.useFakeTimers();

    try {
      renderView();
      await loadSong();

      const [player] = await getInstances();
      const start = (player as unknown as { start: ReturnType<typeof vi.fn> })
        .start;

      fireEvent.click(screen.getByTestId('play-toggle'));
      expect(screen.getByText('1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('play-toggle'));

      await runCountIn();

      expect(start).not.toHaveBeenCalled();
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts immediately when the count-in is disabled in settings', async () => {
    localStorage.setItem('settings.countIn', 'false');

    renderView();
    await loadSong();

    const [player] = await getInstances();
    const start = (player as unknown as { start: ReturnType<typeof vi.fn> })
      .start;

    fireEvent.click(screen.getByTestId('play-toggle'));

    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('navigates back to the song list', async () => {
    renderView();
    await loadSong();

    fireEvent.click(screen.getByTestId('back-button'));

    expect(screen.getByTestId('song-list-stub')).toBeInTheDocument();
  });
});

describe('SongView — difficulty', () => {
  it('reparses the chart when a different difficulty is selected', async () => {
    renderView();
    await loadSong();

    fireEvent.click(screen.getByTestId('settings-trigger'));
    fireEvent.click(screen.getByTestId('difficulty-hard'));

    expect(ChartParserMock).toHaveBeenLastCalledWith(CHART, false, 'hard');
  });
});

describe('SongView — score', () => {
  async function finishSong() {
    const [player] = await getInstances();

    await act(async () => {
      (player as unknown as { onEnded: () => void }).onEnded();
    });
  }

  it('shows the score modal and persists a new high score when the song ends', async () => {
    renderView();
    await loadSong();

    expect(screen.getByTestId('score-modal')).not.toHaveClass('flex');

    await finishSong();

    expect(screen.getByTestId('score-modal')).toHaveClass('flex');
    expect(ipc.sent.map((s) => s.channel)).toContain('update-song');
  });

  it('closes the modal on retry', async () => {
    renderView();
    await loadSong();
    await finishSong();

    fireEvent.click(screen.getByText('Retry'));

    expect(screen.getByTestId('score-modal')).not.toHaveClass('flex');
  });

  it('returns to the song list on next song', async () => {
    renderView();
    await loadSong();
    await finishSong();

    fireEvent.click(screen.getByText('Next song'));

    expect(screen.getByTestId('song-list-stub')).toBeInTheDocument();
  });
});
