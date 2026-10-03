package com.example.shop.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.domain.MemberSummary;
import com.example.shop.repository.OrderRepository;
import com.example.shop.service.DeliveryFeePolicy;
import com.example.shop.service.DeliveryService;
import com.example.shop.service.MemberService;
import com.example.shop.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** 실제 {@link OrderService} 와 {@link DeliveryFeePolicy} 를 쓰고 저장소와 다른 영역만 바꿔 끼운다. */
@WebMvcTest(OrderController.class)
@Import({OrderService.class, DeliveryFeePolicy.class})
class OrderControllerTest extends WebSliceTestSupport {

  @MockitoBean OrderRepository orderRepository;
  @MockitoBean MemberService memberService;
  @MockitoBean DeliveryService deliveryService;

  @Test
  @DisplayName("[ORD-03] 주문 금액 미리보기는 200, 금액 3개를 돌려주고 주문을 저장하지 않는다")
  void previewDoesNotSave() throws Exception {
    when(memberService.getSummary(4L))
        .thenReturn(new MemberSummary(4L, MemberGrade.VIP, MemberStatus.ACTIVE));

    mockMvc
        .perform(
            post("/api/orders/preview")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"memberId": 4, "lines": [
                      {"productName": "27인치 모니터", "unitPrice": 289000, "quantity": 1},
                      {"productName": "데스크 매트", "unitPrice": 19000, "quantity": 1}
                    ]}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.memberId").value(4))
        .andExpect(jsonPath("$.productAmount").value(308000))
        .andExpect(jsonPath("$.deliveryFee").value(0))
        .andExpect(jsonPath("$.totalAmount").value(308000));
    verify(orderRepository, never()).insert(anyLong(), any(), any(), any(), any(), anyList());
    verifyNoInteractions(deliveryService);
  }

  @Test
  @DisplayName(
      "[ORD-17] 일반 회원 단가 9223372036854775807 × 1 주문은 배송비를 더하면 범위를 넘으므로 400 VALIDATION_FAILED")
  void totalAmountOverflow() throws Exception {
    when(memberService.getSummary(1L))
        .thenReturn(new MemberSummary(1L, MemberGrade.GENERAL, MemberStatus.ACTIVE));
    String body =
        """
        {"memberId": 1, "lines": [
          {"productName": "상품", "unitPrice": 9223372036854775807, "quantity": 1}
        ]}
        """;

    mockMvc
        .perform(post("/api/orders/preview").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    mockMvc
        .perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    verify(orderRepository, never()).insert(anyLong(), any(), any(), any(), any(), anyList());
  }

  @Test
  @DisplayName("[ORD-04] 단가 -1 인 주문 생성은 400 VALIDATION_FAILED")
  void negativeUnitPrice() throws Exception {
    mockMvc
        .perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"memberId": 4, "lines": [
                      {"productName": "상품", "unitPrice": -1, "quantity": 1}
                    ]}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    verifyNoInteractions(orderRepository, memberService);
  }

  @Test
  @DisplayName("[ORD-05] memberId 없는 주문 생성은 400 VALIDATION_FAILED")
  void missingMemberId() throws Exception {
    mockMvc
        .perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"lines": [{"productName": "상품", "unitPrice": 1000, "quantity": 1}]}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    verifyNoInteractions(orderRepository, memberService);
  }
}
