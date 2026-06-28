import { Button, Divider, Modal } from 'antd';
import { InputElement, InputMapping } from '../../../types';
import { controlLabel, InputDevice } from '../../input';
import { modalStyles, MODAL_ABOVE_POPOVER_Z_INDEX } from '../../overlayStyles';
import { IconButton } from '../IconButton';
import themedark from '../../theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInfoCircle,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { MappingElement } from '../../types';
import { KIT_ELEMENTS } from '../../constants';
import { elementIcon } from '../../util';
import { Tooltip } from '../Tooltip';

const CONTROL_ELEMENTS: MappingElement[] = [
  {
    value: 'pause',
    displayName: 'Pause',
    color: themedark.color.textMuted,
    type: 'control',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  devices: InputDevice[];
  selectedDeviceId: string | undefined;
  onSelectDevice: (id: string | undefined) => void;
  mapping: InputMapping;
  listeningTo: InputElement | undefined;
  onLearn: (element: InputElement) => void;
  onStopLearn: () => void;
  onRemoveControl: (element: InputElement, control: string) => void;
}

export function InputConfig({
  isOpen,
  onClose,
  devices,
  selectedDeviceId,
  onSelectDevice,
  mapping,
  listeningTo,
  onLearn,
  onStopLearn,
  onRemoveControl,
}: Props) {
  const renderElement = (element: MappingElement) => (
    <div
      key={element.value}
      className="bg-surface text-text-body border border-border p-2 rounded-md flex flex-col"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 w-40 shrink-0 overflow-hidden">
          <FontAwesomeIcon
            style={{
              color: element.color,
            }}
            icon={elementIcon(element.type)}
            size="lg"
            className="w-5"
          />

          <div className="flex items-center">
            <div className="font-semibold text-nowrap">
              {element.displayName}
            </div>
            {element.alternative && (
              <>
                <Divider vertical className="bg-text-dimmer mt-0.5!" />
                <div className="font-semibold text-nowrap">
                  {element.alternative}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {mapping[element.value]?.map((control) => (
            <div
              className="font-semibold text-xs bg-surface-raised p-1 border-border-soft border rounded-md flex items-center gap-1"
              key={control}
            >
              {controlLabel(control)}
              <IconButton
                type="primary"
                size="sm"
                icon={faXmark}
                className="focus-visible:outline-accent-hover focus-visible:outline-1"
                onClick={() => onRemoveControl(element.value, control)}
              />
            </div>
          ))}
        </div>
        {element.value === listeningTo ? (
          <Button
            className="ml-auto animate-pulse"
            type="primary"
            onClick={onStopLearn}
          >
            Listening
          </Button>
        ) : (
          <Button
            icon={<FontAwesomeIcon icon={faPlus} />}
            className="ml-auto"
            type="default"
            onClick={() => onLearn(element.value)}
          >
            Learn
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={<div className="font-semibold text-xl">Configure input</div>}
      footer={
        <Button type="primary" onClick={onClose}>
          Done
        </Button>
      }
      width={640}
      destroyOnHidden
      styles={modalStyles}
      zIndex={MODAL_ABOVE_POPOVER_Z_INDEX}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-text-faint text-[12px] font-semibold uppercase">
            Input Device
          </div>
          <select
            className="select"
            value={selectedDeviceId}
            onChange={(event) => onSelectDevice(event.target.value)}
          >
            <option value={undefined}>- None -</option>
            {devices.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="text-text-faint text-[12px] font-semibold uppercase">
              Mapping
            </div>

            <Tooltip
              title={
                <div className="flex flex-col gap-2">
                  <div>
                    Map more than one button to a single drum. If a cymbal sends
                    a different signal depending on where you hit it, add each
                    one so every hit counts.
                  </div>
                  <div>
                    Your drums also get you around the app. Hit them to move
                    through menus and pick songs. Little drum icons pop up to
                    show which one to hit.
                  </div>
                </div>
              }
              placement="right"
            >
              <FontAwesomeIcon
                icon={faInfoCircle}
                color={themedark.color.textDim}
              />
            </Tooltip>
          </div>
          {[...KIT_ELEMENTS.values()].map(renderElement)}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-text-faint text-[12px] font-semibold uppercase">
            Controls
          </div>
          {CONTROL_ELEMENTS.map(renderElement)}
        </div>
      </div>
    </Modal>
  );
}
