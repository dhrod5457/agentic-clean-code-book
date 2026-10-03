package com.example.shop.controller.admin;

import com.example.shop.dto.order.ExpireOverdueResponse;
import com.example.shop.dto.order.OrderDetailResponse;
import com.example.shop.dto.order.OrderSummaryResponse;
import com.example.shop.service.OrderExpiryService;
import com.example.shop.service.OrderService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/orders")
public class OrderAdminController {

  private final OrderService orderService;
  private final OrderExpiryService orderExpiryService;

  public OrderAdminController(OrderService orderService, OrderExpiryService orderExpiryService) {
    this.orderService = orderService;
    this.orderExpiryService = orderExpiryService;
  }

  @GetMapping
  public List<OrderSummaryResponse> list() {
    return orderService.findAll().stream().map(OrderSummaryResponse::from).toList();
  }

  @GetMapping("/{id}")
  public OrderDetailResponse get(@PathVariable long id) {
    return OrderDetailResponse.from(orderService.get(id));
  }

  @PostMapping("/expire-overdue")
  public ExpireOverdueResponse expireOverdue() {
    return new ExpireOverdueResponse(orderExpiryService.expireOverdue());
  }
}
