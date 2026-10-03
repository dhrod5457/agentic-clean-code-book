package com.example.shop.dto.order;

import com.example.shop.domain.OrderPrice;

public record OrderPreviewResponse(
    long memberId, long productAmount, long deliveryFee, long totalAmount) {

  public static OrderPreviewResponse of(long memberId, OrderPrice price) {
    return new OrderPreviewResponse(
        memberId,
        price.productAmount().value(),
        price.deliveryFee().value(),
        price.totalAmount().value());
  }
}
