package com.example.shop.domain;

import java.time.OffsetDateTime;

public record Member(
    long id,
    String name,
    String email,
    MemberGrade grade,
    MemberStatus status,
    OffsetDateTime joinedAt,
    OffsetDateTime lastLoginAt,
    OffsetDateTime withdrawnAt) {

  public boolean isWithdrawn() {
    return status == MemberStatus.WITHDRAWN;
  }

  public Member withStatus(MemberStatus newStatus) {
    return new Member(id, name, email, grade, newStatus, joinedAt, lastLoginAt, withdrawnAt);
  }

  public Member withGrade(MemberGrade newGrade) {
    return new Member(id, name, email, newGrade, status, joinedAt, lastLoginAt, withdrawnAt);
  }

  public Member withdraw(OffsetDateTime at) {
    return new Member(id, name, email, grade, MemberStatus.WITHDRAWN, joinedAt, lastLoginAt, at);
  }

  public MemberSummary toSummary() {
    return new MemberSummary(id, grade, status);
  }

  /** 이름과 이메일이 로그에 남지 않게 한다. */
  @Override
  public String toString() {
    return "Member[id=" + id + ", grade=" + grade + ", status=" + status + "]";
  }
}
