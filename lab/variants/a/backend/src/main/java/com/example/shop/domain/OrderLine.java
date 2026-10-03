package com.example.shop.domain;

import com.example.shop.common.money.Money;

/** 주문 상품. 저장하기 전에는 id 가 null 이다. */
public record OrderLine(Long id, String productName, Money unitPrice, int quantity) {

  public static OrderLine of(String productName, Money unitPrice, int quantity) {
    return new OrderLine(null, productName, unitPrice, quantity);
  }

  public Money lineAmount() {
    return unitPrice.times(quantity);
  }
}
