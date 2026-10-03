package com.example.shop.dto.member;

import com.example.shop.domain.MemberStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/** 상태 변경은 {@code ACTIVE} 와 {@code SUSPENDED} 만 받는다. */
public record MemberStatusChangeRequest(@NotNull MemberStatus status) {

  @AssertTrue
  public boolean isChangeableStatus() {
    return status != MemberStatus.WITHDRAWN;
  }
}
