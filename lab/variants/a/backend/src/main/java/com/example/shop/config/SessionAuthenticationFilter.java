package com.example.shop.config;

import com.example.shop.domain.Staff;
import com.example.shop.service.SessionUserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** 세션의 관리자 계정 ID 로 요청마다 계정을 다시 읽어 인증 정보를 만든다. 역할 변경과 비활성화가 다음 요청부터 바로 적용된다. */
class SessionAuthenticationFilter extends OncePerRequestFilter {

  private final SessionUserService sessionUserService;

  SessionAuthenticationFilter(SessionUserService sessionUserService) {
    this.sessionUserService = sessionUserService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    HttpSession session = request.getSession(false);
    if (session != null
        && session.getAttribute(SessionUserService.SESSION_STAFF_ID) instanceof Long staffId) {
      sessionUserService.findActive(staffId).ifPresent(SessionAuthenticationFilter::authenticate);
    }
    chain.doFilter(request, response);
  }

  private static void authenticate(Staff staff) {
    var authorities =
        staff.role().permissions().stream()
            .map(permission -> new SimpleGrantedAuthority(permission.name()))
            .toList();
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(
        UsernamePasswordAuthenticationToken.authenticated(staff, null, authorities));
    SecurityContextHolder.setContext(context);
  }
}
