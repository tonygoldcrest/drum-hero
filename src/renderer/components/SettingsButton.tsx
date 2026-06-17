import {
  ReactNode,
  useEffect,
  useRef,
  type RefObject,
  type CSSProperties,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Divider, Switch } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faFolder } from '@fortawesome/free-solid-svg-icons';
import { Difficulty } from '../../chart-parser/types';
import { PLAYHEAD_STYLES } from '../types';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../cn';

interface Props {
  volumeSliders?: ReactNode[];
}

export function SettingsButton({ volumeSliders }: Props) {
  const {
    difficulty,
    setDifficulty,
    playheadStyle,
    setPlayheadStyle,
    enableColors,
    setEnableColors,
    showBarNumbers,
    setShowBarNumbers,
    progressColoring,
    setProgressColoring,
    currentPath,
  } = useSettings();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    popoverRef.current?.hidePopover();
    setIsPopoverOpen(false);
  }, [pathname]);

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
      <div
        ref={popoverRef}
        popover="manual"
        className={cn(
          'border border-border p-3 rounded-xl shadow-panel font-ui fixed min-w-90 inset-[unset] m-[unset] gap-3',
          {
            'flex flex-col ': isPopoverOpen,
          },
        )}
        style={
          {
            background: 'var(--gradient-header)',
            positionAnchor: '--settings-trigger',
            top: 'calc(anchor(bottom) + 8px)',
            right: 'anchor(right)',
          } as CSSProperties
        }
      >
        <Button
          icon={<FontAwesomeIcon icon={faFolder} />}
          onClick={() => {
            window.electron.ipcRenderer.sendMessage('rescan-songs');
          }}
          title={currentPath ?? undefined}
        >
          {currentPath ? currentPath.split('/').pop() : 'Select folder'}
        </Button>
        <div className="flex flex-col gap-3">
          <div className="text-sm text-text-muted whitespace-nowrap">
            Difficulty
          </div>
          <div className="flex gap-2">
            {Object.values(Difficulty).map((d) => (
              <Button
                key={d}
                className="grow"
                type={difficulty === d ? 'primary' : 'default'}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
        <Divider />
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
