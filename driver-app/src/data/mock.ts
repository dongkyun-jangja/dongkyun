// 보나뱅크 출고의뢰서 기반 목업 데이터
import { Course } from '../types';

export const mockDriver = {
  id: 'driver-001',
  name: '강동규',
  distributorName: '신동주류',
  courseName: 'A코스',
};

// 2025-08-08 (금) — 완료 이력
const mockCourse20250808: Course = {
  id: 'course-0808',
  date: '2025-08-08',
  driver: mockDriver,
  stores: [
    {
      id: 'c0808-s1', code: '80797', name: '블랙앤밀 스타카자점',
      address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678',
      status: 'delivered', order: 1, deliveredAt: '07:42', photoUris: ['delivered'],
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 360, boxUnit: 30, bags: 3, imageUrl: 'https://picsum.photos/seed/00001/120/120' },
        { code: '00077', name: '참이슬 (1.5L)', quantity: 24, boxUnit: 6, imageUrl: 'https://picsum.photos/seed/00077/120/120' },
      ],
    },
    {
      id: 'c0808-s2', code: '00266', name: '60위치긴 서서울충점',
      address: '서울시 서초구 반포동 22-1', phone: '02-3456-7890',
      memo: '지하 냉장창고 입고 필수',
      status: 'delivered', order: 2, deliveredAt: '08:55', photoUris: ['delivered'],
      items: [
        { code: '20059', name: '바크스 룸 세이카스코 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30701', name: '오스카 로디스 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
    {
      id: 'c0808-s3', code: '40575', name: '동네 M2R3',
      address: '서울시 마포구 홍익로 34', phone: '02-5678-9012',
      status: 'delivered', order: 3, deliveredAt: '10:08', photoUris: ['delivered'],
      items: [
        { code: '30325', name: '솔비오5 그라볼 클린도 (750ml)', quantity: 12, boxUnit: 12 },
        { code: '30648', name: '오라피아3 팔피나 포스카트 DOCG (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0808-s4', code: '00239', name: '찬라마이 슈로수파카점',
      address: '서울시 용산구 이태원로 78', phone: '02-7890-1234',
      status: 'delivered', order: 4, deliveredAt: '11:30', photoUris: ['delivered'],
      items: [
        { code: '31199', name: '살타레 분 루제 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0808-s5', code: '40549', name: '맑은물 경복궁점',
      address: '서울시 종로구 사직로 89', phone: '02-4567-8901',
      status: 'delivered', order: 5, deliveredAt: '12:44', photoUris: ['delivered'],
      items: [
        { code: '30083', name: '박스룸 22 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
    {
      id: 'c0808-s6', code: '00100', name: '가사지 고친자이점',
      address: '서울시 중구 을지로 321', phone: '02-8901-2345',
      status: 'issue', order: 6,
      items: [
        { code: '20151', name: '노이스알 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30569', name: '솔브 사례 씨 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
  ],
};

// 2025-08-09 (토) — 완료 이력 (토요일, 적은 배송)
const mockCourse20250809: Course = {
  id: 'course-0809',
  date: '2025-08-09',
  driver: mockDriver,
  stores: [
    {
      id: 'c0809-s1', code: '40046', name: '가주루백화점 앙망점',
      address: '서울시 강동구 천호대로 456', phone: '02-6789-0123',
      status: 'delivered', order: 1, deliveredAt: '08:20', photoUris: ['delivered'],
      items: [
        { code: '30923', name: '파이로드 알 보로 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '21490', name: '다이에트 아미 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0809-s2', code: '00062', name: '91전통 마니배분 서울점',
      address: '서울시 강남구 삼성동 45-2', phone: '02-2345-6789',
      status: 'delivered', order: 2, deliveredAt: '09:45', photoUris: ['delivered'],
      items: [
        { code: '21842', name: '아드벡 10년 (700ml)', quantity: 6, boxUnit: 6 },
        { code: '01842', name: '아드벡 트레이블린 (700ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0809-s3', code: '80797', name: '블랙앤밀 스타카자점',
      address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678',
      status: 'delivered', order: 3, deliveredAt: '11:02', photoUris: ['delivered'],
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 180, boxUnit: 30 },
      ],
    },
  ],
};

// 2025-08-10 (일) — 완료 이력 (일요일, 소량)
const mockCourse20250810: Course = {
  id: 'course-0810',
  date: '2025-08-10',
  driver: mockDriver,
  stores: [
    {
      id: 'c0810-s1', code: '40575', name: '동네 M2R3',
      address: '서울시 마포구 홍익로 34', phone: '02-5678-9012',
      memo: '주차 불가 — 이중주차 후 빠른 하차',
      status: 'delivered', order: 1, deliveredAt: '09:15', photoUris: ['delivered'],
      items: [
        { code: '20059', name: '다이나믹스크 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0810-s2', code: '00239', name: '찬라마이 슈로수파카점',
      address: '서울시 용산구 이태원로 78', phone: '02-7890-1234',
      status: 'delivered', order: 2, deliveredAt: '10:30', photoUris: ['delivered'],
      items: [
        { code: '31199', name: '살타레 분 루제 (750ml)', quantity: 12, boxUnit: 6 },
        { code: '30701', name: '오스카 로디스 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0810-s3', code: '40046', name: '가주루백화점 앙망점',
      address: '서울시 강동구 천호대로 456', phone: '02-6789-0123',
      status: 'delivered', order: 3, deliveredAt: '11:55', photoUris: ['delivered'],
      items: [
        { code: '30923', name: '파이로드 알 보로 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0810-s4', code: '00100', name: '가사지 고친자이점',
      address: '서울시 중구 을지로 321', phone: '02-8901-2345',
      status: 'delivered', order: 4, deliveredAt: '13:20', photoUris: ['delivered'],
      items: [
        { code: '300303', name: '말 발 로제 리트리라 베브멘티노 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30706', name: '무초마스 화이튼 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
  ],
};

// 2025-08-11 (월) — 완료 이력
const mockCourse20250811: Course = {
  id: 'course-0811',
  date: '2025-08-11',
  driver: mockDriver,
  stores: [
    {
      id: 'c0811-s1', code: '80797', name: '블랙앤밀 스타카자점',
      address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678',
      memo: '상품 분실 이력 있음 — 사진 필수',
      status: 'delivered', order: 1, deliveredAt: '07:50', photoUris: ['delivered'],
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 360, boxUnit: 30 },
        { code: '00077', name: '참이슬 (1.5L)', quantity: 12, boxUnit: 6 },
        { code: '01103', name: '세정 (10%)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0811-s2', code: '00062', name: '91전통 마니배분 서울점',
      address: '서울시 강남구 삼성동 45-2', phone: '02-2345-6789',
      status: 'delivered', order: 2, deliveredAt: '09:05', photoUris: ['delivered'],
      items: [
        { code: '21842', name: '아드벡 10년 (700ml)', quantity: 12, boxUnit: 6 },
      ],
    },
    {
      id: 'c0811-s3', code: '40549', name: '맑은물 경복궁점',
      address: '서울시 종로구 사직로 89', phone: '02-4567-8901',
      status: 'delivered', order: 3, deliveredAt: '10:22', photoUris: ['delivered'],
      items: [
        { code: '30083', name: '박스룸 22 (750ml)', quantity: 12, boxUnit: 12 },
        { code: '30027', name: '오렌젤 소프트 루빅 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0811-s4', code: '40575', name: '동네 M2R3',
      address: '서울시 마포구 홍익로 34', phone: '02-5678-9012',
      status: 'delivered', order: 4, deliveredAt: '11:40', photoUris: ['delivered'],
      items: [
        { code: '30325', name: '솔비오5 그라볼 클린도 (750ml)', quantity: 12, boxUnit: 12 },
        { code: '30648', name: '오라피아3 팔피나 포스카트 DOCG (750ml)', quantity: 6, boxUnit: 6 },
        { code: '20059', name: '다이나믹스크 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0811-s5', code: '40046', name: '가주루백화점 앙망점',
      address: '서울시 강동구 천호대로 456', phone: '02-6789-0123',
      status: 'delivered', order: 5, deliveredAt: '12:55', photoUris: ['delivered'],
      items: [
        { code: '30923', name: '파이로드 알 보로 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '21490', name: '다이에트 아미 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
    {
      id: 'c0811-s6', code: '00266', name: '60위치긴 서서울충점',
      address: '서울시 서초구 반포동 22-1', phone: '02-3456-7890',
      status: 'issue', order: 6,
      items: [
        { code: '20059', name: '바크스 룸 세이카스코 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0811-s7', code: '00100', name: '가사지 고친자이점',
      address: '서울시 중구 을지로 321', phone: '02-8901-2345',
      status: 'delivered', order: 7, deliveredAt: '14:10', photoUris: ['delivered'],
      items: [
        { code: '20151', name: '노이스알 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30569', name: '솔브 사례 씨 (750ml)', quantity: 12, boxUnit: 12 },
        { code: '30706', name: '무초마스 화이튼 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
  ],
};

// 2025-08-12 (화) — 완료 이력
const mockCourse20250812: Course = {
  id: 'course-0812',
  date: '2025-08-12',
  driver: mockDriver,
  stores: [
    {
      id: 'c0812-s1', code: '80797', name: '블랙앤밀 스타카자점',
      address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678',
      memo: '뒷문 배송 요망. 도어락 비번 1234#',
      status: 'delivered', order: 1, deliveredAt: '08:05',
      photoUris: ['delivered'],
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 360, boxUnit: 30 },
        { code: '00077', name: '참이슬 (1.5L)', quantity: 12, boxUnit: 6 },
      ],
    },
    {
      id: 'c0812-s2', code: '00266', name: '60위치긴 서서울충점',
      address: '서울시 서초구 반포동 22-1', phone: '02-3456-7890',
      status: 'delivered', order: 2, deliveredAt: '09:22',
      photoUris: ['delivered'],
      items: [
        { code: '20059', name: '바크스 룸 세이카스코 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30701', name: '오스카 로디스 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
    {
      id: 'c0812-s3', code: '40575', name: '동네 M2R3',
      address: '서울시 마포구 홍익로 34', phone: '02-5678-9012',
      memo: '주차 불가 — 이중주차 후 빠른 하차',
      status: 'issue', order: 3,
      items: [
        { code: '30325', name: '솔비오5 그라볼 클린도 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
    {
      id: 'c0812-s4', code: '40046', name: '가주루백화점 앙망점',
      address: '서울시 강동구 천호대로 456', phone: '02-6789-0123',
      status: 'delivered', order: 4, deliveredAt: '11:48',
      photoUris: ['delivered'],
      items: [
        { code: '30923', name: '파이로드 알 보로 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '21490', name: '다이에트 아미 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
    {
      id: 'c0812-s5', code: '00100', name: '가사지 고친자이점',
      address: '서울시 중구 을지로 321', phone: '02-8901-2345',
      status: 'delivered', order: 5, deliveredAt: '13:10',
      photoUris: ['delivered'],
      items: [
        { code: '20151', name: '노이스알 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30569', name: '솔브 사례 씨 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
  ],
};

// 2025-08-13 (목) — 완료 이력
const mockCourse20250813: Course = {
  id: 'course-0813',
  date: '2025-08-13',
  driver: mockDriver,
  stores: [
    {
      id: 'c0813-s1', code: '00062', name: '91전통 마니배분 서울점',
      address: '서울시 강남구 삼성동 45-2', phone: '02-2345-6789',
      status: 'delivered', order: 1, deliveredAt: '07:55',
      photoUris: ['delivered'],
      items: [
        { code: '21842', name: '아드벡 10년 (700ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0813-s2', code: '40549', name: '맑은물 경복궁점',
      address: '서울시 종로구 사직로 89', phone: '02-4567-8901',
      status: 'delivered', order: 2, deliveredAt: '09:04',
      photoUris: ['delivered'],
      items: [
        { code: '30083', name: '박스룸 22 (750ml)', quantity: 12, boxUnit: 12 },
        { code: '30027', name: '오렌젤 소프트 루빅 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0813-s3', code: '00239', name: '찬라마이 슈로수파카점',
      address: '서울시 용산구 이태원로 78', phone: '02-7890-1234',
      status: 'delivered', order: 3, deliveredAt: '10:30',
      photoUris: ['delivered'],
      items: [
        { code: '31199', name: '살타레 분 루제 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'c0813-s4', code: '80797', name: '블랙앤밀 스타카자점',
      address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678',
      status: 'delivered', order: 4, deliveredAt: '12:17',
      photoUris: ['delivered'],
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 180, boxUnit: 30 },
        { code: '01103', name: '세정 (10%)', quantity: 6, boxUnit: 6 },
      ],
    },
  ],
};

export const mockCourse: Course = {
  id: 'course-001',
  date: '2026-05-14',
  driver: mockDriver,
  stores: [
    {
      id: 'store-001',
      code: '80797',
      name: '블랙앤밀 스타카자점',
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      memo: '뒷문 배송 요망. 도어락 비번 1234#\n상품 분실 이력 있음 — 사진 필수',
      status: 'pending', photoUris: ['https://picsum.photos/seed/mock/400/300'],
      order: 1,
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 360, boxUnit: 30 },
        { code: '00077', name: '참이슬 (1.5L)', quantity: 12, boxUnit: 6 },
        { code: '01103', name: '세정 (10%)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'store-002',
      code: '00062',
      name: '91전통 마니배분 서울점',
      address: '서울시 강남구 삼성동 45-2',
      phone: '02-2345-6789',
      status: 'pending', photoUris: ['https://picsum.photos/seed/mock/400/300'],
      order: 2,
      items: [
        { code: '21842', name: '아드벡 10년 (700ml)', quantity: 6, boxUnit: 6, bags: 2, isBlack: true, itemNote: '박스 충격 주의 — 낱병 포장 상태 확인 필수' },
        { code: '01842', name: '아드벡 트레이블린 (700ml)', quantity: 6, boxUnit: 6, isBlack: true },
      ],
    },
    {
      id: 'store-003',
      code: '00266',
      name: '60위치긴 서서울충점',
      address: '서울시 서초구 반포동 22-1',
      phone: '02-3456-7890',
      memo: '지하 냉장창고 입고 필수\n직원에게 전달 — 점주 오전 부재',
      status: 'pending', photoUris: ['https://picsum.photos/seed/mock/400/300'],
      order: 3,
      items: [
        { code: '20059', name: '바크스 룸 세이카스코 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30701', name: '오스카 로디스 (750ml)', quantity: 12, boxUnit: 12, isBlack: true },
        { code: '30921', name: '아무 아라바이 알벡 (750ml)', quantity: 6, boxUnit: 6, isBlack: true, itemNote: '스크류캡 아님 — 코르크 손상 주의' },
      ],
      pickupItems: [
        { code: '20059', name: '바크스 룸 세이카스코 (750ml)', quantity: 6, boxUnit: 6, reason: '상품하자', plannedAction: '환불', shippedDate: '2026-04-22' },
        { code: '30701', name: '오스카 로디스 (750ml)', quantity: 2, boxUnit: 12, reason: '오배송', plannedAction: '재고반영', shippedDate: '2026-05-02' },
      ],
      pickupStatus: 'pending',
    },
    {
      id: 'store-004',
      code: '40549',
      name: '맑은물 경복궁점',
      address: '서울시 종로구 사직로 89',
      phone: '02-4567-8901',
      status: 'pending', photoUris: ['https://picsum.photos/seed/mock/400/300'],
      order: 4,
      items: [
        { code: '30083', name: '박스룸 22 (750ml)', quantity: 12, boxUnit: 12, bags: 5, isBlack: true, itemNote: '쇼핑백 포장 후 전달 요망' },
        { code: '30027', name: '오렌젤 소프트 루빅 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'store-005',
      code: '40575',
      name: '동네 M2R3',
      address: '서울시 마포구 홍익로 34',
      phone: '02-5678-9012',
      memo: '주차 불가 — 이중주차 후 빠른 하차\n테이블 위에 두지 마세요',
      status: 'pending', photoUris: ['https://picsum.photos/seed/mock/400/300'],
      order: 5,
      items: [
        { code: '20059', name: '다이나믹스크 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30325', name: '솔비오5 그라볼 클린도 (750ml)', quantity: 12, boxUnit: 12 },
        { code: '30648', name: '오라피아3 팔피나 포스카트 DOCG (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'store-006',
      code: '40046',
      name: '가주루백화점 앙망점',
      address: '서울시 강동구 천호대로 456',
      phone: '02-6789-0123',
      status: 'pending', photoUris: ['https://picsum.photos/seed/mock/400/300'],
      order: 6,
      items: [
        { code: '30923', name: '파이로드 알 보로 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '21490', name: '다이에트 아미 (750ml)', quantity: 12, boxUnit: 12 },
      ],
    },
    {
      id: 'store-007',
      code: '00239',
      name: '찬라마이 슈로수파카점',
      address: '서울시 용산구 이태원로 78',
      phone: '02-7890-1234',
      status: 'pending', photoUris: [],
      order: 7,
      items: [], // 배송 없음 — 회수 전용
      pickupItems: [
        { code: '31199', name: '살타레 분 루제 (750ml)', quantity: 12, boxUnit: 6, reason: '고객요청', plannedAction: '환불', shippedDate: '2026-05-05' },
      ],
      pickupStatus: 'pending',
    },
    {
      id: 'store-008',
      code: '00100',
      name: '가사지 고친자이점',
      address: '서울시 중구 을지로 321',
      phone: '02-8901-2345',
      status: 'pending', photoUris: ['https://picsum.photos/seed/mock/400/300'],
      order: 8,
      items: [
        { code: '20151', name: '노이스알 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '300303', name: '말 발 로제 리트리라 베브멘티노 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '30569', name: '솔브 사례 씨 (750ml)', quantity: 12, boxUnit: 12 },
        { code: '30706', name: '무초마스 화이튼 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'store-009',
      code: '51023',
      name: '하이볼 클럽 성수점',
      address: '서울시 성동구 성수이로 77',
      phone: '02-3344-5566',
      status: 'pending', photoUris: [],
      order: 9,
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 180, boxUnit: 30 },
        { code: '10012', name: '처음처럼 (360ml)', quantity: 120, boxUnit: 30 },
      ],
    },
    {
      id: 'store-010',
      code: '62174',
      name: '와인바 루나 합정점',
      address: '서울시 마포구 합정동 358-3',
      phone: '02-2255-8877',
      memo: '엘리베이터 없음 — 2층 직접 운반',
      status: 'pending', photoUris: [],
      order: 10,
      items: [
        { code: '30083', name: '박스룸 22 (750ml)', quantity: 12, boxUnit: 12, isBlack: true },
        { code: '30648', name: '오라피아3 팔피나 포스카트 DOCG (750ml)', quantity: 6, boxUnit: 6, isBlack: true, bags: 2 },
      ],
    },
    {
      id: 'store-011',
      code: '73301',
      name: '포차 삼거리 신림점',
      address: '서울시 관악구 신림로 215',
      phone: '02-8765-4321',
      status: 'pending', photoUris: [],
      order: 11,
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 360, boxUnit: 30 },
        { code: '00077', name: '참이슬 (1.5L)', quantity: 24, boxUnit: 6 },
        { code: '10012', name: '처음처럼 (360ml)', quantity: 240, boxUnit: 30 },
      ],
    },
    {
      id: 'store-012',
      code: '84412',
      name: '더 바 이태원 루프탑',
      address: '서울시 용산구 이태원동 130-5',
      phone: '02-7744-2211',
      memo: '루프탑 직배송 — 엘리베이터 비밀번호 *7722',
      status: 'pending', photoUris: [],
      order: 12,
      items: [
        { code: '21842', name: '아드벡 10년 (700ml)', quantity: 6, boxUnit: 6, isBlack: true, itemNote: '낱병 포장 확인 필수' },
        { code: '30923', name: '파이로드 알 보로 (750ml)', quantity: 12, boxUnit: 6, isBlack: true },
        { code: '21490', name: '다이에트 아미 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'store-013',
      code: '95523',
      name: '전통주점 담다 광화문점',
      address: '서울시 종로구 새문안로 68',
      phone: '02-6655-9900',
      status: 'pending', photoUris: [],
      order: 13,
      items: [
        { code: '01103', name: '세정 (10%)', quantity: 12, boxUnit: 6 },
        { code: '30027', name: '오렌젤 소프트 루빅 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'store-014',
      code: '10634',
      name: '소맥천국 노량진점',
      address: '서울시 동작구 노량진로 55',
      phone: '02-5533-1122',
      memo: '현금 결제 — 영수증 2부 출력 요망',
      status: 'pending', photoUris: [],
      order: 14,
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 360, boxUnit: 30 },
        { code: '10012', name: '처음처럼 (360ml)', quantity: 360, boxUnit: 30 },
        { code: '00077', name: '참이슬 (1.5L)', quantity: 48, boxUnit: 6 },
      ],
    },
    {
      id: 'store-015',
      code: '21745',
      name: '레스토랑 봄봄 서래마을점',
      address: '서울시 서초구 반포동 114-22',
      phone: '02-4422-6688',
      status: 'pending', photoUris: [],
      order: 15,
      items: [
        { code: '30701', name: '오스카 로디스 (750ml)', quantity: 6, boxUnit: 6, isBlack: true },
        { code: '31199', name: '살타레 분 루제 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '20059', name: '바크스 룸 세이카스코 (750ml)', quantity: 6, boxUnit: 6, bags: 3 },
      ],
    },
    {
      id: 'store-016',
      code: '32856',
      name: '감성주점 달빛 건대점',
      address: '서울시 광진구 능동로 183',
      phone: '02-9988-7766',
      status: 'pending', photoUris: [],
      order: 16,
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 180, boxUnit: 30 },
        { code: '00077', name: '참이슬 (1.5L)', quantity: 12, boxUnit: 6 },
      ],
    },
    {
      id: 'store-017',
      code: '43967',
      name: '비어홀 그레인 여의도점',
      address: '서울시 영등포구 여의나루로 42',
      phone: '02-3311-5599',
      memo: '주차 가능 — 지하 1층 하역장 진입',
      status: 'pending', photoUris: [],
      order: 17,
      items: [
        { code: '30569', name: '솔브 사례 씨 (750ml)', quantity: 12, boxUnit: 12, isBlack: true },
        { code: '30325', name: '솔비오5 그라볼 클린도 (750ml)', quantity: 6, boxUnit: 12 },
      ],
    },
    {
      id: 'store-018',
      code: '54078',
      name: '오마카세 키라 청담점',
      address: '서울시 강남구 청담동 87-4',
      phone: '02-7766-3344',
      memo: '고급 포장 필수 — 쇼핑백 4개 동봉',
      status: 'pending', photoUris: [],
      order: 18,
      items: [
        { code: '01842', name: '아드벡 트레이블린 (700ml)', quantity: 6, boxUnit: 6, isBlack: true, bags: 4, itemNote: '쇼핑백 포장 후 전달' },
        { code: '30921', name: '아무 아라바이 알벡 (750ml)', quantity: 6, boxUnit: 6, isBlack: true },
      ],
    },
    {
      id: 'store-019',
      code: '65189',
      name: '술 한 잔 망원점',
      address: '서울시 마포구 망원동 424-1',
      phone: '02-2244-8800',
      status: 'pending', photoUris: [],
      order: 19,
      items: [
        { code: '10012', name: '처음처럼 (360ml)', quantity: 120, boxUnit: 30 },
        { code: '20151', name: '노이스알 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
    {
      id: 'store-020',
      code: '76290',
      name: '이자카야 사쿠라 신촌점',
      address: '서울시 서대문구 신촌로 101',
      phone: '02-1122-4455',
      memo: '일본어 가능 담당자 요청 — 없으면 한국어 가능',
      status: 'pending', photoUris: [],
      order: 20,
      items: [
        { code: '00001', name: '청하 (300ml)', quantity: 360, boxUnit: 30 },
        { code: '30706', name: '무초마스 화이튼 (750ml)', quantity: 6, boxUnit: 6 },
        { code: '300303', name: '말 발 로제 리트리라 베브멘티노 (750ml)', quantity: 6, boxUnit: 6 },
      ],
    },
  ],
};

// 날짜 오름차순 정렬 (오래된 것 → 오늘)
export const mockAllCourses: Course[] = [
  mockCourse20250808,
  mockCourse20250809,
  mockCourse20250810,
  mockCourse20250811,
  mockCourse20250812,
  mockCourse20250813,
  mockCourse,
];
