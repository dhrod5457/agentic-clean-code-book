package com.example.shop.domain;

import com.example.shop.common.money.Money;

/** 다른 영역에 넘기는 주문 요약. */
public record OrderSummary(
    long id,
    long memberId,
    OrderStatus status,
    Money productAmount,
    Money deliveryFee,
    Money totalAmount) {}
