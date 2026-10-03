package com.example.shop.dto.delivery;

import com.example.shop.domain.Delivery;
import com.example.shop.domain.DeliveryStatus;
import java.time.OffsetDateTime;

public record DeliveryResponse(
    long id,
    long orderId,
    DeliveryStatus status,
    long fee,
    OffsetDateTime createdAt,
    OffsetDateTime shippedAt,
    OffsetDateTime deliveredAt) {

  public static DeliveryResponse from(Delivery delivery) {
    return new DeliveryResponse(
        delivery.id(),
        delivery.orderId(),
        delivery.status(),
        delivery.fee().value(),
        delivery.createdAt(),
        delivery.shippedAt(),
        delivery.deliveredAt());
  }
}
