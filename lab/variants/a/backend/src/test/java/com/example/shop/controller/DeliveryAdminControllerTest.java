package com.example.shop.controller;

import static com.example.shop.support.TestFixtures.NOW;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.common.money.Money;
import com.example.shop.controller.admin.DeliveryAdminController;
import com.example.shop.domain.Delivery;
import com.example.shop.domain.DeliveryStatus;
import com.example.shop.service.DeliveryFeePolicy;
import com.example.shop.service.DeliveryService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.json.JsonCompareMode;

@WebMvcTest(DeliveryAdminController.class)
@Import(DeliveryFeePolicy.class)
class DeliveryAdminControllerTest extends WebSliceTestSupport {

  @MockitoBean DeliveryService deliveryService;

  @Test
  @DisplayName("[DLV-04] 배송 정책 조회는 기본 배송비 3000, VIP 무료배송 기준 150000")
  void deliveryPolicy() throws Exception {
    mockMvc
        .perform(get("/api/admin/delivery-policy").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(
            content()
                .json(
                    "{\"baseFee\":3000,\"vipFreeShippingThreshold\":150000}",
                    JsonCompareMode.STRICT));
  }

  @Test
  @DisplayName("[DLV-08] 배송 상태 변경 본문 LOST 는 400 VALIDATION_FAILED")
  void unknownDeliveryStatus() throws Exception {
    mockMvc
        .perform(
            patch("/api/admin/deliveries/1/status")
                .session(loginAsAdmin())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"LOST\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    verify(deliveryService, never()).changeStatus(anyLong(), any());
  }

  @Test
  @DisplayName("[DLV-09] 배송 목록은 ID 내림차순 배열, 각 항목에 배송 응답 필드")
  void listDeliveries() throws Exception {
    when(deliveryService.findAll())
        .thenReturn(
            List.of(
                new Delivery(100L, 112L, DeliveryStatus.SHIPPED, Money.won(3_000), NOW, NOW, null),
                new Delivery(99L, 111L, DeliveryStatus.READY, Money.ZERO, NOW, null, null)));

    mockMvc
        .perform(get("/api/admin/deliveries").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].id").value(100))
        .andExpect(jsonPath("$[1].id").value(99))
        .andExpect(jsonPath("$[0].orderId").value(112))
        .andExpect(jsonPath("$[0].status").value("SHIPPED"))
        .andExpect(jsonPath("$[0].fee").value(3000))
        .andExpect(jsonPath("$[0].createdAt").value("2026-01-15T10:00:00+09:00"))
        .andExpect(jsonPath("$[0].shippedAt").value("2026-01-15T10:00:00+09:00"))
        .andExpect(jsonPath("$[0].deliveredAt").isEmpty());
  }

  @Test
  @DisplayName("[AUT-06] 운영자는 출고 대기 배송을 배송 중으로 바꿀 수 있다")
  void operatorCanShip() throws Exception {
    when(deliveryService.changeStatus(100L, DeliveryStatus.SHIPPED))
        .thenReturn(
            new Delivery(100L, 112L, DeliveryStatus.SHIPPED, Money.won(3_000), NOW, NOW, null));

    mockMvc
        .perform(
            patch("/api/admin/deliveries/100/status")
                .session(loginAsOperator())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SHIPPED\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SHIPPED"));
  }
}
