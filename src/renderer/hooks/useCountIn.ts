import { useCallback, useEffect, useRef, useState } from 'react';

interface CountInOptions {
  beats: number;
  beatMs: number;
  onComplete: () => void;
}

interface CountInResult {
  count: number | undefined;
  isCounting: boolean;
  start: (options: CountInOptions) => void;
  cancel: () => void;
}

interface CountState {
  beat: number;
  runId: number;
}

export function useCountIn(): CountInResult {
  const [state, setState] = useState<CountState | undefined>(undefined);
  const optionsRef = useRef<CountInOptions | undefined>(undefined);
  const runIdRef = useRef(0);
  const start = useCallback((options: CountInOptions) => {
    optionsRef.current = options;
    runIdRef.current += 1;
    setState({ beat: 1, runId: runIdRef.current });
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

      setState({ beat: state.beat + 1, runId: state.runId });
    }, options.beatMs);

    return () => clearTimeout(id);
  }, [state]);

  return { count: state?.beat, isCounting: state !== undefined, start, cancel };
}
