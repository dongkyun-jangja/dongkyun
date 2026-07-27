export type DeliveryStatus = 'pending' | 'delivered' | 'issue';
export type PickupStatus = 'pending' | 'collected' | 'issue';

// 회수 미완료 분류 — 기사가 현장에서 선택. 시트 "회수(신동)" 컬럼 값 매핑
export type PickupFailKind = '매장에주류없음' | '중복오기입' | '매장부재' | '기타';

export interface DeliveryItem {
  code: string;
  name: string;
  quantity: number; // 개수 (요청)
  boxUnit: number;  // box당 개수
  bags?: number;    // 쇼핑백 수 (요청)
itemNote?: string; // 상품별 배송 주의사항
  isBlack?: boolean; // 블랙멤버십 상품
  isWhisky?: boolean; // 위스키 상품 — RFID 태그 필요
  isColdChain?: boolean; // 콜드체인 상품 — 냉장 보관 필요
  actualQuantity?: number; // 실제 배송 수량 (불일치 시 기록)
  actualBags?: number;     // 실제 전달 쇼핑백 수 (부족 시 기록, bags>0 일 때만 의미 있음)
}

export interface PickupItem {
  code: string;
  name: string;
  quantity: number;          // 요청 회수 수량
  boxUnit: number;           // box당 개수
  actualQuantity?: number;   // 실제 회수 수량 (불일치 시 기록)
}

export interface Store {
  id: string;
  code: string;       // 매장코드
  name: string;       // 매장명
  address: string;
  phone: string;
  memo?: string;      // 배송 메모 (상단 고정)
  status: DeliveryStatus;
  isManual?: boolean;    // 기사님이 앱에서 수동 추가한 매장
  isCancelled?: boolean; // 이슈 후 취소처리 — 활성 목록에서 숨김, 이력엔 issue로 유지
  order: number;      // 배송 순서 (1부터)
  items: DeliveryItem[];
  photoUris?: string[];   // 최대 3장, 최소 1장 (delivered 상태)
  deliveredAt?: string;  // 'HH:MM' 형식
  // 회수(pickup) 관련
  pickupItems?: PickupItem[];   // 회수 상품 목록 (없으면 회수 없음)
  pickupStatus?: PickupStatus;  // 회수 상태
  collectedAt?: string;         // 회수 완료 시각 'YYYY-MM-DD HH:MM' (구버전은 'HH:MM')
  pickupFailReason?: string;    // 회수 미완료 보조 메모 (자유 텍스트)
  pickupFailKind?: PickupFailKind; // 회수 미완료 분류 (enum)
  pickupDriverNote?: string;    // 회수 관련 기사 비고 (시트 "신동주류 비고")
}

export interface Driver {
  id: string;
  name: string;
  distributorName: string;
  courseName: string;
}

export interface Course {
  id: string;
  date: string; // 'YYYY-MM-DD'
  driver: Driver;
  stores: Store[];
}

// 배송 완료 취소 이력 — 기사 행동 로그 (배송 데이터와 별도 저장)
export interface CancelLog {
  id: string;                  // 고유 ID (date + storeId)
  date: string;                // 취소 발생 날짜 'YYYY-MM-DD'
  cancelledAt: string;         // 취소 시각 'HH:MM'
  driverId: string;
  driverName: string;
  distributorName: string;     // 소속 도매상
  courseName: string;          // 코스명
  storeId: string;
  storeCode: string;
  storeName: string;
  originalDeliveredAt?: string; // 원래 완료 처리 시각 'HH:MM'
  reason: string;              // 기사가 입력한 취소 사유
}
