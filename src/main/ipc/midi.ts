export async function loadMidiDeviceList(event: Electron.IpcMainEvent) {
  event.reply('midi-device-list', {});
}
