package com.example.shop.dto.staff;

import jakarta.validation.constraints.NotBlank;

/** 로그인은 값이 있는지만 검사한다. 형식과 길이는 보지 않는다. */
public record LoginRequest(@NotBlank String loginId, @NotBlank String password) {

  /** 비밀번호가 로그에 남지 않게 한다. */
  @Override
  public String toString() {
    return "LoginRequest[]";
  }
}
