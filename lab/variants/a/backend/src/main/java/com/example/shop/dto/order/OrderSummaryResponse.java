package com.example.shop.dto.order;

import com.example.shop.domain.Order;
import com.example.shop.domain.OrderStatus;
import java.time.OffsetDateTime;

public record OrderSummaryResponse(
    long id,
    long memberId,
    OrderStatus status,
    long productAmount,
    long deliveryFee,
    long totalAmount,
    OffsetDateTime createdAt,
    OffsetDateTime paidAt,
    OffsetDateTime expiredAt) {

  public static OrderSummaryResponse from(Order order) {
    return new OrderSummaryResponse(
        order.id(),
        order.memberId(),
        order.status(),
        order.productAmount().value(),
        order.deliveryFee().value(),
        order.totalAmount().value(),
        order.createdAt(),
        order.paidAt(),
        order.expiredAt());
  }
}
