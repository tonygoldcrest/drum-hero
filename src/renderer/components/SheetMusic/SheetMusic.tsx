import { createRef, useEffect, useMemo, useRef, useState } from 'react';
import { parseChartFile } from 'scan-chart';

import { ChartParser } from '../../../chart-parser/parser';
import { renderMusic } from '../../../chart-parser/renderer';
import { Difficulty, RenderData } from '../../../chart-parser/types';
import {
  getCursorX,
  getNoteSvg,
  secondsToTicks,
  ticksToSeconds,
} from './utils';
import {
  ActiveNoteInfo,
  useActiveNoteScale,
  useProgressColoring,
} from './hooks';
import { cn } from '../../cn';
import { PlayheadStyle } from '../../types';

const VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_cursor;
uniform vec2 u_res;
uniform float u_radius;
out vec4 color;
void main() {
  vec2 uv = v_uv;
  if (u_radius > 0.0) {
    vec2 d = uv * u_res - u_cursor;
    float dist = length(d);
    if (dist < u_radius && dist > 0.0) {
      float t = (1.0 - dist / u_radius) * (1.0 - dist / u_radius);
      uv -= (d / u_res) * t * 0.25;
    }
  }
  color = texture(u_tex, uv);
}`;

interface GLState {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  uCursor: WebGLUniformLocation;
  uRes: WebGLUniformLocation;
  uRadius: WebGLUniformLocation;
}

export interface SheetMusicProps {
  fileData?: Buffer;
  format?: 'mid' | 'chart';
  showBarNumbers: boolean;
  enableColors: boolean;
  progressColoring: boolean;
  currentTime: number;
  onSelectMeasure: (time: number) => void;
  difficulty: Difficulty;
  isFiveLane: boolean;
  playheadStyle: PlayheadStyle;
}

export function SheetMusic({
  fileData,
  format = 'mid',
  showBarNumbers,
  enableColors,
  progressColoring,
  currentTime,
  onSelectMeasure,
  difficulty,
  playheadStyle,
  isFiveLane,
}: SheetMusicProps) {
  const vexflowContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GLState | null>(null);
  const [renderData, setRenderData] = useState<RenderData[]>([]);
  const [highlightedMeasureIndex, setHighlightedMeasureIndex] =
    useState<number>(-1);

  const chart = useMemo(
    () => (fileData ? parseChartFile(new Uint8Array(fileData), format) : null),
    [fileData, format],
  );

  const parsedMidi = useMemo(
    () => (chart ? new ChartParser(chart, isFiveLane, difficulty) : null),
    [chart, isFiveLane, difficulty],
  );

  const currentTick = useMemo(
    () =>
      chart
        ? secondsToTicks(currentTime, chart.resolution, chart.tempos)
        : null,
    [currentTime, chart],
  );

  const highlightsRef = useMemo(
    () => renderData.map(() => createRef<HTMLButtonElement>()),
    [renderData],
  );

  useEffect(() => {
    if (!vexflowContainerRef.current || !parsedMidi) {
      return;
    }

    if (vexflowContainerRef.current.children.length > 0) {
      vexflowContainerRef.current.removeChild(
        vexflowContainerRef.current.children[0],
      );
    }

    setRenderData(
      renderMusic(
        vexflowContainerRef,
        parsedMidi,
        showBarNumbers,
        enableColors,
      ),
    );
  }, [parsedMidi, showBarNumbers, enableColors]);

  useEffect(() => {
    if (currentTick === null) {
      return;
    }

    const index = renderData.findIndex(
      ({ measure }) =>
        currentTick >= measure.startTick && currentTick < measure.endTick,
    );

    if (index >= 0) {
      setHighlightedMeasureIndex(index);
    }
  }, [currentTick, renderData]);

  useEffect(() => {
    if (playheadStyle === 'None' || highlightedMeasureIndex < 0) {
      return;
    }

    highlightsRef[highlightedMeasureIndex]?.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightsRef, highlightedMeasureIndex, playheadStyle]);

  const activeNoteInfo = useMemo<ActiveNoteInfo | null>(() => {
    if (
      playheadStyle === 'None' ||
      currentTick === null ||
      highlightedMeasureIndex < 0
    ) {
      return null;
    }

    const measureData = renderData[highlightedMeasureIndex];

    if (!measureData) {
      return null;
    }

    const { renderedNotes } = measureData;

    let noteIdx = -1;
    for (let i = 0; i < renderedNotes.length; i++) {
      if (renderedNotes[i].tick <= currentTick) {
        noteIdx = i;
      } else {
        break;
      }
    }

    if (noteIdx === -1) {
      return null;
    }

    const noteSvgs = getNoteSvg(renderedNotes[noteIdx].note);

    if (noteSvgs.length === 0) {
      return null;
    }

    return {
      key: `${highlightedMeasureIndex}-${noteIdx}`,
      noteHeadEls: noteSvgs,
      noteIdx,
      measureIdx: highlightedMeasureIndex,
      renderedNotes,
    };
  }, [playheadStyle, currentTick, renderData, highlightedMeasureIndex]);

  // useActiveNoteScale(activeNoteInfo, renderData);
  useProgressColoring(
    activeNoteInfo,
    playheadStyle,
    renderData,
    progressColoring,
  );

  const cursorPosition = useMemo(() => {
    if (playheadStyle !== 'Cursor' || !chart || highlightedMeasureIndex < 0) {
      return null;
    }

    const measureData = renderData[highlightedMeasureIndex];

    if (!measureData) {
      return null;
    }

    const { stave } = measureData;
    const x = getCursorX(currentTime, chart, measureData);

    return {
      left: x,
      top: stave.getY(),
      height: stave.getHeight() + 30,
    };
  }, [playheadStyle, chart, currentTime, renderData, highlightedMeasureIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    if (!gl) {
      return;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    glRef.current = {
      gl,
      program,
      texture,
      uCursor: gl.getUniformLocation(program, 'u_cursor')!,
      uRes: gl.getUniformLocation(program, 'u_res')!,
      uRadius: gl.getUniformLocation(program, 'u_radius')!,
    };

    return () => {
      gl.deleteProgram(program);
      gl.deleteTexture(texture);
      glRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const div = vexflowContainerRef.current;
    if (!canvas || !div) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      const state = glRef.current;
      if (!state) {
        return;
      }
      const { gl, program, texture, uCursor, uRes, uRadius } = state;

      const dpr = window.devicePixelRatio || 1;
      const svg = div.querySelector('svg');
      if (svg) {
        const w = parseInt(svg.getAttribute('width') ?? '0');
        const h = parseInt(svg.getAttribute('height') ?? '0');
        if (w && h) {
          const pw = Math.round(w * dpr);
          const ph = Math.round(h * dpr);
          if (canvas.width !== pw || canvas.height !== ph) {
            canvas.width = pw;
            canvas.height = ph;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            gl.viewport(0, 0, pw, ph);
          }
        }
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gl as any).texElementImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        div,
      );

      gl.useProgram(program);
      gl.uniform2f(uRes, canvas.width, canvas.height);

      if (cursorPosition) {
        gl.uniform2f(
          uCursor,
          cursorPosition.left * dpr,
          (cursorPosition.top + cursorPosition.height / 2) * dpr,
        );
        gl.uniform1f(uRadius, 70 * dpr);
      } else {
        gl.uniform1f(uRadius, 0.0);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    return () => cancelAnimationFrame(rafId);
  }, [renderData, cursorPosition]);

  const measureHighlights = renderData.map(({ measure, stave }, index) => {
    const highlighted =
      playheadStyle === 'Measure' && index === highlightedMeasureIndex;
    return (
      <button
        key={index}
        ref={highlightsRef[index]}
        style={{
          top: stave.getY(),
          left: stave.getX() - 5,
          width: stave.getWidth() + 10,
          height: stave.getHeight() + 30,
        }}
        className={cn(
          'absolute z-[-3] rounded-[11px] border-0 bg-transparent cursor-pointer hover:bg-accent-soft-bg hover:shadow-accent-soft hover:border hover:border-accent-soft-border hover:z-[-1]',
          highlighted && 'bg-accent-soft-bg border-2 border-accent',
        )}
        onClick={() => {
          if (!chart) {
            return;
          }

          onSelectMeasure(
            ticksToSeconds(measure.startTick, chart.resolution, chart.tempos),
          );
        }}
      />
    );
  });

  return (
    <div className="min-w-max relative z-0">
      <canvas
        ref={canvasRef}
        className="min-w-max pointer-events-none"
        {...({ layoutsubtree: 'true' } as Record<string, unknown>)}
      >
        <div
          ref={vexflowContainerRef}
          className="min-w-max pointer-events-none **:pointer-events-none"
        />
      </canvas>
      {measureHighlights}
      {cursorPosition && (
        <div
          className="absolute z-1 -translate-x-1/2 pointer-events-none shadow-accent-button"
          style={{
            left: cursorPosition.left,
            top: cursorPosition.top,
            height: cursorPosition.height,
          }}
        >
          <div
            className="absolute w-3 h-3 bg-accent left-1/2 rounded-[3px]"
            style={{ transform: 'translateX(-50%) rotate(45deg)' }}
          />
          <div className="absolute w-1 bg-accent h-full rounded-[3px] left-1/2 -translate-x-1/2" />
        </div>
      )}
    </div>
  );
}
