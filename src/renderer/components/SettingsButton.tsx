import {
  ReactNode,
  memo,
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
  faArrowsRotate,
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
import { InputConfigModal } from './InputConfigModal';

interface Props {
  volumeSliders?: ReactNode[];
  page: 'song-list' | 'song-view';
  stemToolsStatus?: StemToolsStatus;
  stemToolsLoading?: boolean;
  downloadPercent?: number;
  scanPercent?: number;
  onDownloadStemTools?: () => void;
}

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export const SettingsButton = memo(function Settings({
  volumeSliders,
  page,
  stemToolsStatus,
  stemToolsLoading,
  downloadPercent,
  scanPercent,
  onDownloadStemTools,
}: Props) {
  const {
    difficulty,
    setDifficulty,
    playheadStyle,
    setPlayheadStyle,
    enableColors,
    setEnableColors,
    showBarNumbers,
    setShowBarNumbers,
    showTempo,
    setShowTempo,
    countIn,
    setCountIn,
    currentPath,
  } = useApp();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputConfigOpen, setInputConfigOpen] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('check-dev');
    window.electron.ipcRenderer.once('check-dev', (dev: boolean) => {
      setIsDev(dev);
    });
  }, []);
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
        data-testid="settings-trigger"
        style={{ anchorName: '--settings-trigger' } as CSSProperties}
      />

      <InputConfigModal
        isOpen={inputConfigOpen}
        onClose={() => {
          setInputConfigOpen(false);
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
            <div className="flex gap-2 grow">
              <Button
                icon={<FontAwesomeIcon icon={faFolder} />}
                onClick={() => {
                  window.electron.ipcRenderer.sendMessage('rescan-songs');
                }}
                title={currentPath ?? undefined}
                className="grow"
              >
                {currentPath
                  ? currentPath.split(/[\\/]/).pop()
                  : 'Select folder'}
              </Button>
              {currentPath ? (
                <Button
                  icon={<FontAwesomeIcon icon={faArrowsRotate} />}
                  data-testid="rescan-folder"
                  onClick={() => {
                    window.electron.ipcRenderer.sendMessage(
                      'rescan-songs',
                      false,
                    );
                  }}
                />
              ) : null}
            </div>
            {scanPercent !== undefined && (
              <div className="flex flex-col gap-1" data-testid="scan-progress">
                <div className="text-sm text-text-muted">Scanning songs</div>
                <Progress percent={scanPercent} />
              </div>
            )}
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
          onClick={() => {
            setInputConfigOpen(true);
          }}
        >
          Setup input
        </Button>

        {page === 'song-list' ? (
          <>
            <div className="flex flex-col gap-3">
              <div className="text-sm text-text-muted whitespace-nowrap">
                Difficulty
              </div>
              <div className="flex gap-2">
                {ALL_DIFFICULTIES.map((d) => (
                  <Button
                    key={d}
                    className="grow capitalize"
                    type={difficulty === d ? 'primary' : 'default'}
                    data-testid={`difficulty-${d}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {page === 'song-view' ? (
          <>
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
            {isDev && (
              <>
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
              </>
            )}
            <Divider />
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-text-muted whitespace-nowrap">
                Show tempo
              </div>
              <Switch
                size="small"
                checked={showTempo}
                onChange={setShowTempo}
              />
            </div>
          </>
        ) : null}
        {page === 'song-view' && (
          <>
            <Divider />
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-text-muted whitespace-nowrap">
                Count-in
              </div>
              <Switch size="small" checked={countIn} onChange={setCountIn} />
            </div>
          </>
        )}
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
});
