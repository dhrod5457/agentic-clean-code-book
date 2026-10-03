package com.example.shop.config;

import java.io.IOException;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.cfg.EnumFeature;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.type.LogicalType;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private static final DateTimeFormatter DATE_TIME_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");

  private final String frontendDistDir;

  public WebConfig(@Value("${shop.frontend.dist-dir:}") String frontendDistDir) {
    this.frontendDistDir = frontendDistDir;
  }

  /** {@code shop.frontend.dist-dir} 가 있을 때만 frontend build 결과를 같은 port 로 제공한다. */
  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    if (frontendDistDir.isBlank()) {
      return;
    }
    registry
        .addResourceHandler("/**")
        .addResourceLocations(Path.of(frontendDistDir).toAbsolutePath().toUri().toString())
        .resourceChain(false)
        .addResolver(new SpaFallbackResourceResolver());
  }

  /** 경로가 비어 있는 {@code /} 요청은 resource handler 가 다루지 않으므로 index.html 로 넘긴다. */
  @Override
  public void addViewControllers(ViewControllerRegistry registry) {
    if (!frontendDistDir.isBlank()) {
      registry.addViewController("/").setViewName("forward:/index.html");
    }
  }

  /** 시각은 Asia/Seoul offset 을 붙인 ISO-8601 로 쓰고, 요청 본문의 타입이 다르면 변환하지 않고 실패한다. */
  @Bean
  public JsonMapperBuilderCustomizer jsonMapperCustomizer() {
    SimpleModule timeModule =
        new SimpleModule("shop-time")
            .addSerializer(OffsetDateTime.class, new OffsetDateTimeSerializer());
    return builder ->
        builder
            .addModule(timeModule)
            .enable(EnumFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
            .withCoercionConfig(
                LogicalType.Integer,
                config ->
                    config
                        .setCoercion(CoercionInputShape.String, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail))
            .withCoercionConfig(
                LogicalType.Textual,
                config ->
                    config
                        .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail))
            .withCoercionConfig(
                LogicalType.Enum,
                config -> config.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail));
  }

  private static final class OffsetDateTimeSerializer extends ValueSerializer<OffsetDateTime> {

    @Override
    public void serialize(OffsetDateTime value, JsonGenerator gen, SerializationContext ctxt) {
      gen.writeString(DATE_TIME_FORMAT.format(value.atZoneSameInstant(ClockConfig.ZONE)));
    }
  }

  /**
   * 파일이 없으면 SPA fallback 으로 {@code index.html} 을 돌려준다. {@code /api} 경로와 마지막 경로 조각에 {@code .} 이 있는
   * 요청은 fallback 하지 않는다.
   */
  private static final class SpaFallbackResourceResolver extends PathResourceResolver {

    @Override
    protected Resource getResource(String resourcePath, Resource location) throws IOException {
      if (resourcePath.equals("api") || resourcePath.startsWith("api/")) {
        return null;
      }
      Resource resource = super.getResource(resourcePath, location);
      if (resource != null) {
        return resource;
      }
      String lastSegment = resourcePath.substring(resourcePath.lastIndexOf('/') + 1);
      if (lastSegment.contains(".")) {
        return null;
      }
      return super.getResource("index.html", location);
    }
  }
}
