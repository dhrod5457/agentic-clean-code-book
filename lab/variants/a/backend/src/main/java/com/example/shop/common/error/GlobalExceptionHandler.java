package com.example.shop.common.error;

import jakarta.validation.ConstraintViolationException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
    return warn(e.errorCode());
  }

  // 예외 메시지에는 요청 본문 일부가 들어갈 수 있으므로 로그에 남기지 않는다.
  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    HandlerMethodValidationException.class,
    ConstraintViolationException.class,
    HttpMessageNotReadableException.class,
    HttpMediaTypeNotSupportedException.class,
    MethodArgumentTypeMismatchException.class
  })
  public ResponseEntity<ErrorResponse> handleValidation(Exception e) {
    return warn(ErrorCode.VALIDATION_FAILED);
  }

  @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
  public ResponseEntity<ErrorResponse> handleNotFound(Exception e) {
    return warn(ErrorCode.NOT_FOUND);
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ErrorResponse> handleMethodNotAllowed(Exception e) {
    return warn(ErrorCode.METHOD_NOT_ALLOWED);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
    log.error("system error code={}", ErrorCode.INTERNAL_ERROR.name(), e);
    return response(ErrorCode.INTERNAL_ERROR);
  }

  private ResponseEntity<ErrorResponse> warn(ErrorCode errorCode) {
    log.warn("business error code={} message={}", errorCode.name(), errorCode.message());
    return response(errorCode);
  }

  private ResponseEntity<ErrorResponse> response(ErrorCode errorCode) {
    return ResponseEntity.status(errorCode.status())
        .contentType(new MediaType(MediaType.APPLICATION_JSON, StandardCharsets.UTF_8))
        .body(ErrorResponse.of(errorCode));
  }
}
