package com.example.shop.dto.staff;

import com.example.shop.domain.Permission;
import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import java.util.List;

public record SessionUserResponse(
    long id, String loginId, String name, Role role, List<Permission> permissions) {

  public static SessionUserResponse from(Staff staff) {
    return new SessionUserResponse(
        staff.id(),
        staff.loginId(),
        staff.name(),
        staff.role(),
        List.copyOf(staff.role().permissions()));
  }
}
