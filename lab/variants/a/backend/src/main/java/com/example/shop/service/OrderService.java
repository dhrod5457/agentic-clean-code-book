package com.example.shop.service;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.common.money.Money;
import com.example.shop.domain.MemberSummary;
import com.example.shop.domain.Order;
import com.example.shop.domain.OrderLine;
import com.example.shop.domain.OrderPrice;
import com.example.shop.domain.OrderStatus;
import com.example.shop.domain.OrderSummary;
import com.example.shop.repository.OrderRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

  private final OrderRepository orderRepository;
  private final MemberService memberService;
  private final DeliveryService deliveryService;
  private final DeliveryFeePolicy deliveryFeePolicy;
  private final Clock clock;

  public OrderService(
      OrderRepository orderRepository,
      MemberService memberService,
      DeliveryService deliveryService,
      DeliveryFeePolicy deliveryFeePolicy,
      Clock clock) {
    this.orderRepository = orderRepository;
    this.memberService = memberService;
    this.deliveryService = deliveryService;
    this.deliveryFeePolicy = deliveryFeePolicy;
    this.clock = clock;
  }

  /** 주문 생성과 같은 계산을 하고 저장하지 않는다. */
  public OrderPrice preview(long memberId, List<OrderLine> lines) {
    Money productAmount =
        withinAmountRange(
            () -> lines.stream().map(OrderLine::lineAmount).reduce(Money.ZERO, Money::plus));
    MemberSummary member = memberService.getSummary(memberId);
    if (!member.isOrderable()) {
      throw new BusinessException(ErrorCode.MEMBER_NOT_ORDERABLE);
    }
    Money deliveryFee = deliveryFeePolicy.feeFor(member.grade(), productAmount);
    Money totalAmount = withinAmountRange(() -> productAmount.plus(deliveryFee));
    return new OrderPrice(productAmount, deliveryFee, totalAmount);
  }

  @Transactional
  public Order create(long memberId, List<OrderLine> lines) {
    OrderPrice price = preview(memberId, lines);
    OffsetDateTime now = OffsetDateTime.now(clock);
    long id =
        orderRepository.insert(
            memberId, price.productAmount(), price.deliveryFee(), price.totalAmount(), now, lines);
    return new Order(
        id,
        memberId,
        OrderStatus.PENDING_PAYMENT,
        price.productAmount(),
        price.deliveryFee(),
        price.totalAmount(),
        now,
        null,
        null,
        lines);
  }

  /** 모의 결제. 성공하면 주문에 저장된 배송비로 배송을 만든다. */
  @Transactional
  public Order pay(long id) {
    Order order = get(id);
    if (order.status() != OrderStatus.PENDING_PAYMENT) {
      throw new BusinessException(ErrorCode.ORDER_STATE_INVALID);
    }
    OffsetDateTime now = OffsetDateTime.now(clock);
    if (order.isPaymentOverdue(now)) {
      throw new BusinessException(ErrorCode.ORDER_PAYMENT_EXPIRED);
    }
    if (orderRepository.markPaid(id, now) == 0) {
      throw new BusinessException(ErrorCode.ORDER_STATE_INVALID);
    }
    deliveryService.createForOrder(id, order.deliveryFee());
    return order.paid(now);
  }

  public List<Order> findAll() {
    return orderRepository.findAll();
  }

  public Order get(long id) {
    return orderRepository
        .findById(id)
        .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
  }

  /** 다른 영역에서 주문 상태와 저장된 금액을 읽는다. */
  public OrderSummary getSummary(long id) {
    return get(id).toSummary();
  }

  /** 주문 행을 호출한 transaction 이 끝날 때까지 잠그고 요약을 돌려준다. 다른 영역이 같은 주문에 대한 처리를 직렬화할 때 쓴다. */
  @Transactional(propagation = Propagation.MANDATORY)
  public OrderSummary getSummaryForUpdate(long id) {
    if (!orderRepository.lockById(id)) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    }
    return getSummary(id);
  }

  /** 금액 계산이 long 범위를 넘으면 요청 값 오류로 본다. */
  private static Money withinAmountRange(Supplier<Money> calculation) {
    try {
      return calculation.get();
    } catch (ArithmeticException e) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED);
    }
  }
}
