package com.example.shop.domain;

import java.time.OffsetDateTime;

public record Staff(
    long id,
    String loginId,
    String passwordHash,
    String name,
    String department,
    Role role,
    boolean active,
    OffsetDateTime createdAt) {

  public Staff withRole(Role newRole) {
    return new Staff(id, loginId, passwordHash, name, department, newRole, active, createdAt);
  }

  public Staff deactivated() {
    return new Staff(id, loginId, passwordHash, name, department, role, false, createdAt);
  }

  /** 이름과 비밀번호 값이 로그에 남지 않게 한다. */
  @Override
  public String toString() {
    return "Staff[id=" + id + ", role=" + role + ", active=" + active + "]";
  }
}
