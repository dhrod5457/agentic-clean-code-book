package com.example.shop.config;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

  public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

  /** {@code shop.clock.fixed-instant} 가 있으면 그 시각에 고정하고, 비어 있으면 시스템 시계를 쓴다. */
  @Bean
  public Clock clock(@Value("${shop.clock.fixed-instant:}") String fixedInstant) {
    if (fixedInstant.isBlank()) {
      return Clock.system(ZONE);
    }
    return Clock.fixed(OffsetDateTime.parse(fixedInstant).toInstant(), ZONE);
  }
}
