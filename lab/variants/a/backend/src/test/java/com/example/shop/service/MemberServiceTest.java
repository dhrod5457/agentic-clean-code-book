package com.example.shop.service;

import static com.example.shop.support.TestFixtures.CLOCK;
import static com.example.shop.support.TestFixtures.NOW;
import static com.example.shop.support.TestFixtures.member;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.domain.Member;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MemberServiceTest {

  private final MemberRepository memberRepository = mock(MemberRepository.class);
  private final MemberService memberService = new MemberService(memberRepository, CLOCK);

  @Test
  @DisplayName("[MBR-01] 활성 회원을 정지로 바꾼다")
  void activeToSuspended() {
    givenMember(member(1L, MemberGrade.GENERAL, MemberStatus.ACTIVE));

    Member result = memberService.changeStatus(1L, MemberStatus.SUSPENDED);

    assertThat(result.status()).isEqualTo(MemberStatus.SUSPENDED);
    verify(memberRepository).updateStatus(1L, MemberStatus.SUSPENDED);
  }

  @Test
  @DisplayName("[MBR-02] 정지 회원을 활성으로 바꾼다")
  void suspendedToActive() {
    givenMember(member(7L, MemberGrade.GENERAL, MemberStatus.SUSPENDED));

    Member result = memberService.changeStatus(7L, MemberStatus.ACTIVE);

    assertThat(result.status()).isEqualTo(MemberStatus.ACTIVE);
    verify(memberRepository).updateStatus(7L, MemberStatus.ACTIVE);
  }

  @Test
  @DisplayName("[MBR-03] 일반 회원 등급을 VIP 로 바꾼다")
  void generalToVip() {
    givenMember(member(1L, MemberGrade.GENERAL, MemberStatus.ACTIVE));

    Member result = memberService.changeGrade(1L, MemberGrade.VIP);

    assertThat(result.grade()).isEqualTo(MemberGrade.VIP);
    verify(memberRepository).updateGrade(1L, MemberGrade.VIP);
  }

  @Test
  @DisplayName("[MBR-04] 활성 회원 탈퇴 처리는 상태 탈퇴, withdrawnAt 이 현재 시각")
  void withdrawActiveMember() {
    givenMember(member(1L, MemberGrade.GENERAL, MemberStatus.ACTIVE));

    Member result = memberService.withdraw(1L);

    assertThat(result.status()).isEqualTo(MemberStatus.WITHDRAWN);
    assertThat(result.withdrawnAt()).isEqualTo(NOW);
    verify(memberRepository).withdraw(1L, NOW);
  }

  @Test
  @DisplayName("[MBR-05] 탈퇴 회원의 상태 변경, 등급 변경, 탈퇴 처리는 MEMBER_WITHDRAWN")
  void withdrawnMemberCannotChange() {
    givenMember(member(13L, MemberGrade.GENERAL, MemberStatus.WITHDRAWN));

    assertWithdrawn(() -> memberService.changeStatus(13L, MemberStatus.ACTIVE));
    assertWithdrawn(() -> memberService.changeGrade(13L, MemberGrade.VIP));
    assertWithdrawn(() -> memberService.withdraw(13L));
    verify(memberRepository, never()).updateStatus(anyLong(), any());
    verify(memberRepository, never()).updateGrade(anyLong(), any());
    verify(memberRepository, never()).withdraw(anyLong(), any());
  }

  private void givenMember(Member member) {
    when(memberRepository.findById(member.id())).thenReturn(Optional.of(member));
  }

  private static void assertWithdrawn(Runnable action) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(
            BusinessException.class,
            e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.MEMBER_WITHDRAWN));
  }
}
