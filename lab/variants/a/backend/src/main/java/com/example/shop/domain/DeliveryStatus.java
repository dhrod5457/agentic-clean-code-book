package com.example.shop.domain;

public enum DeliveryStatus {
  READY,
  SHIPPED,
  DELIVERED;

  public boolean canChangeTo(DeliveryStatus target) {
    return (this == READY && target == SHIPPED) || (this == SHIPPED && target == DELIVERED);
  }
}
