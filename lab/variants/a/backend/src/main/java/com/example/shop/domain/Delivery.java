package com.example.shop.domain;

import com.example.shop.common.money.Money;
import java.time.OffsetDateTime;

public record Delivery(
    long id,
    long orderId,
    DeliveryStatus status,
    Money fee,
    OffsetDateTime createdAt,
    OffsetDateTime shippedAt,
    OffsetDateTime deliveredAt) {

  public Delivery shipped(OffsetDateTime at) {
    return new Delivery(id, orderId, DeliveryStatus.SHIPPED, fee, createdAt, at, deliveredAt);
  }

  public Delivery delivered(OffsetDateTime at) {
    return new Delivery(id, orderId, DeliveryStatus.DELIVERED, fee, createdAt, shippedAt, at);
  }
}
