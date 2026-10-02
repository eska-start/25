import { Component, type ReactNode } from 'react';
import { useGame } from '../store';
import { GameIcon } from './GameIcon';

export function Unsupported3D() {
  return <div className="jr-error-screen"><GameIcon name="parts" size={46} /><h2>작은 차고를 불러오지 못했어요.</h2><p>이 게임에는 WebGL 2를 지원하는 브라우저가 필요합니다.<br />브라우저의 하드웨어 가속을 켜고 다시 시도해 주세요.</p><button className="jr-secondary" onClick={() => useGame.getState().resetToSelect()}>메인 메뉴</button></div>;
}
export class GameBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Junk Racers rendering error:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="jr-error-screen"><GameIcon name="parts" size={46} /><h2>잠깐, 정비가 필요해요.</h2><p>3D 화면을 불러오는 중 문제가 발생했습니다.</p><button className="jr-primary" onClick={() => window.location.reload()}>게임 다시 불러오기</button></div>;
  }
}