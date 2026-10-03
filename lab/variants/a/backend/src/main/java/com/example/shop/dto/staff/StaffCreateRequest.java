package com.example.shop.dto.staff;

import com.example.shop.domain.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StaffCreateRequest(
    @NotBlank @Pattern(regexp = "[a-z0-9._]{4,30}") String loginId,
    @NotBlank @Size(max = 50) String name,
    @NotBlank @Size(max = 200) String department,
    @NotNull Role role,
    @NotBlank @Pattern(regexp = "[\\x20-\\x7E]{8,64}") String password) {

  /** 비밀번호가 로그에 남지 않게 한다. */
  @Override
  public String toString() {
    return "StaffCreateRequest[role=" + role + "]";
  }
}
