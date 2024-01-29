import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

import './App.css';
import { MidiJSON } from '@tonejs/midi';
import MidiRenderer from './MidiRenderer';
import { Channels } from '../main/preload';

function Hello() {
  const [isLoaded, setIsLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const [midiData, setMidiData] = useState<MidiJSON>();

  const loadSong = (type: Channels) => {
    window.electron.ipcRenderer.on(type, (arg) => {
      setMidiData(arg);

      setIsLoaded(true);
    });
    window.electron.ipcRenderer.sendMessage(type, ['ping']);
  };
  useEffect(() => {
    loadSong('load-default');
  }, []);

  useEffect(() => {
    if (!divRef.current || !isLoaded || !midiData) {
      return;
    }

    new MidiRenderer(midiData, divRef).render();
  }, [isLoaded, midiData]);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          loadSong('load');
        }}
      >
        Load song
      </button>
      <div ref={divRef} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
