package com.example.shop.controller.admin;

import com.example.shop.common.money.Money;
import com.example.shop.dto.refund.RefundRequest;
import com.example.shop.dto.refund.RefundResponse;
import com.example.shop.service.RefundService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/refunds")
public class RefundAdminController {

  private final RefundService refundService;

  public RefundAdminController(RefundService refundService) {
    this.refundService = refundService;
  }

  @GetMapping
  public List<RefundResponse> list() {
    return refundService.findAll().stream().map(RefundResponse::from).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public RefundResponse request(@Valid @RequestBody RefundRequest request) {
    return RefundResponse.from(
        refundService.request(request.orderId(), Money.won(request.amount()), request.reason()));
  }

  @PostMapping("/{id}/approve")
  public RefundResponse approve(@PathVariable long id) {
    return RefundResponse.from(refundService.approve(id));
  }

  @PostMapping("/{id}/reject")
  public RefundResponse reject(@PathVariable long id) {
    return RefundResponse.from(refundService.reject(id));
  }
}
