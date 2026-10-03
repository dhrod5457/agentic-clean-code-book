package com.example.shop.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CheckoutFlowIT extends FlowTestSupport {

  @Test
  @DisplayName("[FLW-01] VIP 회원 308,000원 주문 생성 → 결제 → 주문 결제 완료, 배송 출고 대기, 배송비 0원")
  void vipCheckout() throws Exception {
    long orderId =
        createOrder(
            VIP_MEMBER_ID,
            """
            [{"productName": "27인치 모니터", "unitPrice": 289000, "quantity": 1},
             {"productName": "데스크 매트", "unitPrice": 19000, "quantity": 1}]
            """);

    mockMvc
        .perform(post("/api/orders/{id}/pay", orderId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAID"))
        .andExpect(jsonPath("$.productAmount").value(308000))
        .andExpect(jsonPath("$.deliveryFee").value(0))
        .andExpect(jsonPath("$.totalAmount").value(308000))
        .andExpect(jsonPath("$.paidAt").value("2026-01-15T10:00:00+09:00"));

    var admin = loginAsAdmin();
    mockMvc
        .perform(get("/api/admin/orders/{id}", orderId).session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAID"));
    String delivery = "$[?(@.orderId == %d)]".formatted(orderId);
    mockMvc
        .perform(get("/api/admin/deliveries").session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath(delivery + ".status").value("READY"))
        .andExpect(jsonPath(delivery + ".fee").value(0));
  }
}
