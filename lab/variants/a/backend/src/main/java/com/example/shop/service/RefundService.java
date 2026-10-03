package com.example.shop.service;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.common.money.Money;
import com.example.shop.domain.DeliveryStatus;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.OrderStatus;
import com.example.shop.domain.OrderSummary;
import com.example.shop.domain.Refund;
import com.example.shop.domain.RefundStatus;
import com.example.shop.repository.RefundRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefundService {

  private final RefundRepository refundRepository;
  private final OrderService orderService;
  private final DeliveryService deliveryService;
  private final MemberService memberService;
  private final DeliveryFeePolicy deliveryFeePolicy;
  private final Clock clock;

  public RefundService(
      RefundRepository refundRepository,
      OrderService orderService,
      DeliveryService deliveryService,
      MemberService memberService,
      DeliveryFeePolicy deliveryFeePolicy,
      Clock clock) {
    this.refundRepository = refundRepository;
    this.orderService = orderService;
    this.deliveryService = deliveryService;
    this.memberService = memberService;
    this.deliveryFeePolicy = deliveryFeePolicy;
    this.clock = clock;
  }

  public List<Refund> findAll() {
    return refundRepository.findAll();
  }

  /** 요청 조건은 requirements.md §3.5 의 순서로 확인한다. 주문 · 배송 상태는 바꾸지 않는다. */
  @Transactional
  public Refund request(long orderId, Money amount, String reason) {
    OrderSummary order = orderService.getSummary(orderId);
    if (order.status() != OrderStatus.PAID) {
      throw new BusinessException(ErrorCode.REFUND_ORDER_NOT_PAID);
    }
    if (deliveryService.statusOfOrder(orderId) == DeliveryStatus.SHIPPED) {
      throw new BusinessException(ErrorCode.REFUND_STATE_INVALID);
    }
    List<Refund> refunds = refundRepository.findByOrderId(orderId);
    if (refunds.stream().anyMatch(Refund::isRequested)) {
      throw new BusinessException(ErrorCode.REFUND_ALREADY_REQUESTED);
    }
    Money refundable = order.productAmount().minus(approvedAmount(refunds));
    if (amount.isGreaterThan(refundable)) {
      throw new BusinessException(ErrorCode.REFUND_AMOUNT_EXCEEDED);
    }
    boolean partial = amount.isLessThan(order.productAmount());
    OffsetDateTime now = OffsetDateTime.now(clock);
    long id = refundRepository.insertRequested(orderId, amount, partial, reason, now);
    return new Refund(
        id, orderId, amount, partial, reason, RefundStatus.REQUESTED, null, null, now, null);
  }

  @Transactional
  public Refund approve(long id) {
    Refund refund = getRequested(id);
    OrderSummary order = orderService.getSummary(refund.orderId());
    List<Refund> previousApproved =
        refundRepository.findByOrderId(refund.orderId()).stream()
            .filter(r -> r.isApproved() && r.id() != id)
            .toList();
    Money deduction = deliveryFeeDeduction(refund, order, previousApproved);
    Money refunded = refund.amount().minus(deduction);
    OffsetDateTime now = OffsetDateTime.now(clock);
    refundRepository.approve(id, deduction, refunded, now);
    return refund.approved(deduction, refunded, now);
  }

  @Transactional
  public Refund reject(long id) {
    Refund refund = getRequested(id);
    OffsetDateTime now = OffsetDateTime.now(clock);
    refundRepository.reject(id, now);
    return refund.rejected(now);
  }

  /** 무료배송으로 받은 주문을 부분 환불해 남은 상품 금액이 무료배송 조건을 벗어나면 기본 배송비를 한 번 차감한다. 차감액은 환불 금액을 넘지 않는다. */
  private Money deliveryFeeDeduction(
      Refund refund, OrderSummary order, List<Refund> previousApproved) {
    if (!refund.partial() || !order.deliveryFee().isZero()) {
      return Money.ZERO;
    }
    boolean alreadyDeducted =
        previousApproved.stream()
            .anyMatch(
                r -> r.deliveryFeeDeduction() != null && r.deliveryFeeDeduction().isPositive());
    if (alreadyDeducted) {
      return Money.ZERO;
    }
    Money remaining =
        order.productAmount().minus(approvedAmount(previousApproved)).minus(refund.amount());
    MemberGrade grade = memberService.getSummary(order.memberId()).grade();
    if (deliveryFeePolicy.feeFor(grade, remaining).isZero()) {
      return Money.ZERO;
    }
    return Money.min(deliveryFeePolicy.baseFee(), refund.amount());
  }

  private Refund getRequested(long id) {
    Refund refund =
        refundRepository
            .findById(id)
            .orElseThrow(() -> new BusinessException(ErrorCode.REFUND_NOT_FOUND));
    if (!refund.isRequested()) {
      throw new BusinessException(ErrorCode.REFUND_ALREADY_PROCESSED);
    }
    return refund;
  }

  private static Money approvedAmount(List<Refund> refunds) {
    return refunds.stream()
        .filter(Refund::isApproved)
        .map(Refund::amount)
        .reduce(Money.ZERO, Money::plus);
  }
}
