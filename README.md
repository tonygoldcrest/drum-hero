# <img width="64" alt="image" src="https://github.com/peancored/drum-hero/assets/5630034/968da3e0-11e7-4e99-94e3-4aa8df19dc38"> Drum Hero

Play your favourite Clone Hero tracks on drums, assisted by sheet music.

[DOWNLOAD](https://github.com/peancored/drum-hero/releases)

## Mac Users

If you see this pop up, you need to remove the executable from quarantine. The app isn't signed, which would require paying for an Apple developer account.

<img width="180" alt="image" src="https://github.com/peancored/drum-hero/assets/5630034/6f454fb1-55e7-482a-abad-bce6c41b161e">

Open a terminal and run:

```
# Change the path if necessary
xattr -r -d com.apple.quarantine /Applications/DrumHero.app
```

## Why?

Finding drumless tracks with sheet music is a pain. Clone Hero is a Guitar Hero-style rhythm game with a massive community song library — each song comes with note charts for each instrument and, often, separated audio stems. Drum Hero takes the drum charts from those songs (which are essentially MIDI hit data) and renders them as sheet music you can play along to, while letting you mute the drum stem so you're playing instead of listening.

The charts aren't always 100% accurate, but they're usually close enough. I made this to help myself move beyond just playing Clone Hero toward something more serious — specifically, learning to sightread, and this is how I'm doing it.

## Workflow

### 1. Select your Clone Hero Library directory
If you don't have one, download songs from [Enchor](https://www.enchor.us/) — filter by Any Instrument > Drums, then download in zip format and unpack.

### 2. Search for a song you want to play
<img width="2606" height="1550" alt="image" src="https://github.com/user-attachments/assets/0823e543-0bbb-4491-b66e-28632d29a2b0" />

* If you picked the wrong Clone Hero directory, press the green floating button to browse again.
* You can favorite a song by pressing the like button so it always appears at the top.

### 3. Press play and jam along
<img width="1541" height="939" alt="image" src="https://github.com/user-attachments/assets/60512f29-2b0c-433f-9a25-459af5bff090" />

* If the song has stems, use the mixer to adjust levels (e.g. mute drums to make the song drumless).
* Three playhead modes are available in Settings: Cursor (follows playback and highlights current notes), Measure (highlights just the current measure), and None.
* Notes that have already played are dimmed.
* Click a measure to skip to it.
* You can switch difficulty in the side menu if expert is too fast.
* Notes are highlighted with Clone Hero colors by default, but you can turn that off in the Settings.

## Roadmap

- [ ] Practice mode - selecting measures makes the song loop within them

## Acknowledgements

* TheNathannator for the [GH/RB specification](https://github.com/TheNathannator/GuitarGame_ChartFormats)
