package com.example.shop.service;

import com.example.shop.domain.Order;
import com.example.shop.domain.OrderStatus;
import com.example.shop.repository.OrderRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderExpiryService {

  private final OrderRepository orderRepository;
  private final Clock clock;

  public OrderExpiryService(OrderRepository orderRepository, Clock clock) {
    this.orderRepository = orderRepository;
    this.clock = clock;
  }

  /** 결제 기한이 지난 결제 대기 주문을 만료하고 바꾼 건수를 돌려준다. */
  @Transactional
  public int expireOverdue() {
    OffsetDateTime now = OffsetDateTime.now(clock);
    int expired = 0;
    for (Order order : orderRepository.findByStatus(OrderStatus.PENDING_PAYMENT)) {
      if (order.isPaymentOverdue(now)) {
        expired += orderRepository.markExpired(order.id(), now);
      }
    }
    return expired;
  }
}
