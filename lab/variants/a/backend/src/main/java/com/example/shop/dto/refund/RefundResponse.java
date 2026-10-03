package com.example.shop.dto.refund;

import com.example.shop.common.money.Money;
import com.example.shop.domain.Refund;
import com.example.shop.domain.RefundStatus;
import java.time.OffsetDateTime;

public record RefundResponse(
    long id,
    long orderId,
    long amount,
    boolean partial,
    String reason,
    RefundStatus status,
    Long deliveryFeeDeduction,
    Long refundedAmount,
    OffsetDateTime requestedAt,
    OffsetDateTime processedAt) {

  public static RefundResponse from(Refund refund) {
    return new RefundResponse(
        refund.id(),
        refund.orderId(),
        refund.amount().value(),
        refund.partial(),
        refund.reason(),
        refund.status(),
        valueOrNull(refund.deliveryFeeDeduction()),
        valueOrNull(refund.refundedAmount()),
        refund.requestedAt(),
        refund.processedAt());
  }

  private static Long valueOrNull(Money money) {
    return money == null ? null : money.value();
  }
}
