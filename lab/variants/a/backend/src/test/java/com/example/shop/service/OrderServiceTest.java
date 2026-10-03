package com.example.shop.service;

import static com.example.shop.support.TestFixtures.CLOCK;
import static com.example.shop.support.TestFixtures.NOW;
import static com.example.shop.support.TestFixtures.order;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.common.money.Money;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.domain.MemberSummary;
import com.example.shop.domain.Order;
import com.example.shop.domain.OrderLine;
import com.example.shop.domain.OrderPrice;
import com.example.shop.domain.OrderStatus;
import com.example.shop.repository.OrderRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OrderServiceTest {

  private final OrderRepository orderRepository = mock(OrderRepository.class);
  private final MemberService memberService = mock(MemberService.class);
  private final DeliveryService deliveryService = mock(DeliveryService.class);
  private final OrderService orderService =
      new OrderService(
          orderRepository, memberService, deliveryService, new DeliveryFeePolicy(), CLOCK);

  @Test
  @DisplayName("[ORD-01] 289,000원 × 1, 19,000원 × 2 의 상품 금액은 327,000원")
  void productAmountIsSumOfLines() {
    givenMember(1L, MemberGrade.GENERAL, MemberStatus.ACTIVE);
    List<OrderLine> lines =
        List.of(
            OrderLine.of("27인치 모니터", Money.won(289_000), 1),
            OrderLine.of("데스크 매트", Money.won(19_000), 2));

    OrderPrice price = orderService.preview(1L, lines);

    assertThat(price.productAmount()).isEqualTo(Money.won(327_000));
  }

  @Test
  @DisplayName("[ORD-02] VIP 회원 308,000원 주문 생성은 배송비 0원, 결제 금액 308,000원, 결제 대기, 현재 시각")
  void vipOrderIsCreatedWithFreeShipping() {
    givenMember(4L, MemberGrade.VIP, MemberStatus.ACTIVE);
    when(orderRepository.insert(eq(4L), any(), any(), any(), any(), anyList())).thenReturn(1001L);
    List<OrderLine> lines =
        List.of(
            OrderLine.of("27인치 모니터", Money.won(289_000), 1),
            OrderLine.of("데스크 매트", Money.won(19_000), 1));

    Order order = orderService.create(4L, lines);

    assertThat(order.id()).isEqualTo(1001L);
    assertThat(order.productAmount()).isEqualTo(Money.won(308_000));
    assertThat(order.deliveryFee()).isEqualTo(Money.ZERO);
    assertThat(order.totalAmount()).isEqualTo(Money.won(308_000));
    assertThat(order.status()).isEqualTo(OrderStatus.PENDING_PAYMENT);
    assertThat(order.createdAt()).isEqualTo(NOW);
    verify(orderRepository)
        .insert(4L, Money.won(308_000), Money.ZERO, Money.won(308_000), NOW, lines);
  }

  @Test
  @DisplayName("[ORD-06] 정지 회원과 탈퇴 회원의 주문 생성은 MEMBER_NOT_ORDERABLE")
  void onlyActiveMemberCanOrder() {
    givenMember(7L, MemberGrade.GENERAL, MemberStatus.SUSPENDED);
    givenMember(13L, MemberGrade.GENERAL, MemberStatus.WITHDRAWN);
    List<OrderLine> lines = List.of(OrderLine.of("상품", Money.won(10_000), 1));

    assertError(() -> orderService.create(7L, lines), ErrorCode.MEMBER_NOT_ORDERABLE);
    assertError(() -> orderService.create(13L, lines), ErrorCode.MEMBER_NOT_ORDERABLE);
    verify(orderRepository, never()).insert(anyLong(), any(), any(), any(), any(), anyList());
  }

  @Test
  @DisplayName("[ORD-07] 생성 후 10분인 결제 대기 주문을 결제하면 결제 완료, paidAt 기록, 같은 배송비로 배송 생성")
  void payCreatesReadyDelivery() {
    givenOrder(order(1001L, 1L, OrderStatus.PENDING_PAYMENT, 100_000, 3_000, NOW.minusMinutes(10)));
    when(orderRepository.markPaid(1001L, NOW)).thenReturn(1);

    Order paid = orderService.pay(1001L);

    assertThat(paid.status()).isEqualTo(OrderStatus.PAID);
    assertThat(paid.paidAt()).isEqualTo(NOW);
    verify(orderRepository).markPaid(1001L, NOW);
    verify(deliveryService).createForOrder(1001L, Money.won(3_000));
  }

  @Test
  @DisplayName("[ORD-08] 결제 완료 주문을 결제하면 ORDER_STATE_INVALID")
  void paidOrderCannotBePaidAgain() {
    givenOrder(order(1001L, 1L, OrderStatus.PAID, 100_000, 3_000, NOW.minusMinutes(10)));

    assertError(() -> orderService.pay(1001L), ErrorCode.ORDER_STATE_INVALID);
    verifyNoInteractions(deliveryService);
  }

  @Test
  @DisplayName("[ORD-09] 생성 후 30분이 된 결제 대기 주문 결제는 ORDER_PAYMENT_EXPIRED, 상태는 그대로")
  void overduePaymentIsRejected() {
    givenOrder(order(1001L, 1L, OrderStatus.PENDING_PAYMENT, 100_000, 3_000, NOW.minusMinutes(30)));

    assertError(() -> orderService.pay(1001L), ErrorCode.ORDER_PAYMENT_EXPIRED);
    verify(orderRepository, never()).markPaid(anyLong(), any());
    verify(orderRepository, never()).markExpired(anyLong(), any());
    verifyNoInteractions(deliveryService);
  }

  @Test
  @DisplayName("[ORD-12] 배송비 3,000원으로 저장된 VIP 회원 160,000원 주문은 조회해도 배송비 3,000원")
  void storedDeliveryFeeIsNotRecalculated() {
    givenOrder(order(50L, 4L, OrderStatus.PAID, 160_000, 3_000, NOW.minusDays(3)));

    Order order = orderService.get(50L);

    assertThat(order.deliveryFee()).isEqualTo(Money.won(3_000));
    assertThat(order.totalAmount()).isEqualTo(Money.won(163_000));
    verifyNoInteractions(memberService);
  }

  @Test
  @DisplayName("[ORD-16] 상품 금액이나 결제 금액이 long 범위를 넘으면 VALIDATION_FAILED, 범위 끝 값은 그대로 계산")
  void amountOverflowIsValidationFailure() {
    givenMember(1L, MemberGrade.GENERAL, MemberStatus.ACTIVE);
    givenMember(4L, MemberGrade.VIP, MemberStatus.ACTIVE);

    assertThat(orderService.preview(1L, singleLine(Long.MAX_VALUE - 3_000)).totalAmount())
        .isEqualTo(Money.won(Long.MAX_VALUE));
    assertThat(orderService.preview(4L, singleLine(Long.MAX_VALUE)).totalAmount())
        .isEqualTo(Money.won(Long.MAX_VALUE));
    assertError(
        () -> orderService.preview(1L, singleLine(Long.MAX_VALUE - 2_999)),
        ErrorCode.VALIDATION_FAILED);
    assertError(
        () -> orderService.create(1L, singleLine(Long.MAX_VALUE)), ErrorCode.VALIDATION_FAILED);
    assertError(
        () ->
            orderService.create(
                4L,
                List.of(
                    OrderLine.of("상품", Money.won(Long.MAX_VALUE), 1),
                    OrderLine.of("상품", Money.won(1), 1))),
        ErrorCode.VALIDATION_FAILED);
    verify(orderRepository, never()).insert(anyLong(), any(), any(), any(), any(), anyList());
  }

  private static List<OrderLine> singleLine(long unitPrice) {
    return List.of(OrderLine.of("상품", Money.won(unitPrice), 1));
  }

  private void givenMember(long id, MemberGrade grade, MemberStatus status) {
    when(memberService.getSummary(id)).thenReturn(new MemberSummary(id, grade, status));
  }

  private void givenOrder(Order order) {
    when(orderRepository.findById(order.id())).thenReturn(Optional.of(order));
  }

  private static void assertError(Runnable action, ErrorCode expected) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(
            BusinessException.class, e -> assertThat(e.errorCode()).isEqualTo(expected));
  }
}
