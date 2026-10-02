# 고물 레이서즈 (Junk Racers) — Next.js + PostgreSQL

15초 동안 고물을 모아 자동차를 조립하고, 90초 페인트 배틀에서 가장 넓은 영역을 차지하는 3D 게임.
**개인전 / 2:2 팀전**, 로컬 멀티, 온라인 대기실(방 코드·초대 링크)을 지원합니다.

## 배포

필요한 것은 **Node.js 20+** 와 **PostgreSQL** 하나뿐입니다.

| 환경 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` (멀티플레이 방/채팅/실시간 상태 저장) |

```bash
npm install
npm run build
npm run start      # 기본 포트 3000 (PORT 환경변수로 변경)
```

- 멀티플레이 테이블은 **서버가 처음 요청을 받을 때 자동 생성**됩니다(`/api/health` 호출 포함). 별도 마이그레이션이 필요 없습니다.
- 빌드 시점에는 `DATABASE_URL`이 없어도 됩니다 (DB 연결은 첫 사용 시점에 만들어집니다).
- 실시간 차량 상태도 DB에 저장되므로 서버리스/다중 인스턴스에서도 동작합니다.
- 헬스체크: `GET /api/health`
- DB 없이도 싱글/로컬 플레이는 가능하고, 온라인 대기실만 비활성화됩니다.

## 조작

| | P1 | P2 | P3 | P4 |
| --- | --- | --- | --- | --- |
| 이동 | WASD | 방향키 | IJKL | 숫자패드 8/5/4/6 |
| 발사 | Space (J) | Enter | U | 0 |
| 부스트 | Shift | 오른쪽 Shift | O | 9 |
| 아이템 | E | M | P | 7 |
| 점프 | Q | . | Y | + |

모바일: 왼쪽 스틱 주행, 오른쪽 버튼 발사/부스트/점프/아이템.

## 구조
- `src/jr/` — 게임 (React Three Fiber)
- `src/lib/rooms.ts`, `src/app/api/rooms/**` — 온라인 대기실 API
- `src/db/` — Drizzle 스키마, 지연 연결, 테이블 자동 보장(`ensure.ts`)
