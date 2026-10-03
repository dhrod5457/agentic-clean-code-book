package com.example.shop.common.error;

public record ErrorResponse(String code, String message) {

  public static ErrorResponse of(ErrorCode errorCode) {
    return new ErrorResponse(errorCode.name(), errorCode.message());
  }
}
