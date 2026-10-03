package com.example.shop.service;

import static com.example.shop.support.TestFixtures.CLOCK;
import static com.example.shop.support.TestFixtures.NOW;
import static com.example.shop.support.TestFixtures.order;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.shop.domain.OrderStatus;
import com.example.shop.repository.OrderRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OrderExpiryServiceTest {

  private final OrderRepository orderRepository = mock(OrderRepository.class);
  private final OrderExpiryService orderExpiryService =
      new OrderExpiryService(orderRepository, CLOCK);

  @Test
  @DisplayName("[ORD-10] 생성 후 30분인 주문은 만료, 29분 59초인 주문은 결제 대기 그대로, 결과는 바꾼 건수")
  void expiresOnlyOverdueOrders() {
    when(orderRepository.findByStatus(OrderStatus.PENDING_PAYMENT))
        .thenReturn(
            List.of(
                order(1L, 1L, OrderStatus.PENDING_PAYMENT, 10_000, 3_000, NOW.minusMinutes(30)),
                order(
                    2L,
                    1L,
                    OrderStatus.PENDING_PAYMENT,
                    10_000,
                    3_000,
                    NOW.minusMinutes(29).minusSeconds(59))));
    when(orderRepository.markExpired(1L, NOW)).thenReturn(1);

    int expiredCount = orderExpiryService.expireOverdue();

    assertThat(expiredCount).isEqualTo(1);
    verify(orderRepository).markExpired(1L, NOW);
    verify(orderRepository, never()).markExpired(eq(2L), any());
  }
}
