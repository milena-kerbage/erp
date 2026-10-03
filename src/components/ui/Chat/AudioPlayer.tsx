"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import styled from "@emotion/styled";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { transientOptions } from "@/lib/emotion/transient";
import { formatDuration, getWaveform } from "@/lib/waveform";

type AudioPlayerProps = {
  src: string;
  /** Duração conhecida (segundos), mostrada antes de o áudio carregar. */
  duration?: number;
};

const BARS = 36;
const SPEEDS = [1, 1.5, 2] as const;

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 15rem;
`;

const PlayButton = styled.button`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.chat.audioAccent};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:active {
    transform: scale(0.94);
  }
`;

const Wave = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  gap: 2px;
  height: 1.75rem;
  cursor: pointer;
  touch-action: none;
`;

const Bar = styled("span", transientOptions)<{ $played: boolean }>`
  flex: 1;
  min-width: 2px;
  max-width: 3px;
  border-radius: 2px;
  background-color: ${({ theme, $played }) =>
    $played ? theme.colors.text.primary : theme.colors.border.strong};
  transition: background-color 80ms linear;
`;

const Side = styled.div`
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`;

const Time = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Speed = styled.button`
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme }) => theme.colors.interactive.pressed};
  font-size: 0.625rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

/** Mensagem de voz: play/pause, onda clicável (para pular), duração e velocidade. */
export function AudioPlayer({ src, duration: knownDuration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [peaks, setPeaks] = useState<number[]>(() => Array(BARS).fill(0.3));
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(knownDuration ?? 0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useEffect(() => {
    let active = true;
    void getWaveform(src, BARS).then((values) => active && setPeaks(values));
    return () => {
      active = false;
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const seek = (event: PointerEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrent(audio.currentTime);
  };

  const progress = duration ? current / duration : 0;

  return (
    <Root>
      <PlayButton type="button" aria-label={playing ? "Pausar áudio" : "Tocar áudio"} onClick={toggle}>
        {playing ? <PauseIcon size={16} weight="fill" /> : <PlayIcon size={16} weight="fill" />}
      </PlayButton>

      <Wave
        role="slider"
        tabIndex={0}
        aria-label="Posição do áudio"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        aria-valuetext={`${formatDuration(current)} de ${formatDuration(duration)}`}
        onPointerDown={seek}
        onKeyDown={(event) => {
          const audio = audioRef.current;
          if (!audio) return;
          if (event.key === "ArrowRight") audio.currentTime = Math.min(duration, audio.currentTime + 5);
          if (event.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            toggle();
          }
        }}
      >
        {peaks.map((peak, index) => (
          <Bar
            key={index}
            $played={index / peaks.length < progress}
            style={{ height: `${Math.round(peak * 100)}%` }}
          />
        ))}
      </Wave>

      <Side>
        <Time>{formatDuration(playing || current > 0 ? current : duration)}</Time>
        <Speed
          type="button"
          aria-label={`Velocidade ${speed}x`}
          onClick={() => {
            const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
            setSpeed(next);
            if (audioRef.current) audioRef.current.playbackRate = next;
          }}
        >
          {speed}x
        </Speed>
      </Side>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(event) => {
          setPlaying(false);
          event.currentTarget.currentTime = 0;
          setCurrent(0);
        }}
      />
    </Root>
  );
}
