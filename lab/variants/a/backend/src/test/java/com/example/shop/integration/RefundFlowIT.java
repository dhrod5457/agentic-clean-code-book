package com.example.shop.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;

class RefundFlowIT extends FlowTestSupport {

  @Test
  @DisplayName("[FLW-02] VIP 회원 160,000원 주문 → 결제 → 20,000원 환불 요청 → 승인 → 차감 3,000원, 환불 17,000원")
  void partialRefundDeductsDeliveryFee() throws Exception {
    long orderId =
        createOrder(
            VIP_MEMBER_ID,
            "[{\"productName\": \"무선 이어폰\", \"unitPrice\": 160000, \"quantity\": 1}]");
    mockMvc
        .perform(post("/api/orders/{id}/pay", orderId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.deliveryFee").value(0));
    MockHttpSession admin = loginAsAdmin();

    MvcResult requested =
        mockMvc
            .perform(
                post("/api/admin/refunds")
                    .session(admin)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"orderId\":%d,\"amount\":20000,\"reason\":\"단순 변심\"}"
                            .formatted(orderId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("REQUESTED"))
            .andExpect(jsonPath("$.partial").value(true))
            .andReturn();

    mockMvc
        .perform(post("/api/admin/refunds/{id}/approve", idOf(requested)).session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APPROVED"))
        .andExpect(jsonPath("$.deliveryFeeDeduction").value(3000))
        .andExpect(jsonPath("$.refundedAmount").value(17000))
        .andExpect(jsonPath("$.processedAt").value("2026-01-15T10:00:00+09:00"));
  }
}
