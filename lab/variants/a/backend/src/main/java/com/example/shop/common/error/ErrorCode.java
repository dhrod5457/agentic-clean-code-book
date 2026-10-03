package com.example.shop.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
  VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "요청 값이 올바르지 않습니다."),
  AUTH_REQUIRED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
  AUTH_FAILED(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
  ACCESS_DENIED(HttpStatus.FORBIDDEN, "권한이 없습니다."),
  MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."),
  MEMBER_WITHDRAWN(HttpStatus.CONFLICT, "탈퇴한 회원입니다."),
  MEMBER_NOT_ORDERABLE(HttpStatus.CONFLICT, "주문할 수 없는 회원 상태입니다."),
  ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."),
  ORDER_STATE_INVALID(HttpStatus.CONFLICT, "결제 대기 상태의 주문만 결제할 수 있습니다."),
  ORDER_PAYMENT_EXPIRED(HttpStatus.CONFLICT, "결제 기한이 지난 주문입니다."),
  DELIVERY_NOT_FOUND(HttpStatus.NOT_FOUND, "배송을 찾을 수 없습니다."),
  DELIVERY_STATE_INVALID(HttpStatus.CONFLICT, "변경할 수 없는 배송 상태입니다."),
  REFUND_NOT_FOUND(HttpStatus.NOT_FOUND, "환불을 찾을 수 없습니다."),
  REFUND_ORDER_NOT_PAID(HttpStatus.CONFLICT, "결제 완료된 주문만 환불을 요청할 수 있습니다."),
  REFUND_STATE_INVALID(HttpStatus.CONFLICT, "배송 중인 주문은 환불을 요청할 수 없습니다."),
  REFUND_ALREADY_REQUESTED(HttpStatus.CONFLICT, "처리 중인 환불 요청이 있습니다."),
  REFUND_AMOUNT_EXCEEDED(HttpStatus.CONFLICT, "환불 가능 금액을 넘었습니다."),
  REFUND_ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리된 환불입니다."),
  STAFF_NOT_FOUND(HttpStatus.NOT_FOUND, "관리자 계정을 찾을 수 없습니다."),
  STAFF_LOGIN_ID_DUPLICATED(HttpStatus.CONFLICT, "이미 사용 중인 로그인 ID 입니다."),
  NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 경로를 찾을 수 없습니다."),
  METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다."),
  INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");

  private final HttpStatus status;
  private final String message;

  ErrorCode(HttpStatus status, String message) {
    this.status = status;
    this.message = message;
  }

  public HttpStatus status() {
    return status;
  }

  public String message() {
    return message;
  }
}
