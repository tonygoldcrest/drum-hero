import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScoreData, SongData } from '../../types';
import { ScoreModal } from './ScoreModal';

const songData = {
  name: 'Master of Puppets',
  artist: 'Metallica',
} as SongData;

function filledStars() {
  return document.querySelectorAll('svg[data-prefix="fas"][data-icon="star"]')
    .length;
}

function renderModal(
  scoreData: ScoreData,
  overrides: Partial<Parameters<typeof ScoreModal>[0]> = {},
) {
  const onRetry = vi.fn();
  const onNextSong = vi.fn();

  render(
    <ScoreModal
      isOpen
      onRetry={onRetry}
      onNextSong={onNextSong}
      songData={songData}
      difficulty="expert"
      scoreData={scoreData}
      {...overrides}
    />,
  );

  return { onRetry, onNextSong };
}

describe('ScoreModal', () => {
  it('shows the song, artist and difficulty', () => {
    renderModal({ hitNotes: 70, totalNotes: 100, falseHits: 0 });

    expect(screen.getByText('Master of Puppets')).toBeInTheDocument();
    expect(screen.getByText('Metallica')).toBeInTheDocument();
    expect(screen.getByText('expert')).toBeInTheDocument();
  });

  it('fills a star per rating band and shows the accuracy percentage', () => {
    renderModal({ hitNotes: 70, totalNotes: 100, falseHits: 0 });

    expect(filledStars()).toBe(3);
    expect(screen.getByText('70% accuracy')).toBeInTheDocument();
  });

  it('shows Perfect and five stars for a flawless run', () => {
    renderModal({ hitNotes: 100, totalNotes: 100, falseHits: 0 });

    expect(filledStars()).toBe(5);
    expect(screen.getByText('Perfect')).toBeInTheDocument();
  });

  it('reports notes hit and false hits', () => {
    renderModal({ hitNotes: 42, totalNotes: 100, falseHits: 7 });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('100 notes hit')).toBeInTheDocument();
    expect(screen.getByText('7 false hits')).toBeInTheDocument();
  });

  it('calls onRetry and onNextSong from the footer buttons', () => {
    const { onRetry, onNextSong } = renderModal({
      hitNotes: 50,
      totalNotes: 100,
      falseHits: 0,
    });

    fireEvent.click(screen.getByText('Retry'));
    fireEvent.click(screen.getByText('Next song'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onNextSong).toHaveBeenCalledTimes(1);
  });

  it('reveals the modal only when open', () => {
    const { rerender } = render(
      <ScoreModal
        isOpen={false}
        onRetry={vi.fn()}
        onNextSong={vi.fn()}
        songData={songData}
        difficulty="expert"
        scoreData={{ hitNotes: 50, totalNotes: 100, falseHits: 0 }}
      />,
    );

    expect(screen.getByTestId('score-modal')).not.toHaveClass('flex');

    rerender(
      <ScoreModal
        isOpen
        onRetry={vi.fn()}
        onNextSong={vi.fn()}
        songData={songData}
        difficulty="expert"
        scoreData={{ hitNotes: 50, totalNotes: 100, falseHits: 0 }}
      />,
    );

    expect(screen.getByTestId('score-modal')).toHaveClass('flex');
  });
});
