import { Button, Divider } from 'antd';
import { useSettings } from '../context/SettingsContext';
import { useEffect, useRef, useState } from 'react';
import {
  MidiDevice,
  MidiMapping,
  MidiMessage,
  MidiMessageType,
} from '../../types';
import { cn } from '../cn';
import themedark from '../theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { uniq } from 'es-toolkit';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const KIT_ELEMENTS: {
  value: keyof MidiMapping;
  color: string;
  displayName: string;
}[] = [
  { value: 'hihat', displayName: 'Hi-Hat', color: themedark.color.yellow },
  { value: 'ride', displayName: 'Ride', color: themedark.color.blue },
  { value: 'crash', displayName: 'Crash', color: themedark.color.green },
  { value: 'snare', displayName: 'Snare', color: themedark.color.red },
  { value: 'tom1', displayName: 'Tom 1', color: themedark.color.yellow },
  { value: 'tom2', displayName: 'Tom 2', color: themedark.color.blue },
  { value: 'tom3', displayName: 'Tom 3', color: themedark.color.green },
  { value: 'kick', displayName: 'Kick', color: themedark.color.orange },
];

export function MidiConfigModal({ isOpen, onClose }: Props) {
  const { setSelectedDevice, selectedDevice, midiMapping, setMidiMapping } =
    useSettings();
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [listeningTo, setListeningTo] = useState<keyof MidiMapping>();
  const listeningToRef = useRef(listeningTo);
  const midiMappingRef = useRef(midiMapping);

  listeningToRef.current = listeningTo;
  midiMappingRef.current = midiMapping;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.electron.ipcRenderer.sendMessage('midi-device-list');

    window.electron.ipcRenderer.once<MidiDevice[]>(
      'midi-device-list',
      setMidiDevices,
    );
  }, [isOpen]);

  useEffect(() => {
    if (!selectedDevice || !isOpen) {
      return;
    }

    window.electron.ipcRenderer.sendMessage('listen-midi', selectedDevice.port);

    return window.electron.ipcRenderer.on<MidiMessage>(
      'listen-midi',
      ({ note, type }) => {
        const listening = listeningToRef.current;

        if (type === MidiMessageType.NoteOn && listening) {
          const current = midiMappingRef.current;
          const updated = Object.fromEntries(
            (Object.keys(current) as (keyof MidiMapping)[]).map((key) => [
              key,
              key === listening
                ? uniq([...(current[key] ?? []), note])
                : (current[key] ?? []).filter((n) => n !== note),
            ]),
          ) as MidiMapping;

          setMidiMapping(updated);
          setListeningTo(undefined);
        }
      },
    );
  }, [setMidiMapping, selectedDevice, isOpen]);

  useEffect(() => {
    if (isOpen) {
      backdropRef.current?.showPopover();
    } else {
      backdropRef.current?.hidePopover();
      window.electron.ipcRenderer.sendMessage('stop-listen-midi');
      setListeningTo(undefined);
    }
  }, [isOpen]);

  return (
    <div
      ref={backdropRef}
      className={cn(
        'fixed w-full h-full backdrop-blur-xs bg-transparent z-10',
        { flex: isOpen },
      )}
      popover="manual"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        const target = event.target as Node;

        if (!modalRef.current?.contains(target)) {
          onClose();
        }
      }}
    >
      <div
        className="border border-border rounded-xl shadow-panel font-ui w-140 m-auto flex flex-col bg-bg"
        ref={modalRef}
      >
        <div
          className="text-text-body font-semibold text-xl p-4 rounded-t-xl"
          style={{ background: 'var(--gradient-header)' }}
        >
          Configure E-Drums
        </div>
        <Divider />
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <div className="text-text-faint text-[12px] font-semibold uppercase">
              MIDI Input Device
            </div>
            <select
              className="select"
              value={selectedDevice?.name}
              onChange={(event) => {
                setSelectedDevice(
                  midiDevices.find(
                    (device) => device.name === event.target.value,
                  ) ?? null,
                );
              }}
            >
              <option value={undefined}>- None -</option>
              {midiDevices.map(({ name, port }) => (
                <option key={port} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-text-faint text-[12px] font-semibold uppercase">
              Mapping
            </div>
            {KIT_ELEMENTS.map((element) => (
              <div
                key={element.value}
                className="bg-surface text-text-body border border-border p-2 rounded-md flex flex-col"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 w-20 shrink-0">
                    <div
                      className="w-4 h-4 rounded-xs shrink-0"
                      style={{
                        background: element.color,
                        color: element.color,
                        border: `2px solid ${element.color}70`,
                        backgroundClip: 'padding-box',
                      }}
                    ></div>
                    <div className="font-semibold text-nowrap">
                      {element.displayName}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {midiMapping[element.value]?.map((note) => (
                      <div
                        className="font-semibold text-xs bg-surface-raised p-1 border-border-soft border rounded-md flex items-center gap-1"
                        key={note}
                      >
                        {note}
                        <button
                          className="text-accent border-0 cursor-pointer px-0.5 hover:text-accent-text focus-visible:outline-accent-hover focus-visible:outline-1 rounded-xs"
                          onClick={() => {
                            const prev =
                              midiMappingRef.current[element.value] ?? [];

                            setMidiMapping({
                              ...midiMappingRef.current,
                              [element.value]: prev.filter((n) => n !== note),
                            });
                          }}
                        >
                          <FontAwesomeIcon icon={faXmark} size="xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {element.value === listeningTo ? (
                    <Button
                      className="ml-auto animate-pulse"
                      type="primary"
                      onClick={() => {
                        setListeningTo(undefined);
                      }}
                    >
                      Listening
                    </Button>
                  ) : (
                    <Button
                      icon={<FontAwesomeIcon icon={faPlus} />}
                      className="ml-auto"
                      type="default"
                      onClick={() => {
                        setListeningTo(element.value);
                      }}
                    >
                      Learn
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Divider />
        <div
          className="text-text-body font-semibold text-xl p-4 rounded-b-xl flex"
          style={{ background: 'var(--gradient-header-reverse)' }}
        >
          <Button className="ml-auto" type="primary" onClick={() => onClose()}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
