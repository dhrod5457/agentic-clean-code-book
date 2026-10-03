package com.example.shop.dto.staff;

import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import java.time.OffsetDateTime;

/** 비밀번호 값은 넣지 않는다. */
public record StaffResponse(
    long id,
    String loginId,
    String name,
    String department,
    Role role,
    boolean active,
    OffsetDateTime createdAt) {

  public static StaffResponse from(Staff staff) {
    return new StaffResponse(
        staff.id(),
        staff.loginId(),
        staff.name(),
        staff.department(),
        staff.role(),
        staff.active(),
        staff.createdAt());
  }
}
