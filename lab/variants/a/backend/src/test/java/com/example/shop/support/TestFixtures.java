package com.example.shop.support;

import com.example.shop.common.money.Money;
import com.example.shop.domain.Member;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.domain.Order;
import com.example.shop.domain.OrderLine;
import com.example.shop.domain.OrderStatus;
import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

/** 시험이 함께 쓰는 고정 시각과 도메인 값. */
public final class TestFixtures {

  public static final OffsetDateTime NOW = OffsetDateTime.parse("2026-01-15T10:00:00+09:00");
  public static final Clock CLOCK = Clock.fixed(NOW.toInstant(), ZoneId.of("Asia/Seoul"));

  /** seed.sql 의 관리자 계정 비밀번호 test1234! 의 bcrypt 값. */
  public static final String SEED_PASSWORD_HASH =
      "{bcrypt}$2b$10$3QeAhyRq2AWqlYig/XXtf.A3SqbZ1/5/4Fxz91j3etlSTNMH9nt0C";

  public static final String SEED_PASSWORD = "test1234!";

  private TestFixtures() {}

  public static Member member(long id, MemberGrade grade, MemberStatus status) {
    return new Member(
        id,
        "회원" + id,
        "member" + id + "@example.com",
        grade,
        status,
        NOW.minusYears(1),
        NOW.minusDays(1),
        status == MemberStatus.WITHDRAWN ? NOW.minusDays(1) : null);
  }

  public static Order order(
      long id,
      long memberId,
      OrderStatus status,
      long productAmount,
      long deliveryFee,
      OffsetDateTime createdAt) {
    return new Order(
        id,
        memberId,
        status,
        Money.won(productAmount),
        Money.won(deliveryFee),
        Money.won(productAmount + deliveryFee),
        createdAt,
        status == OrderStatus.PAID ? createdAt.plusMinutes(1) : null,
        null,
        List.of(new OrderLine(id * 10, "상품", Money.won(productAmount), 1)));
  }

  public static Staff staff(long id, String loginId, Role role, boolean active) {
    return new Staff(
        id, loginId, SEED_PASSWORD_HASH, "관리자" + id, "운영팀", role, active, NOW.minusYears(1));
  }
}
