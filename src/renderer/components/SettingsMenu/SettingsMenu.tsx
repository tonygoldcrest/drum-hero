import { Button } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCompress,
  faGear,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { ReactNode } from 'react';
import { SettingsItem, Wrapper } from './styles';

export interface SettingsMenuProps {
  isPlaying: boolean;
  onPlayClick: () => void;
  onBackClick: () => void;
  isExpanded: boolean;
  onExpandClick: () => void;
  children: ReactNode[];
  isLoading: boolean;
}

export function SettingsMenu({
  isPlaying,
  onPlayClick,
  onBackClick,
  isExpanded,
  onExpandClick,
  children,
  isLoading,
}: SettingsMenuProps) {
  return (
    <Wrapper>
      <SettingsItem>
        <Button
          shape="circle"
          size="large"
          icon={<FontAwesomeIcon icon={faArrowLeft} />}
          onClick={onBackClick}
        />
      </SettingsItem>
      <SettingsItem>
        <Button
          shape="circle"
          type="primary"
          size="large"
          loading={isLoading}
          icon={
            isPlaying ? (
              <FontAwesomeIcon icon={faPause} />
            ) : (
              <FontAwesomeIcon icon={faPlay} />
            )
          }
          onClick={onPlayClick}
        />
      </SettingsItem>
      <SettingsItem>
        <Button
          shape="circle"
          size="large"
          loading={isLoading}
          icon={
            isExpanded ? (
              <FontAwesomeIcon icon={faCompress} />
            ) : (
              <FontAwesomeIcon icon={faGear} />
            )
          }
          onClick={onExpandClick}
        />
      </SettingsItem>
      {isExpanded && !isLoading && (
        <div>
          {children.map((child, index) => (
            <SettingsItem key={index}>{child}</SettingsItem>
          ))}
        </div>
      )}
    </Wrapper>
  );
}
