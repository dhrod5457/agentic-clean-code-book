package com.example.shop.controller;

import com.example.shop.domain.Staff;
import com.example.shop.dto.staff.LoginRequest;
import com.example.shop.dto.staff.SessionUserResponse;
import com.example.shop.service.SessionUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final SessionUserService sessionUserService;

  public AuthController(SessionUserService sessionUserService) {
    this.sessionUserService = sessionUserService;
  }

  @PostMapping("/login")
  public SessionUserResponse login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
    Staff staff = sessionUserService.authenticate(request.loginId(), request.password());
    HttpSession previous = httpRequest.getSession(false);
    if (previous != null) {
      previous.invalidate();
    }
    httpRequest.getSession(true).setAttribute(SessionUserService.SESSION_STAFF_ID, staff.id());
    return SessionUserResponse.from(staff);
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
    HttpSession session = httpRequest.getSession(false);
    if (session != null) {
      session.invalidate();
    }
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  public SessionUserResponse me(@AuthenticationPrincipal Staff staff) {
    return SessionUserResponse.from(staff);
  }
}
