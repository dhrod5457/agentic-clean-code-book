package com.example.shop.domain;

import com.example.shop.common.money.Money;

/** 주문 생성 · 미리보기에서 계산하는 금액. */
public record OrderPrice(Money productAmount, Money deliveryFee, Money totalAmount) {}
