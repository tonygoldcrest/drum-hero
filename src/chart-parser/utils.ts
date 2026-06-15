import { noteTypes, noteFlags } from 'scan-chart';

export function noteToKey(
  type: number,
  flags: number,
  isFiveLane: boolean,
): string | null {
  switch (type) {
    case noteTypes.kick:
      return flags & noteFlags.doubleKick ? 'e/4' : 'f/4';
    case noteTypes.redDrum:
      return 'c/5';
    case noteTypes.yellowDrum:
      if (isFiveLane) {
        return 'g/5/x2';
      }
      return flags & noteFlags.cymbal ? 'g/5/x2' : 'e/5';
    case noteTypes.blueDrum:
      if (isFiveLane) {
        return 'd/5';
      }
      return flags & noteFlags.cymbal ? 'f/5/x2' : 'd/5';
    case noteTypes.greenDrum:
      if (isFiveLane) {
        return 'a/5/x2';
      }
      return flags & noteFlags.cymbal ? 'a/5/x2' : 'a/4';
    default:
      return null;
  }
}
