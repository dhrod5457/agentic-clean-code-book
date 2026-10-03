package com.example.shop.service;

import com.example.shop.common.money.Money;
import com.example.shop.domain.MemberGrade;
import org.springframework.stereotype.Component;

/** 배송비와 무료배송 판단을 하는 유일한 곳이다. 주문과 환불은 이 판단을 불러 쓴다. */
@Component
public class DeliveryFeePolicy {

  private static final Money BASE_FEE = Money.won(3_000);
  private static final Money VIP_FREE_SHIPPING_THRESHOLD = Money.won(150_000);

  /** VIP 회원이고 상품 금액이 기준 금액 이상이면 0원, 그 밖에는 기본 배송비다. */
  public Money feeFor(MemberGrade grade, Money productAmount) {
    boolean freeShipping =
        grade == MemberGrade.VIP && !productAmount.isLessThan(VIP_FREE_SHIPPING_THRESHOLD);
    return freeShipping ? Money.ZERO : BASE_FEE;
  }

  public Money baseFee() {
    return BASE_FEE;
  }

  public Money vipFreeShippingThreshold() {
    return VIP_FREE_SHIPPING_THRESHOLD;
  }
}
