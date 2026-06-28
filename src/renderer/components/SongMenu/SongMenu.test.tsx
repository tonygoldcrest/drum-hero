import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StemToolsStatus } from '../../../types';
import { installIpcMock, IpcMock } from '../../hooks/test-support';
import { StemToolsProvider } from '../../context/StemToolsContext';
import { SongMenu } from './SongMenu';

function stemToolsValue(stemToolsStatus: StemToolsStatus) {
  return {
    stemToolsStatus,
    stemToolsLoading: false,
    downloadPercent: undefined,
    phase: undefined,
    installedVersion: undefined,
    latestVersion: undefined,
    updateAvailable: false,
    available: undefined,
    downloadSize: undefined,
    uncompressedSize: undefined,
    download: () => {},
    cancel: () => {},
    deleteTools: () => {},
  };
}

function renderMenu(
  overrides: Partial<Parameters<typeof SongMenu>[0]> = {},
  status: StemToolsStatus = 'ready',
) {
  const onSplit = vi.fn();

  render(
    <MemoryRouter>
      <StemToolsProvider value={stemToolsValue(status)}>
        <SongMenu
          dir="/songs/track"
          canSplit
          splitting={false}
          onSplit={onSplit}
          {...overrides}
        />
      </StemToolsProvider>
    </MemoryRouter>,
  );

  return { onSplit };
}

describe('SongMenu', () => {
  let ipc: IpcMock;

  beforeEach(() => {
    ipc = installIpcMock();
  });

  afterEach(() => {
    delete (window as unknown as { electron?: unknown }).electron;
  });

  it('opens the menu on the trigger', () => {
    renderMenu();

    expect(screen.queryByText('Open song directory')).toBeNull();

    fireEvent.click(screen.getByTestId('song-menu-trigger'));

    expect(screen.getByText('Open song directory')).toBeInTheDocument();
  });

  it('opens the song directory through IPC', () => {
    renderMenu();

    fireEvent.click(screen.getByTestId('song-menu-trigger'));
    fireEvent.click(screen.getByText('Open song directory'));

    expect(ipc.sent).toContainEqual({
      channel: 'open-song-directory',
      args: ['/songs/track'],
    });
  });

  it('offers stem splitting only when tools are ready and splitting is allowed', () => {
    renderMenu({ canSplit: false });
    fireEvent.click(screen.getByTestId('song-menu-trigger'));

    expect(screen.queryByText('Split stems')).toBeNull();
  });

  it('hides splitting when the stem tools are not ready', () => {
    renderMenu({}, 'download');
    fireEvent.click(screen.getByTestId('song-menu-trigger'));

    expect(screen.queryByText('Split stems')).toBeNull();
  });

  it('triggers a split and closes the menu', () => {
    const { onSplit } = renderMenu();

    fireEvent.click(screen.getByTestId('song-menu-trigger'));
    fireEvent.click(screen.getByText('Split stems'));

    expect(onSplit).toHaveBeenCalledTimes(1);
  });

  it('shows a disabled splitting label while a split is in progress', () => {
    const { onSplit } = renderMenu({ splitting: true });

    fireEvent.click(screen.getByTestId('song-menu-trigger'));

    const button = screen.getByText('Splitting…').closest('button')!;

    expect(button).toBeDisabled();

    fireEvent.click(button);

    expect(onSplit).not.toHaveBeenCalled();
  });
});
