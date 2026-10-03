package com.example.shop.dto.delivery;

import com.example.shop.domain.DeliveryStatus;
import jakarta.validation.constraints.NotNull;

public record DeliveryStatusChangeRequest(@NotNull DeliveryStatus status) {}
