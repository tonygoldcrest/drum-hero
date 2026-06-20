import {
  ReactNode,
  useEffect,
  useRef,
  type RefObject,
  type CSSProperties,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Divider, Progress, Switch } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog,
  faDownload,
  faDrum,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { PLAYHEAD_STYLES } from '../types';
import { useApp } from '../context/AppContext';
import { cn } from '../cn';
import { usePopoverOutsideClick } from '../hooks/usePopoverOutsideClick';
import { Difficulty } from 'scan-chart';
import { StemToolsStatus } from '../../types';
import { MidiConfigModal } from './MidiConfigModal';

interface Props {
  volumeSliders?: ReactNode[];
  difficulties?: Difficulty[];
  difficulty?: Difficulty;
  onChangeDifficulty?: (difficulty: Difficulty) => void;
  page: 'song-list' | 'song-view';
  stemToolsStatus?: StemToolsStatus;
  stemToolsLoading?: boolean;
  downloadPercent?: number;
  onDownloadStemTools?: () => void;
}

export function SettingsButton({
  difficulty,
  onChangeDifficulty,
  volumeSliders,
  difficulties,
  page,
  stemToolsStatus,
  stemToolsLoading,
  downloadPercent,
  onDownloadStemTools,
}: Props) {
  const {
    playheadStyle,
    setPlayheadStyle,
    enableColors,
    setEnableColors,
    showBarNumbers,
    setShowBarNumbers,
    progressColoring,
    setProgressColoring,
    currentPath,
  } = useApp();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [midiConfigOpen, setMidiConfigOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    popoverRef.current?.hidePopover();
    setIsPopoverOpen(false);
  }, [pathname]);
  usePopoverOutsideClick(isPopoverOpen, popoverRef, triggerRef, () => {
    popoverRef.current?.hidePopover();
    setIsPopoverOpen(false);
  });

  const toggle = () => {
    const el = popoverRef.current;

    if (!el) {
      return;
    }

    if (el.matches(':popover-open')) {
      el.hidePopover();
      setIsPopoverOpen(false);
    } else {
      el.showPopover();
      setIsPopoverOpen(true);
    }
  };

  return (
    <>
      <Button
        ref={triggerRef as RefObject<HTMLButtonElement>}
        icon={<FontAwesomeIcon icon={faCog} />}
        onClick={toggle}
        size="large"
        style={{ anchorName: '--settings-trigger' } as CSSProperties}
      />

      <MidiConfigModal
        isOpen={midiConfigOpen}
        onClose={() => {
          setMidiConfigOpen(false);
        }}
      />

      <div
        ref={popoverRef}
        popover="manual"
        className={cn(
          'border border-border p-3 rounded-xl shadow-panel font-ui fixed min-w-90 inset-[unset] m-[unset] gap-3 bg-bg',
          {
            'flex flex-col ': isPopoverOpen,
          },
        )}
        style={
          {
            positionAnchor: '--settings-trigger',
            top: 'calc(anchor(bottom) + 8px)',
            right: 'anchor(right)',
          } as CSSProperties
        }
      >
        {page === 'song-list' && (
          <>
            <Button
              icon={<FontAwesomeIcon icon={faFolder} />}
              onClick={() => {
                window.electron.ipcRenderer.sendMessage('rescan-songs');
              }}
              title={currentPath ?? undefined}
            >
              {currentPath ? currentPath.split('/').pop() : 'Select folder'}
            </Button>
            {stemToolsStatus === 'download' && (
              <Button
                icon={<FontAwesomeIcon icon={faDownload} />}
                loading={stemToolsLoading}
                onClick={onDownloadStemTools}
              >
                Get stem splitter (~130 MB)
              </Button>
            )}
            {downloadPercent !== undefined && (
              <Progress percent={downloadPercent} />
            )}
          </>
        )}

        <Button
          icon={<FontAwesomeIcon icon={faDrum} />}
          loading={stemToolsLoading}
          onClick={() => {
            setMidiConfigOpen(true);
          }}
        >
          Setup E-kit
        </Button>

        {page === 'song-view' && difficulties && difficulties.length > 0 ? (
          <>
            <div className="flex flex-col gap-3">
              <div className="text-sm text-text-muted whitespace-nowrap">
                Difficulty
              </div>
              <div className="flex gap-2">
                {difficulties.map((d) => (
                  <Button
                    key={d}
                    className="grow"
                    type={difficulty === d ? 'primary' : 'default'}
                    onClick={() => onChangeDifficulty?.(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
            <Divider />
          </>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="text-sm text-text-muted whitespace-nowrap">
            Playhead style
          </div>

          <div className="flex gap-2">
            {PLAYHEAD_STYLES.map((s) => (
              <Button
                key={s}
                className="grow"
                type={playheadStyle === s ? 'primary' : 'default'}
                onClick={() => setPlayheadStyle(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <Divider />

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-text-muted whitespace-nowrap">
            Enable colors
          </div>
          <Switch
            size="small"
            checked={enableColors}
            onChange={setEnableColors}
          />
        </div>
        <Divider />
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-text-muted whitespace-nowrap">
            Show bar numbers
          </div>
          <Switch
            size="small"
            checked={showBarNumbers}
            onChange={setShowBarNumbers}
          />
        </div>
        <Divider />
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-text-muted whitespace-nowrap">
            Fade played notes
          </div>
          <Switch
            size="small"
            checked={progressColoring}
            onChange={setProgressColoring}
          />
        </div>
        {volumeSliders ? (
          <>
            <div className="flex items-center gap-3">
              <div
                className="grow h-px"
                style={{ background: 'var(--gradient-accent-fade-reverse)' }}
              />
              <div className="text-accent-text uppercase font-semibold text-[13px]">
                Mixer
              </div>
              <div
                className="grow h-px"
                style={{ background: 'var(--gradient-accent-fade)' }}
              />
            </div>
            <div className="grid grid-cols-[max-content_1fr_max-content_max-content] items-center gap-x-2 gap-y-1">
              {volumeSliders}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
