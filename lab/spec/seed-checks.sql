-- seed 확인 SQL (H2 2.4). schema.sql, seed.sql 을 실행한 뒤 실행한다.
-- 모든 행의 cnt 가 1 이상이어야 한다. 기준 시각은 2026-01-15 10:00:00+09:00 이다.

SELECT 'C1 마지막 로그인 후 365일 이상 지난 활성 회원' AS check_name, COUNT(*) AS cnt
FROM members
WHERE status = 'ACTIVE'
  AND last_login_at <= DATEADD('DAY', -365, TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+09:00')
UNION ALL
SELECT 'C2 최근 30일 안에 탈퇴한 회원', COUNT(*)
FROM members
WHERE status = 'WITHDRAWN'
  AND withdrawn_at >= DATEADD('DAY', -30, TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+09:00')
UNION ALL
SELECT 'C3 10분 안에 결제 기한이 끝나는 결제 대기 주문', COUNT(*)
FROM orders
WHERE status = 'PENDING_PAYMENT'
  AND created_at > DATEADD('MINUTE', -30, TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+09:00')
  AND created_at <= DATEADD('MINUTE', -20, TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+09:00')
UNION ALL
SELECT 'C4 결제 금액 500,000원 이상 주문', COUNT(*)
FROM orders
WHERE total_amount >= 500000
UNION ALL
SELECT 'C5 출고 후 3일 넘게 도착하지 않은 배송', COUNT(*)
FROM deliveries
WHERE status = 'SHIPPED'
  AND shipped_at < DATEADD('DAY', -3, TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+09:00')
UNION ALL
SELECT 'C6 배송비 0원 배송', COUNT(*)
FROM deliveries
WHERE fee = 0
UNION ALL
SELECT 'C7 요청 후 2일 넘게 처리되지 않은 환불', COUNT(*)
FROM refunds
WHERE status = 'REQUESTED'
  AND requested_at < DATEADD('DAY', -2, TIMESTAMP WITH TIME ZONE '2026-01-15 10:00:00+09:00')
UNION ALL
SELECT 'C8 부분 환불', COUNT(*)
FROM refunds
WHERE partial = TRUE;
