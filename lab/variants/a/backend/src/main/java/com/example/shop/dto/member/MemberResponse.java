package com.example.shop.dto.member;

import com.example.shop.domain.Member;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import java.time.OffsetDateTime;

public record MemberResponse(
    long id,
    String name,
    String email,
    MemberGrade grade,
    MemberStatus status,
    OffsetDateTime joinedAt,
    OffsetDateTime lastLoginAt,
    OffsetDateTime withdrawnAt) {

  public static MemberResponse from(Member member) {
    return new MemberResponse(
        member.id(),
        member.name(),
        member.email(),
        member.grade(),
        member.status(),
        member.joinedAt(),
        member.lastLoginAt(),
        member.withdrawnAt());
  }
}
