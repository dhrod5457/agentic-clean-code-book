package com.example.shop.dto.order;

import com.example.shop.domain.Order;
import com.example.shop.domain.OrderLine;
import com.example.shop.domain.OrderStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderDetailResponse(
    long id,
    long memberId,
    OrderStatus status,
    long productAmount,
    long deliveryFee,
    long totalAmount,
    OffsetDateTime createdAt,
    OffsetDateTime paidAt,
    OffsetDateTime expiredAt,
    List<Line> lines) {

  public static OrderDetailResponse from(Order order) {
    return new OrderDetailResponse(
        order.id(),
        order.memberId(),
        order.status(),
        order.productAmount().value(),
        order.deliveryFee().value(),
        order.totalAmount().value(),
        order.createdAt(),
        order.paidAt(),
        order.expiredAt(),
        order.lines().stream().map(Line::from).toList());
  }

  public record Line(String productName, long unitPrice, int quantity, long lineAmount) {

    static Line from(OrderLine line) {
      return new Line(
          line.productName(), line.unitPrice().value(), line.quantity(), line.lineAmount().value());
    }
  }
}
