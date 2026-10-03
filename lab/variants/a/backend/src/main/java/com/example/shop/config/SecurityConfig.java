package com.example.shop.config;

import com.example.shop.common.error.ErrorCode;
import com.example.shop.common.error.ErrorResponse;
import com.example.shop.domain.Permission;
import com.example.shop.service.SessionUserService;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class SecurityConfig {

  /** 영역 prefix 단위 권한 규칙. {@code GET} 은 READ, 그 밖의 method 는 WRITE 권한이 필요하다. */
  private static final List<AreaRule> AREA_RULES =
      List.of(
          new AreaRule(Permission.MEMBER_READ, Permission.MEMBER_WRITE, "/api/admin/members/**"),
          new AreaRule(Permission.ORDER_READ, Permission.ORDER_WRITE, "/api/admin/orders/**"),
          new AreaRule(
              Permission.DELIVERY_READ,
              Permission.DELIVERY_WRITE,
              "/api/admin/deliveries/**",
              "/api/admin/delivery-policy"),
          new AreaRule(Permission.REFUND_READ, Permission.REFUND_WRITE, "/api/admin/refunds/**"),
          new AreaRule(Permission.STAFF_READ, Permission.STAFF_WRITE, "/api/admin/staff/**"));

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http, SessionUserService sessionUserService, JsonMapper jsonMapper) {
    http.csrf(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable)
        .requestCache(AbstractHttpConfigurer::disable)
        .securityContext(
            context ->
                context.securityContextRepository(new RequestAttributeSecurityContextRepository()))
        .addFilterBefore(
            new SessionAuthenticationFilter(sessionUserService),
            AnonymousAuthenticationFilter.class)
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(
                        (request, response, e) ->
                            writeError(response, ErrorCode.AUTH_REQUIRED, jsonMapper))
                    .accessDeniedHandler(
                        (request, response, e) ->
                            writeError(response, ErrorCode.ACCESS_DENIED, jsonMapper)))
        .authorizeHttpRequests(
            auth -> {
              auth.requestMatchers("/api/auth/login", "/api/orders/**").permitAll();
              auth.requestMatchers("/api/auth/**").authenticated();
              for (AreaRule rule : AREA_RULES) {
                auth.requestMatchers(HttpMethod.GET, rule.paths()).hasAuthority(rule.read().name());
                auth.requestMatchers(rule.paths()).hasAuthority(rule.write().name());
              }
              auth.requestMatchers("/api/admin/**").authenticated();
              auth.anyRequest().permitAll();
            });
    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
  }

  private static void writeError(
      HttpServletResponse response, ErrorCode errorCode, JsonMapper jsonMapper) throws IOException {
    response.setStatus(errorCode.status().value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.getWriter().write(jsonMapper.writeValueAsString(ErrorResponse.of(errorCode)));
  }

  private record AreaRule(Permission read, Permission write, String... paths) {}
}
