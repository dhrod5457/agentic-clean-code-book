package com.example.shop.domain;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

public enum Role {
  ADMIN(EnumSet.allOf(Permission.class)),
  OPERATOR(
      EnumSet.of(
          Permission.MEMBER_READ,
          Permission.ORDER_READ,
          Permission.DELIVERY_READ,
          Permission.DELIVERY_WRITE,
          Permission.REFUND_READ,
          Permission.STAFF_READ));

  private final Set<Permission> permissions;

  Role(EnumSet<Permission> permissions) {
    this.permissions = Collections.unmodifiableSet(permissions);
  }

  /** {@link Permission} 선언 순서로 돌려준다. */
  public Set<Permission> permissions() {
    return permissions;
  }
}
