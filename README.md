# <img width="64" height="64" alt="SightKick Logo Github" src="https://github.com/user-attachments/assets/e7b4df52-573e-4ac1-af78-83c425ac0301" /> SightKick

A drum sightreading game with sheet music and thousands of songs.

[DOWNLOAD](https://github.com/tonygoldcrest/sightkick/releases)

## Requirements

* **macOS** or **Windows** (x64).
* Optional drum-track separation needs the stem splitter tool (~130 MB, one-time download from within the app; Apple Silicon and Windows only, see [step 4](#4-separate-the-drum-track-from-a-mixed-recording)).

## Why?

Finding drumless tracks with sheet music is a pain. SightKick solves both at once: it pulls from a large community library of MIDI-charted songs, renders the drum part as sheet music and lets you mute the recorded drums and hear your own drum sounds.

The charts aren't always 100% accurate, but they're usually close enough.

## Workflow

### 1. Set up your song library
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/6d5529a5-1b78-4519-9f54-1f6fb9dc5979" />

Point SightKick at a local folder of songs. If you don't have one yet, you can download songs directly from within the app (see [step 2](#2-search-for-a-song-you-want-to-play)), or grab them manually from [Enchor](https://www.enchor.us/) (filter by Any Instrument > Drums, download in zip format, and unpack into your folder).

### 2. Search for a song you want to play

<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/884d0730-ca84-42cc-a35b-5622793b35ae" />

* To change your library folder, go to Settings → Select folder.
* You can favorite a song by pressing the like button.

<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/c5913505-0354-45d3-a0fd-292d2ca07fe1" />
Press the globe icon to switch to online search and download songs directly from Enchor. You must have a library folder selected first; downloaded songs are saved there.

### 3. Press play and jam along
<img width="1541" height="939" alt="image" src="https://github.com/user-attachments/assets/60512f29-2b0c-433f-9a25-459af5bff090" />

* If the song has individual tracks, use the mixer to adjust levels (e.g. mute drums to play along). If it doesn't and has a single track, you can follow [step 4](#4-separate-the-drum-track-from-a-mixed-recording) to separate out the drum track.
* Three playhead modes are available in Settings: Cursor (follows playback and highlights current notes), Measure (highlights just the current measure), and None.
* Notes that have already played are dimmed.
* Click a measure to skip to it.
* If the song has multiple difficulties, you can switch between them in the side menu.
* Notes are color-coded by default; you can turn that off in Settings. Each color maps to a specific part of the kit:

  | Color | Drum | Cymbal |
  |---|---|---|
  | 🟠 Orange | Kick (bass drum) | - |
  | 🔴 Red | Snare | - |
  | 🟡 Yellow | High tom | Hi-hat |
  | 🔵 Blue | Mid tom | Ride |
  | 🟢 Green | Floor tom | Crash |

  Within each color, a filled notehead means a drum hit and an × notehead means a cymbal hit.

### 4. Separate the drum track from a mixed recording

Many songs ship with everything mixed into a single audio file. SightKick can split it automatically so you can mute the recorded drums and play along.

In the Settings menu, press **Get stem splitter** to download the tool (~130 MB, one-time). Supported on macOS (Apple Silicon) and Windows.
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/486f15d9-b735-464f-a94f-7cf1dddbafbe" />
Once downloaded, open the **⋮** menu on any song with a single audio track and choose **Split stems**.
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/8f777d1b-59ba-466f-b5ea-2786cbb0235e" />
A progress bar appears in the header while splitting. You can cancel at any time.
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/c0b097b4-4f85-48ac-8f5d-4ba70b3f9425" />
When done, the song is updated in place. Open it and you'll find the drums and backing track available in the mixer.

## For developers

SightKick is an Electron + React 19 desktop app. Drum charts are parsed from Clone Hero `.mid`/`.chart` files and rendered as sheet music with VexFlow; the UI uses Tailwind CSS v4 and Ant Design v6.

Requires [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/) v4 (Berry). This project uses `yarn` exclusively (don't use `npm`).

```bash
yarn install        # install dependencies
yarn start          # run in dev mode (Electron + hot reload)
yarn build          # compile main, preload, and renderer
yarn lint           # ESLint with --fix
yarn test           # Jest
yarn storybook      # component stories on :6006
yarn package        # build a macOS app (yarn package:win for Windows)
```

## Acknowledgements

* [Enchor](https://www.enchor.us/) for the song library
* TheNathannator for the [GH/RB specification](https://github.com/TheNathannator/GuitarGame_ChartFormats)

## License

[MIT](LICENSE) © Anton Korolkov
