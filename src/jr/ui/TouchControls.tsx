import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isTouchDevice, pressDash, pressItem, pressJump, setPedalMode, setTouchStick, setTouchBoost, setTouchFire } from '../game/input';
import { GameIcon, type IconName } from './GameIcon';

function HoldButton({ children, className, hold, label }: { children: ReactNode; className: string; hold: (pressed: boolean) => void; label: string }) {
  const [active, setActive] = useState(false);
  const stop = () => { hold(false); setActive(false); };
  useEffect(() => () => hold(false), [hold]);
  return <button aria-label={label} className={`${className} ${active ? 'pressed' : ''}`} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); hold(true); setActive(true); }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onContextMenu={(e) => e.preventDefault()}>{children}</button>;
}
export function TouchControls({ mode = 'move', boost = false, fire = false, dash = false, dashCd = 0, item, hint, disabled = false }: {
  mode?: 'move' | 'drive'; boost?: boolean; fire?: boolean; dash?: boolean; dashCd?: number;
  item?: IconName | null; hint?: string; disabled?: boolean;
}) {
  const [touch] = useState(isTouchDevice);
  const area = useRef<HTMLDivElement>(null), knob = useRef<HTMLDivElement>(null), pointer = useRef<number | null>(null);
  const drive = mode === 'drive';
  useEffect(() => {
    // The left stick drives both steering and throttle in every mobile phase.
    setPedalMode(false);
    return () => { setTouchBoost(false); setTouchFire(false); setTouchStick(0, 0, false); };
  }, [drive]);
  useEffect(() => {
    if (!touch || !area.current) return;
    const el = area.current;
    let ox = 0, oy = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer.current) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const R = el.clientWidth * 0.3, d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
      setTouchStick(dx / R, -dy / R, true);
    };
    const down = (e: PointerEvent) => {
      if (disabled || pointer.current !== null) return;
      e.preventDefault(); pointer.current = e.pointerId;
      const b = el.getBoundingClientRect(); ox = b.left + b.width / 2; oy = b.top + b.height / 2;
      el.setPointerCapture(e.pointerId); move(e);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointer.current) return;
      pointer.current = null; setTouchStick(0, 0, false);
      if (knob.current) knob.current.style.transform = 'translate(0, 0)';
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
      setTouchStick(0, 0, false);
    };
  }, [touch, drive, disabled]);
  if (!touch) return hint ? <div className="jr-key-hint">{hint}</div> : null;
  return <div className={`jr-touch-controls ${drive ? 'drive' : ''} ${disabled ? 'disabled' : ''}`}>
    <div ref={area} className={`jr-stick ${drive ? 'drive' : ''}`} role="group" aria-label={drive ? '전후좌우 주행 스틱' : '이동 스틱'}><div className="jr-stick-track" /><div ref={knob} className="jr-stick-knob"><GameIcon name={drive ? 'wheel' : 'parts'} size={23} /></div><span>{drive ? '↑ 가속  ↓ 제동  ← → 조향' : '이동'}</span></div>
    {dash && <button className="jr-dash-control" disabled={disabled || dashCd > 0} onPointerDown={(e) => { e.preventDefault(); pressDash(); }}><GameIcon name="boost" size={30} /><span>{dashCd > 0 ? dashCd.toFixed(1) : '돌진'}</span></button>}
    {drive && <div className="jr-touch-actions">
        {fire && <HoldButton className="jr-fire-control" hold={setTouchFire} label="발사"><GameIcon name="target" /><span>발사</span></HoldButton>}
        {boost && <HoldButton className="jr-boost-control" hold={setTouchBoost} label="부스트"><GameIcon name="boost" /><span>부스트</span></HoldButton>}
        <button className="jr-jump-control" disabled={disabled} aria-label="점프" onPointerDown={(e) => { e.preventDefault(); pressJump(); }}><GameIcon name="jump" /><span>점프</span></button>
        <button disabled={!item || disabled} aria-label="아이템 사용" onPointerDown={(e) => { e.preventDefault(); pressItem(); }}><GameIcon name={item ?? 'parts'} /><span>아이템</span></button>
      </div>}
  </div>;
}