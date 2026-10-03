package com.example.shop.domain;

import com.example.shop.common.money.Money;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

public record Order(
    long id,
    long memberId,
    OrderStatus status,
    Money productAmount,
    Money deliveryFee,
    Money totalAmount,
    OffsetDateTime createdAt,
    OffsetDateTime paidAt,
    OffsetDateTime expiredAt,
    List<OrderLine> lines) {

  public static final Duration PAYMENT_WINDOW = Duration.ofMinutes(30);

  public Order {
    lines = List.copyOf(lines);
  }

  /** 현재 시각이 {@code createdAt + 30분} 이상이면 결제 기한이 지났다. */
  public boolean isPaymentOverdue(OffsetDateTime now) {
    return !now.isBefore(createdAt.plus(PAYMENT_WINDOW));
  }

  public Order paid(OffsetDateTime at) {
    return new Order(
        id,
        memberId,
        OrderStatus.PAID,
        productAmount,
        deliveryFee,
        totalAmount,
        createdAt,
        at,
        expiredAt,
        lines);
  }

  public OrderSummary toSummary() {
    return new OrderSummary(id, memberId, status, productAmount, deliveryFee, totalAmount);
  }
}
