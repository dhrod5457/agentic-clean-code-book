package com.example.shop.dto.order;

import com.example.shop.common.money.Money;
import com.example.shop.domain.OrderLine;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record OrderLineRequest(
    @NotBlank @Size(max = 100) String productName,
    @NotNull @PositiveOrZero Long unitPrice,
    @NotNull @Min(1) Integer quantity) {

  public OrderLine toLine() {
    return OrderLine.of(productName, Money.won(unitPrice), quantity);
  }
}
