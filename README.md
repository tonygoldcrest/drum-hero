# <img width="64" height="64" alt="DrumHero Logo Github" src="https://github.com/user-attachments/assets/6c4eb448-d413-465d-8e14-1ed1b1d6e102" /> Drum Hero

Play your favourite Clone Hero tracks on drums, assisted by sheet music.

[DOWNLOAD](https://github.com/peancored/drum-hero/releases)

## Why?

Finding drumless tracks with sheet music is a pain. Clone Hero is a Guitar Hero-style rhythm game with a massive community song library. Each song comes with note charts for each instrument and, often, separated audio stems. Drum Hero takes the drum charts from those songs (which are essentially MIDI hit data) and renders them as sheet music you can play along to, while letting you mute the drum stem so you're playing instead of listening.

The charts aren't always 100% accurate, but they're usually close enough. I made this to help myself move beyond just playing Clone Hero toward, learning to sightread.

## Workflow

### 1. Select your Clone Hero Library directory
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/6d5529a5-1b78-4519-9f54-1f6fb9dc5979" />

If you don't have one, you can download songs directly from within the app (see step 2), or grab them manually from [Enchor](https://www.enchor.us/), filter by Any Instrument > Drums, then download in zip format and unpack.

### 2. Search for a song you want to play

<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/884d0730-ca84-42cc-a35b-5622793b35ae" />

* If you picked the wrong Clone Hero directory, press the green floating button to browse again.
* You can favorite a song by pressing the like button.

<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/c5913505-0354-45d3-a0fd-292d2ca07fe1" />
Press the globe icon to switch to online search and download songs directly from [Enchor](https://www.enchor.us/). You must have a library folder selected first, downloaded songs are saved there.

### 3. Press play and jam along
<img width="1541" height="939" alt="image" src="https://github.com/user-attachments/assets/60512f29-2b0c-433f-9a25-459af5bff090" />

* If the song has stems, use the mixer to adjust levels (e.g. mute drums to make the song drumless).
* Three playhead modes are available in Settings: Cursor (follows playback and highlights current notes), Measure (highlights just the current measure), and None.
* Notes that have already played are dimmed.
* Click a measure to skip to it.
* You can switch difficulty in the side menu if expert is too fast.
* Notes are highlighted with Clone Hero colors by default, but you can turn that off in the Settings.

### 4. Split stems for songs that don't have them

Many Clone Hero songs ship with a single mixed audio file instead of separate stems. Drum Hero can split it automatically so you can mute the drums and play along.

* In the Settings menu, press **Get stem splitter** to download the tool (~130 MB, one-time). Supported on macOS (Apple Silicon) and Windows.
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/486f15d9-b735-464f-a94f-7cf1dddbafbe" />
* Once downloaded, open the **⋮** menu on any song with a single audio track and choose **Split stems**.
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/8f777d1b-59ba-466f-b5ea-2786cbb0235e" />
* A progress bar appears in the header while splitting. You can cancel at any time.
<img width="1478" height="880" alt="image" src="https://github.com/user-attachments/assets/c0b097b4-4f85-48ac-8f5d-4ba70b3f9425" />
* When done, the song is updated in place. Open it and you'll find the drums and backing track available in the mixer.

## Roadmap

- [ ] Practice mode - selecting measures makes the song loop within them

## Acknowledgements

* TheNathannator for the [GH/RB specification](https://github.com/TheNathannator/GuitarGame_ChartFormats)
