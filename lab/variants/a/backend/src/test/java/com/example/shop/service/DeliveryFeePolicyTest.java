package com.example.shop.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.shop.common.money.Money;
import com.example.shop.domain.MemberGrade;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DeliveryFeePolicyTest {

  private final DeliveryFeePolicy policy = new DeliveryFeePolicy();

  @Test
  @DisplayName("[DLV-01] VIP 회원 150,000원 주문은 배송비 0원")
  void vipAtThresholdIsFree() {
    assertThat(policy.feeFor(MemberGrade.VIP, Money.won(150_000))).isEqualTo(Money.ZERO);
  }

  @Test
  @DisplayName("[DLV-02] VIP 회원 149,999원 주문은 배송비 3,000원")
  void vipBelowThresholdPaysBaseFee() {
    assertThat(policy.feeFor(MemberGrade.VIP, Money.won(149_999))).isEqualTo(Money.won(3_000));
  }

  @Test
  @DisplayName("[DLV-03] GENERAL 회원 150,000원 주문은 배송비 3,000원")
  void generalAlwaysPaysBaseFee() {
    assertThat(policy.feeFor(MemberGrade.GENERAL, Money.won(150_000))).isEqualTo(Money.won(3_000));
  }
}
