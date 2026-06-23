# DDMS Driver App — 프로젝트 가이드 (Claude Code용)

> 이 파일은 Claude Code가 자동으로 읽고 컨텍스트로 사용합니다.
> 작업 시작 전 정독해 주세요. 인계 시점: **2026-05-14**

---

## 0. 한 줄 요약

데일리샷 신동주류 배송 기사용 모바일 앱. React Native (Expo SDK 54).
현재 **1.0.1 APK**가 실제 기사 폰에 설치되어 운영 중. mock 데이터로 시연·검증 단계.

다음 단계: **실 서버 연동 + 사용자 인증 + 백로그 마무리**.

---

## 1. 기술 스택

| 항목 | 값 |
|------|-----|
| 런타임 | Expo SDK 54, React Native 0.81.5, New Architecture |
| 언어 | TypeScript (strict) |
| 라우팅 | Expo Router v3 (file-based) |
| 상태 관리 | React Context (`src/context/DeliveryContext.tsx`) |
| 영구 저장 | AsyncStorage (오프라인 OK) |
| 애니메이션 | Reanimated 4, Gesture Handler |
| 빌드 | EAS Build (preview profile = APK) |

---

## 2. 디렉토리 구조

```
driver-app/
├─ app/                          # Expo Router 페이지
│  └─ (main)/
│     ├─ (tabs)/
│     │  ├─ dashboard.tsx        # 홈 화면 (가장 자주 진입)
│     │  ├─ deliveries.tsx       # 배송 목록 + 드래그 순서 변경
│     │  └─ history.tsx          # 배송 이력
│     ├─ store/[id].tsx          # 매장 상세 (가장 복잡, 핵심 화면)
│     ├─ today-summary.tsx       # 오늘 전표 (카톡 공유)
│     ├─ course-confirm.tsx      # 코스 확정 화면
│     ├─ notifications.tsx
│     └─ settings.tsx
├─ src/
│  ├─ context/DeliveryContext.tsx   # ⭐ 전역 상태 + 모든 업데이트 액션
│  ├─ data/mock.ts                  # ⭐ 시연용 mock 코스 (7일치)
│  ├─ types/index.ts                # ⭐ 데이터 모델
│  ├─ components/StatusBadge.tsx
│  ├─ hooks/useKakaoChat.ts         # 카톡 연결 (외부 앱 호출)
│  ├─ hooks/usePushNotifications.ts
│  └─ constants/colors.ts
├─ assets/                       # 아이콘·스플래시
├─ _archive/                     # ⭐ 의사결정 문서 (UI/UX 점검·매뉴얼)
├─ app.json                      # Expo 설정 (version, package, EAS projectId)
├─ eas.json                      # EAS 빌드 프로파일
├─ package.json
└─ tsconfig.json
```

⭐ 표시된 파일은 작업 전 반드시 읽어보세요.

---

## 3. 핵심 데이터 모델 (`src/types/index.ts`)

```typescript
export type DeliveryStatus = 'pending' | 'delivered' | 'issue';
export type PickupStatus = 'pending' | 'collected' | 'issue';

// 회수 사유 — 본사(데일리샷)가 출고 시 입력. 신동주류 시트 1:1 매핑
export type PickupReason =
  | '고객요청' | '매장요청' | '오배송' | '상품하자' | '매장변경'
  | '폐업' | '매장전달오류' | '미픽업' | '기타';

export type PickupPlannedAction = '환불' | '재고반영' | '교환' | '기타';
export type PickupFailKind = '매장에주류없음' | '중복오기입' | '매장부재' | '기타';

interface DeliveryItem {
  code, name, quantity, boxUnit;
  bags?, imageUrl?, itemNote?, isBlack?;
  actualQuantity?;  // 수량 불일치 기록
  actualBags?;      // 쇼핑백 부족 기록
}

interface PickupItem {
  code, name, quantity, boxUnit;
  reason?: PickupReason;
  plannedAction?: PickupPlannedAction;
  shippedDate?;      // 'YYYY-MM-DD'
  actualQuantity?;
}

interface Store {
  id, code, name, address, phone, memo?, status, order;
  items: DeliveryItem[];
  photoUris?, deliveredAt?, driverNote?;
  // 회수 관련
  pickupItems?, pickupStatus?, collectedAt?;
  pickupFailReason?, pickupFailKind?, pickupDriverNote?;
}
```

---

## 4. 핵심 정책 (⚠️ 반드시 준수)

1. **회수 전용 매장(items.length === 0)의 회수 처리 = 매장 완료**
   `updatePickupStatus`에서 자동으로 `store.status`를 동기화합니다 (collected→delivered, issue→issue).
   이 규칙을 깨면 dashboard `nextStore` 로직이 무한 루프 가능.

2. **수량 불일치·쇼핑백 부족은 이슈가 아닙니다**
   - `'delivered'` + 메타 기록(`actualQuantity`, `actualBags`)으로만 처리
   - `'issue'`는 진짜 배송 실패만 (회수 못함, 매장 부재 등) → 카톡 자동 공유 동선
   - dashboard·today-summary에서는 별도 카운터로 노출 (정정 N · 🛍 N)

3. **배송 완료 게이팅**
   회수 상품이 있는 매장에서 회수 처리(완료 또는 미완료)를 하지 않으면 "배송 완료 확정" 버튼이 비활성화됩니다.
   `canConfirmDelivery = bagReady && pickupReady` (store/[id].tsx)

4. **완료 취소 = 2단계 confirmation**
   첫 탭 → 버튼이 "취소할까요?" 빨간색으로 변환 → 2.5초 내 두 번째 탭만 popup 열림.
   햇빛·한 손 사용 환경에서 오탭 방지가 목적. 이 패턴 깨지 마세요.

5. **이슈 신고 시 카톡 흐름**
   - 메시지는 자동 작성 (`buildIssueMessage` in store/[id].tsx)
   - 클립보드 자동 복사 + `useKakaoChat.openChat()`로 카톡 채팅방 자동 오픈
   - 기사가 메시지창에 길게 눌러 "붙여넣기" → 전송

6. **외부 보고는 모두 카톡 자동 복사 + 채팅방 열기 패턴 통일**
   타이핑·앱 전환·복사 단계 최소화. 새 외부 알림 추가 시 같은 패턴 따르세요.

7. **저장**
   AsyncStorage 키 prefix: `@delivery_*`, `@hint_*`
   - `@delivery_course_{date}`: 오늘 코스 상태
   - `@delivery_confirmed_{date}`: 확정 시각
   - `@hint_dismissed_drag`: 안내 배너 dismiss 여부

---

## 5. 빌드 / 실행

### 로컬 개발
```bash
npm install
npx expo start              # Expo Go 앱으로 QR 스캔 → 폰에서 즉시 실행
```

### TypeScript 검증
```bash
npx tsc --noEmit
```
> ⚠️ 현재 에러 2건은 알려진 이슈입니다 (§7 참조).

### APK 빌드 (EAS Cloud)
```bash
npx eas login                                            # 본인 계정 (멤버 초대받은 후)
npx eas build --platform android --profile preview        # APK 출력
```
- 빌드 완료까지 15~25분
- 결과 URL이 콘솔에 표시됨

### 새 버전 배포 시
1. `app.json`의 `version` 증가 (예: 1.0.1 → 1.0.2)
2. `eas build --platform android --profile preview` 실행
3. 기존 설치된 폰에 동일 서명 키로 자연 업데이트됨 (서명 키 = EAS projectId와 연결)

---

## 6. EAS 프로젝트 정보

`app.json`에서 `owner`와 `extra.eas.projectId` 필드가 **제거된 상태로 인계**됩니다. 팀원 본인 EAS 계정으로 자유롭게 빌드 가능합니다.

| 항목 | 값 |
|------|-----|
| Slug | `ddms` |
| Android Package | `com.dailyshot.ddms` |
| 이전 owner (참고) | `taeyoonkim` — v1.0.1 빌드 보유 |
| v1.0.1 APK 다운로드 | https://expo.dev/artifacts/eas/3ihrSt1HVsZqKfbiVSywCj.apk |

### 처음 빌드 시 절차

```bash
npx eas login                                                # 본인 EAS 계정
npx eas init                                                  # 본인 계정 하위에 새 projectId 자동 생성·app.json 갱신
npx eas build --platform android --profile preview            # APK 빌드 (15~25분)
```

### ⚠️ 서명 키 주의

본인 계정으로 빌드하면 **새 Android 서명 키**가 발급됩니다.
- **메이가 만든 v1.0.1이 설치된 기사 폰**에는 신규 APK가 "서명 불일치" 에러로 설치 안 됩니다
- 해결: 기사 폰에서 기존 DDMS 앱 삭제 후 새 APK 재설치 (5명 정도면 한 번 안내로 해결)
- 이후로는 본인 서명 키로 일관되게 빌드 가능

---

## 7. 알려진 이슈

### TS 에러 2건 (런타임 OK, 컴파일 경고)
- `app/(main)/(tabs)/dashboard.tsx` (라인 ~615)
- `app/(main)/store/[id].tsx` (라인 ~1422)

원인: `useKakaoChat.openChat`의 시그니처가 `(type?: 'open' | 'regular') => Promise<void>`인데, Pressable의 `onPress`에 직접 전달되어 `GestureResponderEvent`와 타입 충돌.

수정: 람다로 감싸기.
```tsx
// 변경 전
onPress={openKakaoChat}

// 변경 후
onPress={() => openKakaoChat()}
```

### mock 데이터 한계
- `mockCourse` (mock.ts:334) — 모든 매장의 `photoUris[0]`에 picsum 더미 사진 박혀있음. 첫 진입 시 "이미 사진이 있나?" 혼란 가능.
- `mockCourse.date = '2026-05-14'` — 시연 일자가 이 날짜에 고정. 다른 날 시연하려면 mock 추가 필요.
- 실제 API 연동 시 모두 제거.

---

## 8. UI/UX 점검 결과

`_archive/uiux-review-driver-app-2026-05-14.md` 정독 권장.

3단계 점검 완료:
- **1단계 B.I.A.S 휴리스틱** — 4개 화면 × 4축 매트릭스
- **2단계 Peak-End 저니맵** — 사용자 여정 정점·종점 분석
- **3단계 합성 페르소나 압박** — 50대 베테랑 + 30대 신규 시나리오

발견 35건 중 ⭐⭐⭐(즉시) + ⭐⭐(권장)는 **모두 적용 완료**:
- ✅ A1: 회수 완료/미완료 시 토스트 + 자동 다음 매장 이동
- ✅ A3: 완료한 배송 "취소" 버튼 2단계 confirmation
- ✅ A4: Deliveries 자동 스크롤
- ✅ D1: 코스 확정 후 "첫 매장 출발" 직행 CTA
- ✅ D3: 하루 종료 팝업 본인 성과 가시화
- ✅ D5: 배송 완료 토스트에 진행도 가시화
- ✅ N1: 카메라 권한 거부 시 OS 설정 deep link
- ✅ B1: 알림·설정 빨간 도트 우선순위
- ✅ B2/B9: 햇빛 가독성 전반 (작은 텍스트 11~12pt → 12~14pt)
- ✅ B4: Deliveries 안내 배너 dismiss
- ✅ B5: 회수 배지 시각 강화 (좌측 띠)
- ✅ B8: Today-summary 매장 카드 탭 → 상세 이동
- ✅ C2: ↑↓ 버튼 hit slop 확대
- ✅ N4: 회수 미완료 라디오 카드 ≥48pt 보장

## 9. 백로그 (다음 작업 후보, 우선순위순)

### P0 — 운영 안정성
1. **TS 에러 2건 정리** (5분 작업)
2. **mock photoUris[0] placeholder 제거** — 실제 빈 배열로 변경
3. **실 API 연동 설계** — 현재 100% mock. 백엔드 API 정의 필요

### P1 — 인증·사용자
4. **로그인·기사 인증** — 현재 단일 기사 가정 (`mockDriver`). 다중 기사 지원 시 인증 필요
5. **푸시 알림 토큰 등록** — usePushNotifications 골격만. 서버 전송 로직 없음

### P2 — 기능 확장
6. **회수 시트 자동 동기화** — 신동주류 Google Sheets 회수 양식 매핑 완료. API 만들고 양방향 sync
7. **운전 후 정차 시 빠른 순서 변경 UX** (N2) — 음성 명령 또는 swap UI. 실사용자 인터뷰 후 결정
8. **회수 칩 의미 tooltip** (E1) — 신규 사용자용 onboarding

### P3 — 모니터링
9. **에러 트래킹** (Sentry 등)
10. **앱 분석** (Mixpanel·Amplitude — 사용 패턴 측정)

---

## 10. 의사결정 컨텍스트 (놓치면 안 되는 것)

이 앱은 **일반 소비자 앱이 아닙니다**. B2B 작업 도구입니다.

| 환경 변수 | 영향 |
|----------|------|
| 사용자 | 50대 베테랑 + 30대 신규 동시. 디지털 익숙도 中. 노안 시작 |
| 시간 | 분 단위 압박. 한 매장 평균 30초~1분 처리 목표 |
| 손 | 두꺼움. 운전 장갑 끼고 짐 운반 — 한 손 빈번 |
| 환경 | 야외 직사광, 차내, 매장 진입로 |
| 디바이스 | 자기 폰, 보호 케이스 — 화면 가장자리 닿기 어려움 |
| 친숙 도구 | 카카오톡, 전화, 네비. 그 외 앱은 회사 도구 1개 + 배달앱 정도 |

설계 가중치 (B.I.A.S 변형):
- **B**lock: 햇빛에서 핵심 정보 가독성. 화면 동시 정보 7±2 이하
- **I**nterpret: "지금 내가 뭘 해야 하나" 1초 인지
- **A**ct: 한 손·장갑·시간 압박 견디는 마찰 0. 탭 영역 ≥44pt
- **S**tore: 매 매장 처리 직후 "확실히 됐다" 확신, 다음 액션 자동 안내

---

## 11. 코딩 규칙

- **TypeScript strict** — `any` 지양. 새 enum 만들 때 types/index.ts에 일괄 정의
- **자유 텍스트보다 enum 우선** — 신규 상태 필드 추가 시 enum 고려 (예: `PickupReason`, `PickupFailKind`)
- **AsyncStorage 키** — `@delivery_*`, `@hint_*` prefix 일관성
- **한 손 사용 고려** — 핵심 액션 버튼 ≥60pt 높이. 보조 ≥44pt. hitSlop 적극 활용
- **야외 가독성** — 핵심 텍스트 13pt 이상, 의미 있는 회색 텍스트는 `colors.black` 또는 weight 700+
- **의사결정 기록** — 새 패턴 도입 시 `_archive/` 폴더에 의사결정 문서 추가 (UI/UX 점검 보고서 형식 참고)
- **두 번 탭 패턴** — 파괴적 액션(취소·삭제)은 confirmation 강제. 단순 Alert보다 inline state로 자연스럽게

---

## 12. 참조 문서

| 파일 | 내용 |
|------|------|
| `_archive/uiux-review-driver-app-2026-05-14.md` | UI/UX 3단계 점검 보고서 (Executive Summary + 35건 발견) |
| `_archive/driver-app-manual-2026-05-14.md` | 기사용 사용 매뉴얼 (이미 기사에게 배포됨) |
| `app.json` | Expo 설정 — version, EAS projectId, 권한, 플러그인 |
| `eas.json` | EAS 빌드 프로파일 (preview = APK) |
| `src/data/mock.ts` | 시연 시나리오 데이터. 실 API 연동 시 제거 |

---

## 13. 작업 시작 체크리스트

이 프로젝트로 처음 작업할 때:

1. ✅ `npm install`
2. ✅ `npx expo start` — Expo Go 앱에서 동작 확인 (QR 스캔)
3. ✅ `_archive/uiux-review-driver-app-2026-05-14.md` 정독 — 의사결정 컨텍스트 흡수
4. ✅ `_archive/driver-app-manual-2026-05-14.md` 정독 — 실 사용자 흐름 이해
5. ✅ `src/types/index.ts` + `src/context/DeliveryContext.tsx` + `src/data/mock.ts` 정독
6. ✅ `app/(main)/store/[id].tsx` 정독 — 가장 복잡한 화면. 모든 정책이 여기 집결됨
7. ✅ `npx tsc --noEmit` — 기존 에러 2건만 남는지 확인 (신규 에러 없음 = 환경 OK)
8. ✅ EAS 권한 요청 (taeyoonkim@dailyshot.co에 멤버 초대 요청) — 빌드 필요할 때만

---

## 14. 문의

| 상황 | 연락 |
|------|------|
| 의사결정 컨텍스트·정책 질문 | 메이 (taeyoonkim@dailyshot.co) |
| 실제 기사 사용 피드백 | 본사 배송팀 카톡방 |
| EAS·서명 키 권한 | 메이 (owner 권한 보유) |
| 운영 계정·서버 (향후) | 미정 — 백엔드 연동 시 결정 |

---

> **버전**: 1.0.1 (APK 배포 중)
> **마지막 업데이트**: 2026-05-14
> **인계자**: 메이 (taeyoonkim@dailyshot.co)
