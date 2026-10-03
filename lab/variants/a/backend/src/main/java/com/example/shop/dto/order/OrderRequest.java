package com.example.shop.dto.order;

import com.example.shop.domain.OrderLine;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** 주문 미리보기와 주문 생성이 같이 받는 본문. */
public record OrderRequest(
    @NotNull Long memberId, @NotEmpty List<@NotNull @Valid OrderLineRequest> lines) {

  public List<OrderLine> toLines() {
    return lines.stream().map(OrderLineRequest::toLine).toList();
  }
}
