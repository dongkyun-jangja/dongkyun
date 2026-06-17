export type DeliveryStatus = 'pending' | 'delivered' | 'issue';
export type PickupStatus = 'pending' | 'collected' | 'issue';

// 회수 사유 — 본사(데일리샷)가 출고 시 입력. 신동주류 시트와 1:1 매핑
export type PickupReason =
  | '고객요청'
  | '매장요청'
  | '오배송'
  | '상품하자'
  | '매장변경'
  | '폐업'
  | '매장전달오류'
  | '미픽업'
  | '기타';

// 예정조치 — 본사 입력
export type PickupPlannedAction = '환불' | '재고반영' | '교환' | '기타';

// 회수 미완료 분류 — 기사가 현장에서 선택. 시트 "회수(신동)" 컬럼 값 매핑
export type PickupFailKind = '매장에주류없음' | '중복오기입' | '매장부재' | '기타';

export interface DeliveryItem {
  code: string;
  name: string;
  quantity: number; // 개수 (요청)
  boxUnit: number;  // box당 개수
  bags?: number;    // 쇼핑백 수 (요청)
  imageUrl?: string; // 상품 이미지 URL (실서비스: DB에서 조회)
  itemNote?: string; // 상품별 배송 주의사항
  isBlack?: boolean; // 블랙멤버십 상품
  actualQuantity?: number; // 실제 배송 수량 (불일치 시 기록)
  actualBags?: number;     // 실제 전달 쇼핑백 수 (부족 시 기록, bags>0 일 때만 의미 있음)
}

export interface PickupItem {
  code: string;
  name: string;
  quantity: number;          // 요청 회수 수량
  boxUnit: number;           // box당 개수
  reason?: PickupReason;     // 회수 사유 (본사 입력, enum)
  plannedAction?: PickupPlannedAction; // 예정조치 (본사 입력, enum)
  shippedDate?: string;      // 출고일 'YYYY-MM-DD' (해당 상품이 매장에 처음 간 날짜)
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
  order: number;      // 배송 순서 (1부터)
  items: DeliveryItem[];
  photoUris?: string[];   // 최대 3장, 최소 1장 (delivered 상태)
  deliveredAt?: string;  // 'HH:MM' 형식
  driverNote?: string;   // 기사 현장 메모
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
