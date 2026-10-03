package com.example.shop.service;

import static com.example.shop.support.TestFixtures.CLOCK;
import static com.example.shop.support.TestFixtures.NOW;
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
import com.example.shop.common.money.Money;
import com.example.shop.domain.Delivery;
import com.example.shop.domain.DeliveryStatus;
import com.example.shop.repository.DeliveryRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DeliveryServiceTest {

  private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
  private final DeliveryService deliveryService = new DeliveryService(deliveryRepository, CLOCK);

  @Test
  @DisplayName("[DLV-05] 출고 대기 배송을 배송 중으로 바꾸면 shippedAt 이 현재 시각")
  void readyToShipped() {
    givenDelivery(1L, DeliveryStatus.READY);

    Delivery result = deliveryService.changeStatus(1L, DeliveryStatus.SHIPPED);

    assertThat(result.status()).isEqualTo(DeliveryStatus.SHIPPED);
    assertThat(result.shippedAt()).isEqualTo(NOW);
    verify(deliveryRepository).markShipped(1L, NOW);
  }

  @Test
  @DisplayName("[DLV-06] 배송 중 배송을 배송 완료로 바꾸면 deliveredAt 이 현재 시각")
  void shippedToDelivered() {
    givenDelivery(1L, DeliveryStatus.SHIPPED);

    Delivery result = deliveryService.changeStatus(1L, DeliveryStatus.DELIVERED);

    assertThat(result.status()).isEqualTo(DeliveryStatus.DELIVERED);
    assertThat(result.deliveredAt()).isEqualTo(NOW);
    verify(deliveryRepository).markDelivered(1L, NOW);
  }

  @Test
  @DisplayName(
      "[DLV-07] READY→DELIVERED, DELIVERED→SHIPPED, SHIPPED→READY 는 DELIVERY_STATE_INVALID")
  void invalidTransitions() {
    givenDelivery(1L, DeliveryStatus.READY);
    givenDelivery(2L, DeliveryStatus.DELIVERED);
    givenDelivery(3L, DeliveryStatus.SHIPPED);

    assertStateInvalid(1L, DeliveryStatus.DELIVERED);
    assertStateInvalid(2L, DeliveryStatus.SHIPPED);
    assertStateInvalid(3L, DeliveryStatus.READY);
    verify(deliveryRepository, never()).markShipped(anyLong(), any());
    verify(deliveryRepository, never()).markDelivered(anyLong(), any());
  }

  private void assertStateInvalid(long id, DeliveryStatus target) {
    assertThatThrownBy(() -> deliveryService.changeStatus(id, target))
        .isInstanceOfSatisfying(
            BusinessException.class,
            e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.DELIVERY_STATE_INVALID));
  }

  private void givenDelivery(long id, DeliveryStatus status) {
    when(deliveryRepository.findById(id))
        .thenReturn(
            Optional.of(
                new Delivery(
                    id, 100L + id, status, Money.won(3_000), NOW.minusDays(1), null, null)));
  }
}
