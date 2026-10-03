# 버전 목록

이 목록의 버전을 정확히 고정해서 쓴다. 범위 지정(`^`, `~`, `latest`)을 쓰지 않는다.
이 목록 밖의 라이브러리는 추가하지 않는다.

## Backend

| 이름 | 버전 | 비고 |
|---|---|---|
| Java | 25 (Eclipse Temurin 25.0.4.1+1) | Gradle toolchain `JavaLanguageVersion.of(25)` |
| Gradle wrapper | 9.8.0 | Kotlin DSL |
| Spring Boot Gradle plugin | 4.1.1 | `org.springframework.boot` |
| Spring dependency management plugin | 1.1.7 | `io.spring.dependency-management` |
| Spotless Gradle plugin | 8.10.3 | `com.diffplug.spotless` |
| google-java-format | 1.36.1 | Spotless 설정에 `googleJavaFormat("1.36.1")` 로 명시 |
| ArchUnit | 1.5.1 | `com.tngtech.archunit:archunit-junit5` |

Spring Boot BOM 이 관리하는 라이브러리는 버전을 따로 적지 않는다. 4.1.1 BOM 기준 값은 다음과 같다.

| 이름 | BOM 버전 |
|---|---|
| JUnit Jupiter | 6.0.3 |
| AssertJ | 3.27.7 |
| H2 | 2.4.240 |

Spring Boot starter:

- `spring-boot-starter-webmvc`, `spring-boot-starter-security`, `spring-boot-starter-jdbc`, `spring-boot-starter-validation`
- 런타임: `com.h2database:h2`
- 시험: `spring-boot-starter-test`, `spring-boot-starter-webmvc-test`, `spring-boot-starter-security-test`, `org.junit.platform:junit-platform-launcher`

Spring Boot 4.1 에서 `@WebMvcTest` 는 `spring-boot-starter-webmvc-test` 에 있고 package 는 `org.springframework.boot.webmvc.test.autoconfigure` 다.

## Frontend

`package.json` 의 `packageManager` 는 `pnpm@10.34.6` 이다.

| 이름 | 버전 |
|---|---|
| Node.js | 24.21.0 |
| pnpm | 10.34.6 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| react-router | 7.18.4 |
| @tanstack/react-query | 5.104.1 |
| typescript | 6.0.3 |
| vite | 8.3.2 |
| @vitejs/plugin-react | 6.1.1 |
| vitest | 4.1.11 |
| jsdom | 29.1.1 |
| @testing-library/react | 16.3.3 |
| @testing-library/dom | 10.4.2 |
| @testing-library/jest-dom | 6.10.0 |
| @testing-library/user-event | 14.6.7 |
| @playwright/test | 1.63.0 |
| eslint | 10.12.0 |
| @eslint/js | 10.0.1 |
| typescript-eslint | 8.71.0 |
| eslint-plugin-react-hooks | 7.1.1 |
| eslint-config-prettier | 10.1.8 |
| globals | 17.13.0 |
| prettier | 3.9.9 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @types/node | 24.19.1 |
