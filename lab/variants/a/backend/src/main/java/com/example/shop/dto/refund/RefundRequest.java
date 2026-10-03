package com.example.shop.dto.refund;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RefundRequest(
    @NotNull Long orderId,
    @NotNull @Min(1) Long amount,
    @NotBlank @Size(max = 200) String reason) {}
