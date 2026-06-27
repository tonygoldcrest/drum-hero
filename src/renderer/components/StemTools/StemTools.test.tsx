import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StemTools } from './StemTools';

describe('StemTools', () => {
  it('offers the download with sizes when available', () => {
    const onDownloadStemTools = vi.fn();

    render(
      <StemTools
        stemToolsStatus="download"
        available
        downloadSize={280_000_000}
        uncompressedSize={700_000_000}
        onDownloadStemTools={onDownloadStemTools}
      />,
    );

    expect(
      screen.getByText(/280 MB download · 700 MB on disk/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Get stem splitter/));

    expect(onDownloadStemTools).toHaveBeenCalledTimes(1);
  });

  it('shows an unavailable message when the remote is unreachable', () => {
    render(<StemTools stemToolsStatus="download" available={false} />);

    expect(screen.getByTestId('stem-tools-unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Get stem splitter/)).not.toBeInTheDocument();
  });

  it('renders nothing until availability is known', () => {
    const { container } = render(<StemTools stemToolsStatus="download" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the installed version and deletes the tools', () => {
    const onDeleteStemTools = vi.fn();

    render(
      <StemTools
        stemToolsStatus="ready"
        installedVersion="1.2.0"
        onDeleteStemTools={onDeleteStemTools}
      />,
    );

    expect(
      screen.getByText(/Stem splitter installed \(v1\.2\.0\)/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('update-stem-tools')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('delete-stem-tools'));

    expect(onDeleteStemTools).toHaveBeenCalledTimes(1);
  });

  it('offers an update with sizes when a newer version is available', () => {
    const onDownloadStemTools = vi.fn();

    render(
      <StemTools
        stemToolsStatus="ready"
        installedVersion="1.0.0"
        latestVersion="1.2.0"
        updateAvailable
        downloadSize={280_000_000}
        uncompressedSize={700_000_000}
        onDownloadStemTools={onDownloadStemTools}
      />,
    );

    expect(
      screen.getByText(/280 MB download · 700 MB on disk/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Update to v1\.2\.0/));

    expect(onDownloadStemTools).toHaveBeenCalledTimes(1);
  });

  it('shows the extracting phase and cancels an in-progress install', () => {
    const onCancelStemTools = vi.fn();

    render(
      <StemTools
        stemToolsStatus="download"
        stemToolsLoading
        downloadPercent={60}
        phase="extracting"
        onCancelStemTools={onCancelStemTools}
      />,
    );

    expect(screen.getByText('Extracting…')).toBeInTheDocument();
    expect(screen.queryByText(/Get stem splitter/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-stem-tools'));

    expect(onCancelStemTools).toHaveBeenCalledTimes(1);
  });
});
