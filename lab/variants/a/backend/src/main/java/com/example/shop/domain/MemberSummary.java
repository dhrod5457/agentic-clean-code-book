package com.example.shop.domain;

/** 다른 영역에 넘기는 회원 요약. */
public record MemberSummary(long id, MemberGrade grade, MemberStatus status) {

  public boolean isOrderable() {
    return status == MemberStatus.ACTIVE;
  }
}
