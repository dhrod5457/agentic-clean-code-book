package com.example.shop.controller;

import com.example.shop.dto.order.OrderDetailResponse;
import com.example.shop.dto.order.OrderPreviewResponse;
import com.example.shop.dto.order.OrderRequest;
import com.example.shop.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 고객 주문 API. 고객 로그인이 없으므로 인증하지 않는다. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

  private final OrderService orderService;

  public OrderController(OrderService orderService) {
    this.orderService = orderService;
  }

  @PostMapping("/preview")
  public OrderPreviewResponse preview(@Valid @RequestBody OrderRequest request) {
    return OrderPreviewResponse.of(
        request.memberId(), orderService.preview(request.memberId(), request.toLines()));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public OrderDetailResponse create(@Valid @RequestBody OrderRequest request) {
    return OrderDetailResponse.from(orderService.create(request.memberId(), request.toLines()));
  }

  @PostMapping("/{id}/pay")
  public OrderDetailResponse pay(@PathVariable long id) {
    return OrderDetailResponse.from(orderService.pay(id));
  }
}
