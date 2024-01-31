import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

import './App.css';
import { MidiJSON } from '@tonejs/midi';
import { renderMusic } from './MidiRenderer';
import { Channels } from '../main/preload';
import { Song } from '../midi-parser/song';

function Hello() {
  const [isLoaded, setIsLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const [midiData, setMidiData] = useState<MidiJSON>();

  const loadSong = (type: Channels) => {
    if (midiData && divRef.current) {
      divRef.current.removeChild(divRef.current.children[0]);
    }

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

    renderMusic(divRef, new Song(midiData));
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
