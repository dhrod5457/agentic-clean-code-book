package com.example.shop.domain;

import com.example.shop.common.money.Money;
import java.time.OffsetDateTime;

/** 환불. {@code deliveryFeeDeduction}, {@code refundedAmount} 는 승인한 환불에만 값이 있다. */
public record Refund(
    long id,
    long orderId,
    Money amount,
    boolean partial,
    String reason,
    RefundStatus status,
    Money deliveryFeeDeduction,
    Money refundedAmount,
    OffsetDateTime requestedAt,
    OffsetDateTime processedAt) {

  public boolean isRequested() {
    return status == RefundStatus.REQUESTED;
  }

  public boolean isApproved() {
    return status == RefundStatus.APPROVED;
  }

  public Refund approved(Money deduction, Money refunded, OffsetDateTime at) {
    return new Refund(
        id,
        orderId,
        amount,
        partial,
        reason,
        RefundStatus.APPROVED,
        deduction,
        refunded,
        requestedAt,
        at);
  }

  public Refund rejected(OffsetDateTime at) {
    return new Refund(
        id, orderId, amount, partial, reason, RefundStatus.REJECTED, null, null, requestedAt, at);
  }
}
