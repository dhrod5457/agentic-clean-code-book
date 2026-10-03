package com.example.shop.controller;

import static com.example.shop.support.TestFixtures.NOW;
import static com.example.shop.support.TestFixtures.order;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.common.money.Money;
import com.example.shop.controller.admin.OrderAdminController;
import com.example.shop.domain.Order;
import com.example.shop.domain.OrderLine;
import com.example.shop.domain.OrderStatus;
import com.example.shop.service.OrderExpiryService;
import com.example.shop.service.OrderService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(OrderAdminController.class)
class OrderAdminControllerTest extends WebSliceTestSupport {

  @MockitoBean OrderService orderService;
  @MockitoBean OrderExpiryService orderExpiryService;

  @Test
  @DisplayName("[ORD-11] 주문 상세는 OrderDetail 이고 lineAmount 는 unitPrice × quantity")
  void orderDetail() throws Exception {
    when(orderService.get(1001L))
        .thenReturn(
            new Order(
                1001L,
                4L,
                OrderStatus.PENDING_PAYMENT,
                Money.won(327_000),
                Money.ZERO,
                Money.won(327_000),
                NOW,
                null,
                null,
                List.of(
                    new OrderLine(1L, "27인치 모니터", Money.won(289_000), 1),
                    new OrderLine(2L, "데스크 매트", Money.won(19_000), 2))));

    mockMvc
        .perform(get("/api/admin/orders/1001").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1001))
        .andExpect(jsonPath("$.memberId").value(4))
        .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
        .andExpect(jsonPath("$.productAmount").value(327000))
        .andExpect(jsonPath("$.deliveryFee").value(0))
        .andExpect(jsonPath("$.totalAmount").value(327000))
        .andExpect(jsonPath("$.createdAt").value("2026-01-15T10:00:00+09:00"))
        .andExpect(jsonPath("$.paidAt").isEmpty())
        .andExpect(jsonPath("$.expiredAt").isEmpty())
        .andExpect(jsonPath("$.lines.length()").value(2))
        .andExpect(jsonPath("$.lines[0].productName").value("27인치 모니터"))
        .andExpect(jsonPath("$.lines[0].unitPrice").value(289000))
        .andExpect(jsonPath("$.lines[0].quantity").value(1))
        .andExpect(jsonPath("$.lines[0].lineAmount").value(289000))
        .andExpect(jsonPath("$.lines[1].quantity").value(2))
        .andExpect(jsonPath("$.lines[1].lineAmount").value(38000));
  }

  @Test
  @DisplayName("[ORD-15] 주문 목록은 ID 내림차순 배열")
  void listOrders() throws Exception {
    when(orderService.findAll())
        .thenReturn(
            List.of(
                order(1002L, 4L, OrderStatus.PAID, 100_000, 3_000, NOW),
                order(1001L, 4L, OrderStatus.PENDING_PAYMENT, 50_000, 3_000, NOW)));

    mockMvc
        .perform(get("/api/admin/orders").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].id").value(1002))
        .andExpect(jsonPath("$[1].id").value(1001))
        .andExpect(jsonPath("$[0].lines").doesNotExist())
        .andExpect(jsonPath("$[0].totalAmount").value(103000));
  }
}
