package com.example.shop.service;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.domain.Member;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.domain.MemberSummary;
import com.example.shop.repository.MemberRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

  private final MemberRepository memberRepository;
  private final Clock clock;

  public MemberService(MemberRepository memberRepository, Clock clock) {
    this.memberRepository = memberRepository;
    this.clock = clock;
  }

  public List<Member> findAll() {
    return memberRepository.findAll();
  }

  public Member get(long id) {
    return memberRepository
        .findById(id)
        .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
  }

  /** 다른 영역에서 회원 등급과 상태를 읽는다. */
  public MemberSummary getSummary(long id) {
    return get(id).toSummary();
  }

  /** {@code ACTIVE} 와 {@code SUSPENDED} 사이에서만 바꾼다. 탈퇴는 {@link #withdraw} 로 한다. */
  @Transactional
  public Member changeStatus(long id, MemberStatus status) {
    if (status == MemberStatus.WITHDRAWN) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED);
    }
    Member member = getNotWithdrawn(id);
    if (member.status() == status) {
      return member;
    }
    memberRepository.updateStatus(id, status);
    return member.withStatus(status);
  }

  @Transactional
  public Member changeGrade(long id, MemberGrade grade) {
    Member member = getNotWithdrawn(id);
    if (member.grade() == grade) {
      return member;
    }
    memberRepository.updateGrade(id, grade);
    return member.withGrade(grade);
  }

  @Transactional
  public Member withdraw(long id) {
    Member member = getNotWithdrawn(id);
    OffsetDateTime now = OffsetDateTime.now(clock);
    memberRepository.withdraw(id, now);
    return member.withdraw(now);
  }

  private Member getNotWithdrawn(long id) {
    Member member = get(id);
    if (member.isWithdrawn()) {
      throw new BusinessException(ErrorCode.MEMBER_WITHDRAWN);
    }
    return member;
  }
}
