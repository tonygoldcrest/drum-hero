export function format(time: number) {
  const hrs = ~~(time / 3600);
  const mins = ~~((time % 3600) / 60);
  const secs = ~~time % 60;

  let ret = '';
  if (hrs > 0) {
    ret += `${hrs}:${mins < 10 ? '0' : ''}`;
  }
  ret += `${String(mins).padStart(2, '0')}:${secs < 10 ? '0' : ''}`;
  ret += `${secs}`;
  return ret;
}
