package com.example.shop.service;

import static com.example.shop.support.TestFixtures.CLOCK;
import static com.example.shop.support.TestFixtures.NOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.common.money.Money;
import com.example.shop.domain.DeliveryStatus;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.domain.MemberSummary;
import com.example.shop.domain.OrderStatus;
import com.example.shop.domain.OrderSummary;
import com.example.shop.domain.Refund;
import com.example.shop.domain.RefundStatus;
import com.example.shop.repository.RefundRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RefundServiceTest {

  private static final long ORDER_ID = 500L;
  private static final long MEMBER_ID = 4L;

  private final RefundRepository refundRepository = mock(RefundRepository.class);
  private final OrderService orderService = mock(OrderService.class);
  private final DeliveryService deliveryService = mock(DeliveryService.class);
  private final MemberService memberService = mock(MemberService.class);
  private final RefundService refundService =
      new RefundService(
          refundRepository,
          orderService,
          deliveryService,
          memberService,
          new DeliveryFeePolicy(),
          CLOCK);

  /** 시험마다 주문의 환불 기록. 승인 시험은 이 목록을 바꿔 가며 쓴다. */
  private final List<Refund> refundsOfOrder = new ArrayList<>();

  @BeforeEach
  void conditionalUpdatesSucceed() {
    when(refundRepository.approve(anyLong(), any(), any(), any())).thenReturn(1);
    when(refundRepository.reject(anyLong(), any())).thenReturn(1);
  }

  @Test
  @DisplayName("[RFD-01] 결제 완료 · 출고 대기 주문(100,000원)에 30,000원 환불 요청은 요청 상태, 부분 환불")
  void requestPartialRefund() {
    givenOrder(OrderStatus.PAID, 100_000, 3_000);
    givenDelivery(DeliveryStatus.READY);
    givenRefunds();
    when(refundRepository.insertRequested(ORDER_ID, Money.won(30_000), true, "단순 변심", NOW))
        .thenReturn(1001L);

    Refund refund = refundService.request(ORDER_ID, Money.won(30_000), "단순 변심");

    assertThat(refund.id()).isEqualTo(1001L);
    assertThat(refund.status()).isEqualTo(RefundStatus.REQUESTED);
    assertThat(refund.partial()).isTrue();
    assertThat(refund.requestedAt()).isEqualTo(NOW);
  }

  @Test
  @DisplayName("[RFD-02] 배송 중인 주문에 환불 요청은 REFUND_STATE_INVALID")
  void shippedOrderCannotBeRefunded() {
    givenOrder(OrderStatus.PAID, 100_000, 3_000);
    givenDelivery(DeliveryStatus.SHIPPED);
    givenRefunds();

    assertError(
        () -> refundService.request(ORDER_ID, Money.won(30_000), "사유"),
        ErrorCode.REFUND_STATE_INVALID);
    verifyNothingInserted();
  }

  @Test
  @DisplayName("[RFD-03] 결제 대기 주문과 만료 주문에 환불 요청은 각각 REFUND_ORDER_NOT_PAID")
  void unpaidOrderCannotBeRefunded() {
    givenOrder(OrderStatus.PENDING_PAYMENT, 100_000, 3_000);
    assertError(
        () -> refundService.request(ORDER_ID, Money.won(30_000), "사유"),
        ErrorCode.REFUND_ORDER_NOT_PAID);

    givenOrder(OrderStatus.EXPIRED, 100_000, 3_000);
    assertError(
        () -> refundService.request(ORDER_ID, Money.won(30_000), "사유"),
        ErrorCode.REFUND_ORDER_NOT_PAID);
    verifyNothingInserted();
  }

  @Test
  @DisplayName("[RFD-04] 상품 금액 100,000원, 승인 환불 70,000원인 주문에 40,000원 요청은 REFUND_AMOUNT_EXCEEDED")
  void amountOverRefundableIsRejected() {
    givenOrder(OrderStatus.PAID, 100_000, 3_000);
    givenDelivery(DeliveryStatus.DELIVERED);
    givenRefunds(approved(1L, 70_000, true, 0));

    assertError(
        () -> refundService.request(ORDER_ID, Money.won(40_000), "사유"),
        ErrorCode.REFUND_AMOUNT_EXCEEDED);
    verifyNothingInserted();
  }

  @Test
  @DisplayName("[RFD-05] 요청 상태 환불이 있는 주문에 다시 요청하면 REFUND_ALREADY_REQUESTED")
  void onlyOneRequestedRefundPerOrder() {
    givenOrder(OrderStatus.PAID, 100_000, 3_000);
    givenDelivery(DeliveryStatus.READY);
    givenRefunds(requested(1L, 10_000, true));

    assertError(
        () -> refundService.request(ORDER_ID, Money.won(10_000), "사유"),
        ErrorCode.REFUND_ALREADY_REQUESTED);
    verifyNothingInserted();
  }

  @Test
  @DisplayName("[RFD-06] VIP 회원 160,000원 주문(배송비 0원)에서 20,000원 부분 환불 승인은 차감 3,000원, 환불 17,000원")
  void deductsDeliveryFeeWhenFreeShippingIsLost() {
    givenVipFreeShippingOrder(160_000);
    givenRefunds(requested(1001L, 20_000, true));

    Refund approved = refundService.approve(1001L);

    assertApproved(approved, 3_000, 17_000);
  }

  @Test
  @DisplayName("[RFD-07] VIP 회원 200,000원 주문(배송비 0원)에서 20,000원 부분 환불 승인은 남은 180,000원이라 차감 0원")
  void noDeductionWhenStillFreeShipping() {
    givenVipFreeShippingOrder(200_000);
    givenRefunds(requested(1001L, 20_000, true));

    Refund approved = refundService.approve(1001L);

    assertApproved(approved, 0, 20_000);
  }

  @Test
  @DisplayName("[RFD-08] 배송비 3,000원으로 저장된 주문(100,000원)에서 30,000원 부분 환불 승인은 차감 0원")
  void noDeductionWhenDeliveryFeeWasPaid() {
    givenOrder(OrderStatus.PAID, 100_000, 3_000);
    givenMemberGrade(MemberGrade.GENERAL);
    givenRefunds(requested(1001L, 30_000, true));

    Refund approved = refundService.approve(1001L);

    assertApproved(approved, 0, 30_000);
  }

  @Test
  @DisplayName("[RFD-09] VIP 회원 308,000원 주문에서 289,000원 승인(차감 3,000원) 뒤 19,000원 승인은 차감 0원")
  void deductsOnlyOncePerOrder() {
    givenVipFreeShippingOrder(308_000);
    givenRefunds(requested(1001L, 289_000, true));

    Refund first = refundService.approve(1001L);
    assertApproved(first, 3_000, 286_000);

    givenRefunds(first, requested(1002L, 19_000, true));
    Refund second = refundService.approve(1002L);

    assertApproved(second, 0, 19_000);
  }

  @Test
  @DisplayName("[RFD-10] VIP 회원 152,000원 주문에서 2,500원 부분 환불 승인은 차감 2,500원, 환불 0원")
  void deductionIsLimitedToRefundAmount() {
    givenVipFreeShippingOrder(152_000);
    givenRefunds(requested(1001L, 2_500, true));

    Refund approved = refundService.approve(1001L);

    assertApproved(approved, 2_500, 0);
  }

  @Test
  @DisplayName("[RFD-11] 요청 상태 환불을 거절하면 거절 상태, processedAt 기록, 차감액 · 환불 금액 null")
  void rejectRequestedRefund() {
    givenRefunds(requested(1001L, 20_000, true));

    Refund rejected = refundService.reject(1001L);

    assertThat(rejected.status()).isEqualTo(RefundStatus.REJECTED);
    assertThat(rejected.processedAt()).isEqualTo(NOW);
    assertThat(rejected.deliveryFeeDeduction()).isNull();
    assertThat(rejected.refundedAmount()).isNull();
    verify(refundRepository).reject(1001L, NOW);
  }

  @Test
  @DisplayName("[RFD-12] 승인 환불의 승인 · 거절, 거절 환불의 승인은 각각 REFUND_ALREADY_PROCESSED")
  void processedRefundCannotBeProcessedAgain() {
    Refund approved = approved(1L, 10_000, true, 0);
    Refund rejected = requested(2L, 10_000, true).rejected(NOW.minusDays(1));
    givenRefunds(approved, rejected);

    assertError(() -> refundService.approve(1L), ErrorCode.REFUND_ALREADY_PROCESSED);
    assertError(() -> refundService.reject(1L), ErrorCode.REFUND_ALREADY_PROCESSED);
    assertError(() -> refundService.approve(2L), ErrorCode.REFUND_ALREADY_PROCESSED);
    verify(refundRepository, never()).approve(anyLong(), any(), any(), any());
    verify(refundRepository, never()).reject(anyLong(), any());
  }

  @Test
  @DisplayName("[RFD-13] VIP 회원 160,000원 주문에서 160,000원 전체 환불 승인은 전체 환불, 차감 0원")
  void fullRefundHasNoDeduction() {
    givenVipFreeShippingOrder(160_000);
    givenDelivery(DeliveryStatus.DELIVERED);
    givenRefunds();
    when(refundRepository.insertRequested(ORDER_ID, Money.won(160_000), false, "전체 반품", NOW))
        .thenReturn(1001L);

    Refund requested = refundService.request(ORDER_ID, Money.won(160_000), "전체 반품");
    assertThat(requested.partial()).isFalse();

    givenRefunds(requested);
    Refund approved = refundService.approve(1001L);

    assertApproved(approved, 0, 160_000);
  }

  @Test
  @DisplayName(
      "[RFD-19] 주문을 잠근 뒤 REQUESTED 조건 UPDATE 가 바꾼 행이 없으면 승인 · 거절은 REFUND_ALREADY_PROCESSED")
  void conditionalUpdateMissIsAlreadyProcessed() {
    givenVipFreeShippingOrder(160_000);
    givenRefunds(requested(1001L, 20_000, true));
    when(refundRepository.approve(anyLong(), any(), any(), any())).thenReturn(0);
    when(refundRepository.reject(anyLong(), any())).thenReturn(0);

    assertError(() -> refundService.approve(1001L), ErrorCode.REFUND_ALREADY_PROCESSED);
    assertError(() -> refundService.reject(1001L), ErrorCode.REFUND_ALREADY_PROCESSED);
    verify(orderService, times(2)).getSummaryForUpdate(ORDER_ID);
  }

  private void givenOrder(OrderStatus status, long productAmount, long deliveryFee) {
    when(orderService.getSummaryForUpdate(ORDER_ID))
        .thenReturn(
            new OrderSummary(
                ORDER_ID,
                MEMBER_ID,
                status,
                Money.won(productAmount),
                Money.won(deliveryFee),
                Money.won(productAmount + deliveryFee)));
  }

  private void givenVipFreeShippingOrder(long productAmount) {
    givenOrder(OrderStatus.PAID, productAmount, 0);
    givenMemberGrade(MemberGrade.VIP);
  }

  private void givenMemberGrade(MemberGrade grade) {
    when(memberService.getSummary(MEMBER_ID))
        .thenReturn(new MemberSummary(MEMBER_ID, grade, MemberStatus.ACTIVE));
  }

  private void givenDelivery(DeliveryStatus status) {
    when(deliveryService.statusOfOrder(ORDER_ID)).thenReturn(status);
  }

  private void givenRefunds(Refund... refunds) {
    refundsOfOrder.clear();
    refundsOfOrder.addAll(List.of(refunds));
    when(refundRepository.findByOrderId(ORDER_ID)).thenReturn(List.copyOf(refundsOfOrder));
    for (Refund refund : refunds) {
      when(refundRepository.findById(refund.id())).thenReturn(Optional.of(refund));
    }
  }

  private static Refund requested(long id, long amount, boolean partial) {
    return new Refund(
        id,
        ORDER_ID,
        Money.won(amount),
        partial,
        "사유",
        RefundStatus.REQUESTED,
        null,
        null,
        NOW.minusHours(1),
        null);
  }

  private static Refund approved(long id, long amount, boolean partial, long deduction) {
    return requested(id, amount, partial)
        .approved(Money.won(deduction), Money.won(amount - deduction), NOW.minusMinutes(30));
  }

  private void assertApproved(Refund refund, long deduction, long refunded) {
    assertThat(refund.status()).isEqualTo(RefundStatus.APPROVED);
    assertThat(refund.deliveryFeeDeduction()).isEqualTo(Money.won(deduction));
    assertThat(refund.refundedAmount()).isEqualTo(Money.won(refunded));
    assertThat(refund.processedAt()).isEqualTo(NOW);
    verify(refundRepository).approve(refund.id(), Money.won(deduction), Money.won(refunded), NOW);
  }

  private void verifyNothingInserted() {
    verify(refundRepository, never())
        .insertRequested(anyLong(), any(), anyBoolean(), anyString(), any());
  }

  private static void assertError(Runnable action, ErrorCode expected) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(
            BusinessException.class, e -> assertThat(e.errorCode()).isEqualTo(expected));
  }
}
