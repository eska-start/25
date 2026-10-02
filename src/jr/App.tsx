import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGame } from './store';
import { bindKeyboard, configureInput } from './game/input';
import { bindAudioUnlock, sfx } from './game/audio';
import { canvasProps, Effects } from './three/Stage';
import { ScrambleWorld } from './three/ScrambleWorld';
import { BattleWorld } from './three/BattleWorld';
import { BuildScreen, CollectHUD, BattleHUD, ResultScreen, SelectScreen } from './ui/Screens';
import { GameIcon } from './ui/GameIcon';
import { GameBoundary, Unsupported3D } from './ui/GameBoundary';
import { useOnlineHeartbeat } from './ui/Lobby';

function GameCanvas({ children, bg, fog }: { children: React.ReactNode; bg: string; fog: [number, number] }) {
  return (
    <div className="scene">
      <Canvas {...canvasProps} fallback={<Unsupported3D />} camera={{ position: [0, 16, 16], fov: 58, near: 0.3, far: 280 }}>
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, fog[0], fog[1]]} />
        <Suspense fallback={null}>
          {children}
          <Effects />
        </Suspense>
      </Canvas>
    </div>
  );
}

function MuteButton() {
  const [muted, setMuted] = useState(sfx.muted);
  useEffect(() => {
    const changed = () => setMuted(sfx.muted);
    window.addEventListener('junk-racers-sound', changed);
    return () => window.removeEventListener('junk-racers-sound', changed);
  }, []);
  return (
    <button
      className="mute-btn"
      onClick={() => {
        sfx.init();
        setMuted(sfx.toggleMute());
      }}
      aria-label={muted ? '사운드 켜기' : '사운드 끄기'}
    >
      <GameIcon name={muted ? 'mute' : 'sound'} size={18} />
    </button>
  );
}

export default function App() {
  const phase = useGame((s) => s.phase);
  const round = useGame((s) => s.round);
  const localCount = useGame((s) => s.localPlayers.length);

  useOnlineHeartbeat();
  useEffect(() => {
    bindKeyboard();
    bindAudioUnlock();
  }, []);

  useEffect(() => {
    configureInput(1 + localCount, phase === 'collect' || phase === 'battle');
  }, [phase, localCount]);

  useEffect(() => {
    const m = phase === 'select' ? 'menu' : phase === 'collect' ? 'arena' : phase === 'build' ? 'build' : phase === 'battle' ? 'battle' : 'result';
    sfx.setMusic(m);
    const timer = phase === 'result' ? setTimeout(() => sfx.fanfare(), 300) : undefined;
    return () => clearTimeout(timer);
  }, [phase]);

  let content: React.ReactNode;
  if (phase === 'select') content = <SelectScreen />;
  else if (phase === 'build') content = <BuildScreen />;
  else if (phase === 'result') content = <ResultScreen />;
  else
    content = (
      <div className="app">
        {phase === 'collect' && (
          <>
            <GameCanvas key={`collect-${round}`} bg="#c7dcea" fog={[46, 110]}>
              <ScrambleWorld />
            </GameCanvas>
            <CollectHUD />
          </>
        )}
        {phase === 'battle' && (
          <>
            <GameCanvas key={`battle-${round}`} bg="#b6cdbd" fog={[68, 145]}>
              <BattleWorld />
            </GameCanvas>
            <BattleHUD />
          </>
        )}
      </div>
    );

  return (
    <GameBoundary>
      {content}
      {phase === 'select' && <MuteButton />}
    </GameBoundary>
  );
}
