import { useMemo, useState } from 'react';
import { useGame, itemsMap, SLOT_LABEL, SLOT_CATEGORY, type Slot } from '../store';
import { ITEMS, GRADE_LABEL, GRADE_COLOR } from '../data/items';
import { computeSpec } from '../game/vehicle';
import { sfx } from '../game/audio';
import { AssemblyStage } from '../three/AssemblyStage';
import { GameIcon } from './GameIcon';
import { PartPreview } from './PartPreview';

export function BuildScreen() {
  const inventory = useGame((s) => s.inventory), build = useGame((s) => s.build), color = useGame((s) => s.paintColor);
  const characterId = useGame((s) => s.characterId), equip = useGame((s) => s.equip), setWheel = useGame((s) => s.setWheel);
  const [ready, setReady] = useState(false), [tab, setTab] = useState<'wheel' | Slot>('wheel');
  const items = useMemo(() => itemsMap(inventory), [inventory]);
  const spec = useMemo(() => computeSpec(build, items, characterId), [build, items, characterId]);
  const wheelCount = build.wheels.filter((w) => w !== null).length;
  const category = tab === 'wheel' ? 'wheel' : SLOT_CATEGORY[tab];
  const available = inventory.filter((i) => ITEMS[i.itemId]?.cat === category);
  const toggleWheel = (uid: number) => {
    const selected = build.wheels.indexOf(uid), empty = build.wheels.indexOf(null);
    setWheel(selected >= 0 ? selected : empty < 0 ? 3 : empty, selected >= 0 ? null : uid);
  };
  const onFoot = spec.onFoot;
  const brushItem = build.slots.brush !== undefined ? ITEMS[items[build.slots.brush]] : null;
  const status = onFoot
    ? '바퀴가 없으면 가장 느린 맨몸 달리기. 모은 고물을 들고 뛰어요.'
    : build.slots.body === undefined
      ? '차체는 없지만, 바퀴와 프레임으로 달려요.'
      : `${wheelCount}개의 바퀴 · 부품 ${spec.partCount}개 · 등급 보너스 +${spec.gradeBonus.toFixed(1)}`;
  const speedKmh = Math.round(spec.maxSpeed * 6);
  const brushCount = inventory.filter((i) => ITEMS[i.itemId]?.cat === 'brush').length;

  return <main className="jr-build-screen">
    <section className="jr-assembly-view">
      <AssemblyStage inventory={inventory} build={build} characterId={characterId} color={color} onReady={() => setReady(true)} />
      <header className="jr-build-view-label"><span className="jr-eyebrow">02 / BUILD YOUR RIDE</span><h2>{ready ? '내가 모은 고물, 내 자동차.' : '주운 부품이 자동차가 됩니다.'}</h2></header>
      <div className="jr-build-specs"><span>{status}</span><div>
        {[
          ['최고속도', spec.maxSpeed / 32, `${speedKmh}km/h`],
          ['가속', spec.accel / 22, ''],
          ['안정성', onFoot ? 0.45 : spec.grip / 1.4, ''],
          ['페인트 폭', spec.paintWidth / 2.3, brushItem ? brushItem.name : '붓 없음'],
        ].map(([label, value, note]) => <label key={String(label)}>{label}{note ? <em>{note}</em> : null}<i><b style={{ width: `${Math.min(1, Number(value)) * 100}%`, background: label === '페인트 폭' ? color : undefined }} /></i></label>)}
      </div></div>
    </section>
    <aside className="jr-build-panel">
      <header><span className="jr-eyebrow">THE LITTLE GARAGE</span><h1>조립소<span>{inventory.length}개 수집</span></h1><p className="jr-muted">모은 부품 중 원하는 것만 장착하세요. 많이, 높은 등급으로 달수록 빨라집니다.</p></header>
      <div className="jr-tabs"><button className={tab === 'wheel' ? 'active' : ''} onClick={() => setTab('wheel')}>바퀴 {wheelCount}/4</button>{(Object.keys(SLOT_LABEL) as Slot[]).map((s) => <button className={`${tab === s ? 'active' : ''} ${s === 'brush' ? 'brush-tab' : ''}`} key={s} onClick={() => setTab(s)}>{s === 'brush' ? `붓 ${brushCount > 0 ? `(${brushCount})` : ''}` : SLOT_LABEL[s]}</button>)}</div>
      <div className="jr-build-scroll">
        {tab === 'brush' && <div className="jr-brush-hint"><GameIcon name="paint" size={17} /><div><strong>붓은 차량 뒤에 바닥을 향해 달립니다.</strong><p>넓고 등급 높은 붓일수록 지나간 자리에 더 넓게 페인트가 남아요. 붓이 없으면 바퀴 자국 정도만 칠해집니다.</p></div></div>}
        {tab === 'wheel' ? <div className="jr-wheel-mounts">{build.wheels.map((uid, i) => <button key={i} className={uid !== null ? 'filled' : ''} disabled={!ready || uid === null} onClick={() => setWheel(i, null)}>
          <small>{['앞 왼쪽', '앞 오른쪽', '뒤 왼쪽', '뒤 오른쪽'][i]}</small>{uid !== null ? <PartPreview itemId={items[uid]} className="jr-model-preview-wheel" /> : <GameIcon name="wheel" />}<span>{uid !== null ? ITEMS[items[uid]]?.name : '비어 있음'}</span>
        </button>)}</div> : <div className="jr-mounted-part"><span>현재 장착</span><strong>{build.slots[tab] !== undefined ? ITEMS[items[build.slots[tab]!]]?.name : '없음'}</strong>
          {build.slots[tab] !== undefined && <button onClick={() => equip(tab, null)} disabled={!ready}>해제</button>}
        </div>}
        <div className="jr-build-options">{available.map((item) => {
          const def = ITEMS[item.itemId];
          const selected = tab === 'wheel' ? build.wheels.includes(item.uid) : build.slots[tab] === item.uid;
          return <button key={item.uid} disabled={!ready} className={selected ? 'selected' : ''} onClick={() => { sfx.click(); if (tab === 'wheel') toggleWheel(item.uid); else equip(tab, selected ? null : item.uid); }}>
            <PartPreview itemId={item.itemId} />
            <span><strong>{def.name} <em className="jr-grade" style={{ color: GRADE_COLOR[def.grade] }}>{GRADE_LABEL[def.grade]}</em></strong><small>{def.desc}{def.paintWidth ? ` · 폭 ×${def.paintWidth.toFixed(2)}` : ''}</small></span><i>{selected ? '장착됨' : '장착'}</i>
          </button>;
        })}</div>
        {!available.length && <div className="jr-empty-parts"><GameIcon name={tab === 'brush' ? 'paint' : 'parts'} size={35} /><strong>{tab === 'brush' ? '붓을 줍지 못했어요.' : '이 종류의 부품은 아직 없어요.'}</strong><p>{tab === 'brush' ? '붓이 없으면 아주 좁게만 칠해져요.' : '없는 부품은 자동으로 생성하지 않습니다.'}<br />다음 판에 다시 찾아보세요.</p></div>}
      </div>
      <footer><p><GameIcon name="paint" size={16} />결승선은 없어요. 가장 넓게 칠하면 승리!</p>
        <button className="jr-primary full" disabled={!ready} onClick={() => { sfx.click(); useGame.getState().startBattle(); }}><span>{ready ? '페인트 배틀 시작' : '부품 조립 중...'}</span><small>90 SEC</small><GameIcon name="arrow" /></button>
      </footer>
    </aside>
  </main>;
}
