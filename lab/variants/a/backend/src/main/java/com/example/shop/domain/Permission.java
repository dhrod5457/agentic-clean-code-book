package com.example.shop.domain;

/** 선언 순서가 응답의 권한 목록 순서다. */
public enum Permission {
  MEMBER_READ,
  MEMBER_WRITE,
  ORDER_READ,
  ORDER_WRITE,
  DELIVERY_READ,
  DELIVERY_WRITE,
  REFUND_READ,
  REFUND_WRITE,
  STAFF_READ,
  STAFF_WRITE
}
