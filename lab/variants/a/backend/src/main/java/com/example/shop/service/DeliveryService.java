package com.example.shop.service;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.common.money.Money;
import com.example.shop.domain.Delivery;
import com.example.shop.domain.DeliveryStatus;
import com.example.shop.repository.DeliveryRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryService {

  private final DeliveryRepository deliveryRepository;
  private final Clock clock;

  public DeliveryService(DeliveryRepository deliveryRepository, Clock clock) {
    this.deliveryRepository = deliveryRepository;
    this.clock = clock;
  }

  public List<Delivery> findAll() {
    return deliveryRepository.findAll();
  }

  /** {@code READY → SHIPPED}, {@code SHIPPED → DELIVERED} 만 허용한다. 주문 상태는 바꾸지 않는다. */
  @Transactional
  public Delivery changeStatus(long id, DeliveryStatus target) {
    Delivery delivery =
        deliveryRepository
            .findById(id)
            .orElseThrow(() -> new BusinessException(ErrorCode.DELIVERY_NOT_FOUND));
    if (!delivery.status().canChangeTo(target)) {
      throw new BusinessException(ErrorCode.DELIVERY_STATE_INVALID);
    }
    OffsetDateTime now = OffsetDateTime.now(clock);
    if (target == DeliveryStatus.SHIPPED) {
      deliveryRepository.markShipped(id, now);
      return delivery.shipped(now);
    }
    deliveryRepository.markDelivered(id, now);
    return delivery.delivered(now);
  }

  /** 결제한 주문의 배송을 {@code READY} 로 만들고 배송 ID 를 돌려준다. */
  @Transactional
  public long createForOrder(long orderId, Money fee) {
    return deliveryRepository.insertReady(orderId, fee, OffsetDateTime.now(clock));
  }

  public DeliveryStatus statusOfOrder(long orderId) {
    return deliveryRepository
        .findByOrderId(orderId)
        .map(Delivery::status)
        .orElseThrow(() -> new BusinessException(ErrorCode.DELIVERY_NOT_FOUND));
  }
}
