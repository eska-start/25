import { useGame, TEAM_LABEL, TEAM_COLORS } from '../store';
import { CHARACTERS } from '../data/items';
import { CharacterFace } from './CharacterFace';
import { GameIcon } from './GameIcon';
import { sfx } from '../game/audio';

export function ResultScreen() {
  const results = useGame((s) => s.results), image = useGame((s) => s.resultMap);
  const winner = results[0], me = results.find((r) => r.id === 'player');
  const tied = results.filter((r) => r.rank === 1).length > 1;
  const teamMode = results.some((r) => r.team !== undefined);
  // 팀전: 같은 팀 두 명의 영역은 하나의 값이므로 팀당 한 번만 더한다
  const teamPaint = [0, 1].map((t) => results.find((r) => r.team === t)?.paint ?? 0);
  const myTeam = me?.team ?? 0;
  const teamTied = teamMode && Math.abs(teamPaint[0] - teamPaint[1]) < 0.00001;
  const winTeam = teamPaint[0] >= teamPaint[1] ? 0 : 1;
  const neutral = Math.max(0, 1 - (teamMode ? teamPaint[0] + teamPaint[1] : results.reduce((sum, r) => sum + r.paint, 0)));
  const winnerCharacter = CHARACTERS.find((c) => c.id === winner?.characterId) ?? CHARACTERS[0];
  return <main className="jr-results" style={{ '--winner-color': winner?.color ?? '#f56a87' } as React.CSSProperties}>
    <header><span className="jr-eyebrow">90 SECONDS. EVERY COLOR COUNTS.</span><h1>{teamMode ? (teamTied ? '팀 대결 무승부!' : winTeam === myTeam ? '우리 팀 승리!' : '아쉽게 패배했어요.') : tied ? '함께 물들인 승리!' : me?.rank === 1 ? '이 구역의 컬러왕!' : '멋진 색을 남겼어요.'}</h1><p>결승선 대신, 내 색으로 넓힌 세상.</p></header>
    <div className="jr-results-layout">
      <section className="jr-results-map-section"><div className="jr-winner"><span className="jr-winner-face"><CharacterFace species={winnerCharacter.species} size={86} /></span><div><small>{teamMode ? (teamTied ? 'DRAW' : 'WINNING TEAM') : tied ? 'JOINT WINNER' : 'WINNER'}</small><h2>{teamMode ? (teamTied ? 'A팀 = B팀' : `${TEAM_LABEL[winTeam]} · ${results.filter((r) => r.team === winTeam).map((r) => r.name).join(' + ')}`) : winner?.name}</h2><strong>{((teamMode ? Math.max(teamPaint[0], teamPaint[1]) : winner?.paint ?? 0) * 100).toFixed(2)}<span>%</span></strong></div><GameIcon name="trophy" size={45} /></div>
        {image && <img className="jr-final-map" src={image} alt="90초 종료 시점의 실제 페인트 영역 지도" />}
        <div className="jr-map-legend">{teamMode ? [0, 1].map((t) => <span key={t}><i style={{ background: TEAM_COLORS[t] }} />{TEAM_LABEL[t]} {(teamPaint[t] * 100).toFixed(1)}%</span>) : results.map((r) => <span key={r.id}><i style={{ background: r.color }} />{r.name}</span>)}<span><i className="neutral" />미도색 {(neutral * 100).toFixed(1)}%</span></div>
      </section>
      <section className="jr-result-table"><div className="jr-result-table-head"><span>최종 영역 순위</span><span>PAINT COVERAGE</span></div>
        {results.map((r) => {
          const ch = CHARACTERS.find((c) => c.id === r.characterId) ?? CHARACTERS[0];
          return <div key={r.id} className={`jr-result-row ${r.id === 'player' ? 'me' : ''}`}>
            <div className="jr-result-player"><strong>{String(r.rank).padStart(2, '0')}</strong><CharacterFace species={ch.species} size={42} /><div><h3><i style={{ background: r.color }} />{r.name}</h3><small>{teamMode && r.team !== undefined ? `${TEAM_LABEL[r.team]} · ` : ''}{ch.name}{r.id === 'player' ? ' · 내 레이서' : ''}</small></div><b style={{ color: r.color }}>{(r.paint * 100).toFixed(2)}<small>%</small></b></div>
            <div className="jr-result-bar"><i style={{ width: `${r.paint * 100}%`, background: r.color }} /></div>
            <div className="jr-result-details"><span>최종 영역 <strong>{r.area.toFixed(1)} m²</strong></span><span>덮어쓴 면적 <strong>{r.overpaint.toFixed(1)} m²</strong></span><span>부스트 <strong>{r.boosts}회</strong></span><span>점프 <strong>{r.jumps ?? 0}회</strong></span><span>아이템 <strong>{r.itemsUsed}회</strong></span></div>
          </div>;
        })}
        <p className="jr-footnote">장애물과 맵 바깥을 제외한 칠할 수 있는 바닥 면적으로 계산합니다. 같은 영역은 중복 가산하지 않습니다. 덮어쓴 면적은 배틀 동안의 누적량이며 승패에는 최종 보유 면적만 반영합니다.</p>
      </section>
    </div>
    <footer><button className="jr-secondary" onClick={() => { sfx.click(); useGame.getState().resetToSelect(); }}><GameIcon name="back" />메인 메뉴</button><button className="jr-primary" onClick={() => { sfx.click(); useGame.getState().resetToSelect(); useGame.getState().startCollect(); }}>한 번 더 물들이기<GameIcon name="arrow" /></button></footer>
  </main>;
}