package com.example.shop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/** 로그인은 관리자 계정 표로 직접 처리하므로 기본 사용자 계정을 만들지 않는다. */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ShopApplication {

  public static void main(String[] args) {
    SpringApplication.run(ShopApplication.class, args);
  }
}
