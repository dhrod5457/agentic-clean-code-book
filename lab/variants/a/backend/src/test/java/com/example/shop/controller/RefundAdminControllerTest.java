package com.example.shop.controller;

import static com.example.shop.support.TestFixtures.NOW;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.common.money.Money;
import com.example.shop.controller.admin.RefundAdminController;
import com.example.shop.domain.Refund;
import com.example.shop.domain.RefundStatus;
import com.example.shop.service.RefundService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(RefundAdminController.class)
class RefundAdminControllerTest extends WebSliceTestSupport {

  @MockitoBean RefundService refundService;

  @Test
  @DisplayName("[RFD-14] 환불 목록은 ID 내림차순 배열")
  void listRefunds() throws Exception {
    Refund requested =
        new Refund(
            1002L,
            1001L,
            Money.won(20_000),
            true,
            "단순 변심",
            RefundStatus.REQUESTED,
            null,
            null,
            NOW,
            null);
    Refund approved =
        new Refund(
                1001L,
                1000L,
                Money.won(20_000),
                true,
                "상품 불량",
                RefundStatus.REQUESTED,
                null,
                null,
                NOW,
                null)
            .approved(Money.won(3_000), Money.won(17_000), NOW);
    when(refundService.findAll()).thenReturn(List.of(requested, approved));

    mockMvc
        .perform(get("/api/admin/refunds").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].id").value(1002))
        .andExpect(jsonPath("$[1].id").value(1001))
        .andExpect(jsonPath("$[0].deliveryFeeDeduction").isEmpty())
        .andExpect(jsonPath("$[0].refundedAmount").isEmpty())
        .andExpect(jsonPath("$[1].deliveryFeeDeduction").value(3000))
        .andExpect(jsonPath("$[1].refundedAmount").value(17000));
  }

  @Test
  @DisplayName("[RFD-16] 환불 요청 사유가 빈 문자열이면 400 VALIDATION_FAILED")
  void emptyReason() throws Exception {
    mockMvc
        .perform(
            post("/api/admin/refunds")
                .session(loginAsAdmin())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"orderId\":1001,\"amount\":20000,\"reason\":\"\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    verifyNoInteractions(refundService);
  }
}
