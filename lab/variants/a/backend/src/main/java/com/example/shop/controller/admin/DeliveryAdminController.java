package com.example.shop.controller.admin;

import com.example.shop.dto.delivery.DeliveryPolicyResponse;
import com.example.shop.dto.delivery.DeliveryResponse;
import com.example.shop.dto.delivery.DeliveryStatusChangeRequest;
import com.example.shop.service.DeliveryFeePolicy;
import com.example.shop.service.DeliveryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class DeliveryAdminController {

  private final DeliveryService deliveryService;
  private final DeliveryFeePolicy deliveryFeePolicy;

  public DeliveryAdminController(
      DeliveryService deliveryService, DeliveryFeePolicy deliveryFeePolicy) {
    this.deliveryService = deliveryService;
    this.deliveryFeePolicy = deliveryFeePolicy;
  }

  @GetMapping("/deliveries")
  public List<DeliveryResponse> list() {
    return deliveryService.findAll().stream().map(DeliveryResponse::from).toList();
  }

  @PatchMapping("/deliveries/{id}/status")
  public DeliveryResponse changeStatus(
      @PathVariable long id, @Valid @RequestBody DeliveryStatusChangeRequest request) {
    return DeliveryResponse.from(deliveryService.changeStatus(id, request.status()));
  }

  @GetMapping("/delivery-policy")
  public DeliveryPolicyResponse policy() {
    return new DeliveryPolicyResponse(
        deliveryFeePolicy.baseFee().value(), deliveryFeePolicy.vipFreeShippingThreshold().value());
  }
}
