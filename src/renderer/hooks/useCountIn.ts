import { useCallback, useEffect, useRef, useState } from 'react';

interface CountInOptions {
  beats: number;
  beatMs: number;
  onComplete: () => void;
}

interface CountInResult {
  count: number | undefined;
  beatMs: number | undefined;
  isCounting: boolean;
  start: (options: CountInOptions) => void;
  cancel: () => void;
}

interface CountState {
  beat: number;
  beatMs: number;
  runId: number;
}

export function useCountIn(): CountInResult {
  const [state, setState] = useState<CountState | undefined>(undefined);
  const optionsRef = useRef<CountInOptions | undefined>(undefined);
  const runIdRef = useRef(0);
  const start = useCallback((options: CountInOptions) => {
    optionsRef.current = options;
    runIdRef.current += 1;
    setState({ beat: 1, beatMs: options.beatMs, runId: runIdRef.current });
  }, []);
  const cancel = useCallback(() => {
    optionsRef.current = undefined;
    setState(undefined);
  }, []);

  useEffect(() => {
    const options = optionsRef.current;

    if (state === undefined || options === undefined) {
      return undefined;
    }

    const id = setTimeout(() => {
      if (state.beat >= options.beats) {
        optionsRef.current = undefined;
        setState(undefined);
        options.onComplete();

        return;
      }

      setState({
        beat: state.beat + 1,
        beatMs: state.beatMs,
        runId: state.runId,
      });
    }, options.beatMs);

    return () => clearTimeout(id);
  }, [state]);

  return {
    count: state?.beat,
    beatMs: state?.beatMs,
    isCounting: state !== undefined,
    start,
    cancel,
  };
}
