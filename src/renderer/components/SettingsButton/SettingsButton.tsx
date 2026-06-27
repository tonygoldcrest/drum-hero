import {
  ReactNode,
  memo,
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Button } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../../context/AppContext';
import { Popover } from '../Popover';
import { InputConfig, useInputConfig } from '../InputConfig';
import { SongListSettings } from './SongListSettings';
import { SongViewSettings } from './SongViewSettings';

interface Props {
  volumeSliders?: ReactNode[];
  page: 'song-list' | 'song-view';
  scanPercent?: number;
}

export const SettingsButton = memo(function Settings({
  volumeSliders,
  page,
  scanPercent,
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
  const [isOpen, setIsOpen] = useState(false);
  const [inputConfigOpen, setInputConfigOpen] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const inputConfig = useInputConfig(inputConfigOpen);
  const currentInputName = inputConfig.selectedDeviceName;

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('check-dev');
    window.electron.ipcRenderer.once('check-dev', (dev: boolean) => {
      setIsDev(dev);
    });
  }, []);

  const openInput = () => setInputConfigOpen(true);

  return (
    <>
      <InputConfig
        isOpen={inputConfigOpen}
        onClose={() => setInputConfigOpen(false)}
        {...inputConfig}
      />

      <Popover
        anchorName="--settings-trigger"
        open={isOpen}
        onOpenChange={setIsOpen}
        contentClassName="min-w-90 bg-bg p-3 gap-3"
        renderTrigger={({ ref, toggle, anchorStyle }) => (
          <Button
            ref={ref as RefObject<HTMLButtonElement>}
            icon={<FontAwesomeIcon icon={faCog} />}
            onClick={toggle}
            size="large"
            data-testid="settings-trigger"
            style={anchorStyle as CSSProperties}
          />
        )}
      >
        {page === 'song-list' ? (
          <SongListSettings
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            currentPath={currentPath}
            onSelectFolder={() =>
              window.electron.ipcRenderer.sendMessage('rescan-songs')
            }
            onRescan={() =>
              window.electron.ipcRenderer.sendMessage('rescan-songs', false)
            }
            scanPercent={scanPercent}
            onSetupInput={openInput}
            currentInputName={currentInputName}
          />
        ) : (
          <SongViewSettings
            playheadStyle={playheadStyle}
            onPlayheadStyleChange={setPlayheadStyle}
            enableColors={enableColors}
            onEnableColorsChange={setEnableColors}
            showBarNumbers={showBarNumbers}
            onShowBarNumbersChange={setShowBarNumbers}
            showTempo={showTempo}
            onShowTempoChange={setShowTempo}
            countIn={countIn}
            onCountInChange={setCountIn}
            isDev={isDev}
            onSetupInput={openInput}
            volumeSliders={volumeSliders}
            currentInputName={currentInputName}
          />
        )}
      </Popover>
    </>
  );
});
