import { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputEvent } from '../input/types';
import { AppProvider } from '../context/AppContext';
import {
  installIpcMock,
  installLocalStorage,
  IpcMock,
} from '../hooks/test-support';
import { SettingsButton } from './SettingsButton';

vi.mock('../input', () => ({
  inputBus: {
    start: () => {},
    subscribe: (_listener: (event: InputEvent) => void) => () => {},
    listDevices: () => Promise.resolve([]),
  },
  controlSource: (id: string) => id.slice(0, id.indexOf(':')),
  controlLabel: (id: string) => id.slice(id.indexOf(':') + 1),
}));

let ipc: IpcMock;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    </AppProvider>
  );
}

function renderSongView() {
  return render(<SettingsButton page="song-view" />, { wrapper });
}

function renderSongList(props = {}) {
  return render(<SettingsButton page="song-list" {...props} />, { wrapper });
}

function open() {
  fireEvent.click(screen.getByTestId('settings-trigger'));
}

function enableDev() {
  act(() => {
    ipc.emit('check-dev', true);
  });
}

function persisted(key: string) {
  return JSON.parse(window.localStorage.getItem(key)!);
}

beforeEach(() => {
  installLocalStorage();
  ipc = installIpcMock();
});

describe('SettingsButton — song-view parameters', () => {
  it('selects a playhead style and persists it', () => {
    renderSongView();
    open();

    fireEvent.click(screen.getByText('Measure'));

    expect(persisted('settings.playheadStyle')).toBe('Measure');
  });

  it('toggles enable colors', () => {
    renderSongView();
    open();

    const colorsRow = screen.getByText('Enable colors').parentElement!;

    fireEvent.click(colorsRow.querySelector('button[role="switch"]')!);

    expect(persisted('settings.enableColors')).toBe(false);
  });

  it('toggles show tempo', () => {
    renderSongView();
    open();

    const tempoRow = screen.getByText('Show tempo').parentElement!;

    fireEvent.click(tempoRow.querySelector('button[role="switch"]')!);

    expect(persisted('settings.showTempo')).toBe(false);
  });

  it('toggles count-in', () => {
    renderSongView();
    open();

    const countInRow = screen.getByText('Count-in').parentElement!;

    fireEvent.click(countInRow.querySelector('button[role="switch"]')!);

    expect(persisted('settings.countIn')).toBe(false);
  });

  it('hides the bar-numbers switch unless dev mode is on', () => {
    renderSongView();
    open();

    expect(screen.queryByText('Show bar numbers')).not.toBeInTheDocument();

    enableDev();

    expect(screen.getByText('Show bar numbers')).toBeInTheDocument();
  });

  it('renders the mixer sliders that were passed in', () => {
    render(
      <SettingsButton
        page="song-view"
        volumeSliders={[<div key="s" data-testid="mixer-slider" />]}
      />,
      { wrapper },
    );
    open();

    expect(screen.getByText('Mixer')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-slider')).toBeInTheDocument();
  });

  it('does not offer a difficulty selector on the song-view page', () => {
    renderSongView();
    open();

    expect(screen.queryByTestId('difficulty-expert')).not.toBeInTheDocument();
  });
});

describe('SettingsButton — song-list parameters', () => {
  it('selects a difficulty and persists it', () => {
    renderSongList();
    open();

    fireEvent.click(screen.getByTestId('difficulty-hard'));

    expect(persisted('settings.difficulty')).toBe('hard');
  });

  it('marks the active difficulty as primary', () => {
    window.localStorage.setItem(
      'settings.difficulty',
      JSON.stringify('medium'),
    );

    renderSongList();
    open();

    expect(screen.getByTestId('difficulty-medium').className).toContain(
      'ant-btn-primary',
    );
    expect(screen.getByTestId('difficulty-easy').className).not.toContain(
      'ant-btn-primary',
    );
  });

  it('requests a folder picker from the Select folder button', () => {
    renderSongList();
    open();

    fireEvent.click(screen.getByText('Select folder'));

    expect(ipc.sent).toContainEqual({ channel: 'rescan-songs', args: [] });
  });

  it('offers the stem-splitter download when tools are missing', () => {
    const onDownloadStemTools = vi.fn();

    renderSongList({ stemToolsStatus: 'download', onDownloadStemTools });
    open();

    fireEvent.click(screen.getByText(/Get stem splitter/));

    expect(onDownloadStemTools).toHaveBeenCalledTimes(1);
  });

  it('opens the input setup modal', () => {
    renderSongView();
    open();

    const modalBackdrop = screen
      .getByText('Configure input')
      .closest('.backdrop-blur-xs')!;

    expect(modalBackdrop.className).not.toContain('flex');

    fireEvent.click(screen.getByText('Setup input'));

    expect(modalBackdrop.className).toContain('flex');
  });
});
