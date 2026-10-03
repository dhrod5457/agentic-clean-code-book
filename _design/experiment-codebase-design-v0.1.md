# A/B 실험 코드베이스 설계 v0.1

작성일: 2026-10-03
상태: **FROZEN** (2026-10-03, 변경 2 재확정). 판정 근거는 §20. 실험 애플리케이션 코드는 아직 없다.
실행 조건 · 예산 · 기록 · 실행 상태: `_design/experiment-execution-contract-v0.1.md` (이하 "실행 계약")
기준 커밋: `main` `2f43bcf` (PR #1 병합 시점)
입력 문서: `_research/06` ~ `_research/17`, `_research/sources.md`, `_research/02`, `_research/04`, `_research/05`

이 문서는 Agentic Clean Code 의 네 문장(찾기 쉽다, 좁게 고칠 수 있다, 바로 확인할 수 있다, 다음 작업을 망치지 않는다)을 같은 기능의 두 코드베이스로 비교하기 위한 구현 설계다.
구현 Agent 가 순서대로 따를 항목은 `_design/experiment-implementation-checklist.md` 에 따로 둔다.

---

# 1. 목적

실험이 답할 질문은 하나다.

> 사람이 리뷰하면 둘 다 받아들일 만한 코드인데, Coding Agent 가 탐색하고 수정하고 검증하고 병렬로 작업할 때 차이가 생기는가.

이 설계의 성공 조건은 B 가 이기는 것이 아니다. 다음 두 조건을 만족해야 한다.

- 실험 결과가 B 에 유리하게 나왔을 때 "처음부터 B 가 이기게 만든 실험" 이라는 반박에 차이 대장(§6.4)과 공정성 검사(§16)로 답할 수 있다
- 실험 결과가 A 에 유리하거나 차이가 없게 나왔을 때 그 결과를 그대로 기록하고 책의 주장을 좁힐 수 있다

---

# 2. 기존 연구에서 가져온 조건

## 2.1 그대로 가져온 조건

| 출처 | 조건 |
|---|---|
| `_research/13` §실험할 때 지켜야 할 것 | A 를 일부러 나쁘게 만들지 않는다. 기능 · API · 데이터는 같다. 구조 차이를 Agent 에게 알리지 않는다. 같은 모델 · 도구 · 설정. 반복 실행. 성공률 외 과정 지표 |
| `_research/14` §6 | A 만 복잡한 규칙, B 만 좋은 이름, B 만 많은 테스트, B 만 최신 framework, A 만 느린 build, 다른 instruction 을 금지한다 |
| `_research/14` §9 | B 를 먼저 만든 뒤 A 를 역설계하지 않는다. 과제 정답은 실험 저장소 밖에 둔다 |
| `_research/14` §11 | Agent 에게 실험 목적, A/B 구분, 예상 수정 파일, 정답 patch 를 주지 않는다 |
| `_research/15` §10 | 기대한 파일을 고치지 않았다는 이유만으로 실패로 판정하지 않는다 |
| `_research/15` §11, `_research/13` §성공 기준 | 결과가 반대로 나와도 기록한다 |
| `_research/16` §9 | B 도 최종 확인은 실제 애플리케이션에서 한다 |
| `_research/17` §8 | 결과를 하나의 점수로 합치지 않는다 |
| `_research/10` §3 | 중앙의 기준과 중앙의 수정 병목을 구분한다 |
| `_research/10` §4 | 자동 검사는 오래 유지할 약속만 대상으로 한다 |
| `_research/11` §9 기준 A | 사람에게 나빠지면 다시 생각한다 |

## 2.2 검토 후 바꾼 조건

기존 문서를 그대로 구현하면 공정성 반박을 버티지 못하는 지점이 네 군데 있었다.

**(1) A 의 규칙 분산은 기존 Clean Code 위반이다.**
`_research/12` 사례 1 은 A 에서 무료배송 규칙이 `OrderService`, `PromotionService`, `AdminOrderPreview`, `BatchInvoiceJob` 에 나뉘고 배치는 별도 계산식을 쓴다고 가정했다.
같은 업무 규칙을 두 곳에서 따로 계산하는 것은 DRY · SRP 위반이며 기존 Clean Code 리뷰에서 걸린다.
이 차이로 B 가 이기면 Agentic 원칙이 아니라 기존 원칙을 측정한 것이 된다.
→ 시작 시점에는 A 와 B 모두 규칙의 주인이 하나다. A 와 B 의 차이는 그 주인이 어디에 있고, 경계가 기계로 보호되는지에 둔다(§6.4 D1, D2).

**(2) B 에 버그 상태 story 를 미리 두면 정답을 준 것이다.**
`_research/12` 사례 4 와 `_research/14` §5.6 은 B 에 `LongDepartmentName` 상태가 이미 있다고 가정했다.
그 story 가 시각 기준 화면과 함께 있었다면 버그는 기준 화면을 만들 때 이미 드러났어야 한다. 앞뒤가 맞지 않는다.
→ B 에는 표준 상태(기본, 빈 목록, 오류, 로딩, 행 많음)와 상태를 만드는 fixture builder 만 둔다. 긴 부서명 상태는 Agent 가 직접 만들어야 한다. 측정 대상은 "새 상태를 만드는 비용" 이다.

**(3) Spring 에는 A 의 "중앙 API 등록 파일" 이 원래 없다.**
`_research/12` 사례 2 와 `_research/14` §7 은 A 에 `AdminApiRegistry` 를 두었다. Spring MVC 는 component scan 으로 Controller 를 등록하므로 정상적인 Spring 프로젝트에 이런 파일은 없다.
이 파일을 만들면 A 에 없는 병목을 일부러 넣는 것이다.
→ A 의 중앙 수정 지점은 실제 프로젝트에 흔한 frontend route 표 하나로 한정한다. 권한 기준(`Permission` enum, `SecurityConfig`)은 A 와 B 모두 중앙에 둔다(`_research/10` §3).

**(4) 연구 문서와 두 Variant 를 한 저장소에서 Agent 에게 보이면 실험이 오염된다.**
`_research/16` §2 는 연구 문서, A, B, 과제를 한 저장소에 두자고 했다. 작성용 저장소로는 맞지만 실험 Agent 가 그 저장소를 열면 `_research` 의 가설과 다른 Variant 를 읽을 수 있다.
→ 작성은 한 저장소(`lab/`)에서 하고, 실행용 저장소는 Variant 하나만 담아 별도로 내보낸다(§15.1).

## 2.3 기존 Clean Code 로 설명되는 부분과 아닌 부분

B 에 넣는 요소 대부분은 기존 설계 원칙으로 설명된다. 새 이름을 붙이지 않는다.

| B 요소 | 기존 개념 | Agent 사용 조건에서 달라지는 점 |
|---|---|---|
| 기능별 package | package-by-feature, 응집도 | 탐색 경로 길이로 측정할 수 있게 된다 |
| 공개 contract 와 `internal` | Parnas 의 정보 은닉 | 다른 Agent 가 내부를 읽지 않고 작업할 수 있는지로 측정한다 |
| 규칙의 주인 하나 | SRP, DRY | 시작 시점에는 A 도 같다. 차이 요소에서 제외한다 |
| 경계 자동 검사 | Architecture Fitness Function, ArchUnit | 문서를 읽지 않은 Agent 가 위반 즉시 실패 신호를 받는다 |
| 기능별 화면 등록 | 개방 · 폐쇄 원칙(OCP), plugin 구조 | 동시에 작업하는 Agent 수에 비례해 충돌 비용이 커진다. 이 부분이 Agent 조건에서 근거가 새로 생기는 곳이다 |
| UI 상태 fixture | Component-Driven Development, Storybook | 사람의 클릭 없이 Agent 가 상태를 만들 수 있는지로 측정한다 |
| 오류 코드에 기능 영역 표시 | 구조화 로그 | v0.1 에서는 B 에도 두지 않는다(§13) |

책에서 주장할 수 있는 범위는 "새 원칙" 이 아니라 "Agent 가 실행 주체일 때 기존 원칙의 비용과 이익의 균형이 바뀌는가" 다.
이 실험도 그 질문에 맞춰 설계한다.

---

# 3. 기술 스택 결정과 이유

## 3.1 결정

| 영역 | 결정 | A/B |
|---|---|---|
| 언어 · 런타임 | Java 25 LTS(Eclipse Temurin), Node.js 24 LTS | 동일 |
| Backend | Spring Boot 4.1, Spring MVC, Spring Security(session) | 동일 |
| 저장소 접근 | `JdbcClient` + 직접 작성한 SQL, H2 in-memory | 동일 |
| Build | Gradle wrapper, Kotlin DSL, 단일 module | 동일 |
| Backend 시험 | JUnit Jupiter 6(Spring Boot BOM 관리), AssertJ, `@WebMvcTest`, 일부 `@SpringBootTest`, ArchUnit | 동일(ArchUnit 규칙 내용만 다름) |
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7, TanStack Query 5 | 동일 |
| Frontend 시험 | Vitest 4(jsdom) + Testing Library, Playwright E2E | 동일 |
| UI 상태 재현 | Storybook 10(CSF) + Vitest browser mode(Playwright Chromium) | B 만. 차이 대장 D5 |
| Package manager | pnpm 10, lockfile 고정 | 동일 |
| Lint | ESLint, Prettier, Spotless(google-java-format) | 동일(경계 규칙 한 개만 B 에 추가) |

정확한 버전은 §3.4, 호환 확인 결과는 §3.5 에 있다.

## 3.2 평가

| 관점 | 판단 |
|---|---|
| 프로젝트 크기 | backend 운영 코드 60~90 파일, frontend 60~90 파일 규모를 목표로 한다. 사람이 diff 를 전부 검토할 수 있는 크기다 |
| build · test 속도 | JVM 과 Gradle daemon 시작 비용이 A/B 에 똑같이 들어간다. 전체 backend 시험 예상 30~60초, 단일 시험 클래스 예상 5~20초(warm daemon). 측정 후 확정 |
| Agent 친숙도 | Java/Spring 과 React/TypeScript 는 공개 코드가 가장 많은 조합에 속한다. JPA 대신 `JdbcClient` 를 고른 이유는 §3.3 |
| A/B 구조 표현 | 레이어 중심 package 와 기능 중심 package 를 Java package 로 그대로 표현할 수 있다. Spring 의 component scan 이 둘 다 같은 방식으로 동작한다 |
| architecture rule | ArchUnit 이 package 의존 · 순환 · 레이어 규칙을 시험 코드로 표현한다. 다른 언어의 dependency-cruiser, import-linter 와 대응되므로 책 독자가 옮겨 쓸 수 있다 |
| UI state fixture | Storybook CSF 가 Agent 와 사람 모두 익숙한 형식이다. Vitest browser mode 로 story 를 Chromium 에서 실행할 수 있다 |
| 병렬 실행 | Gradle 사용자 홈과 pnpm 의존성을 실행마다 분리해야 한다(§15). 컨테이너로 해결한다 |
| 반복 실험 비용 | 실행 비용은 대부분 모델 호출 비용이다. build 비용은 실행당 수 분 이내로 예상한다 |

## 3.3 검토한 대안

| 대안 | 채택하지 않은 이유 |
|---|---|
| TypeScript 단일 언어(NestJS 또는 Fastify + React) | 도구 체인이 하나라 시험이 빠르다. 그러나 이 책의 독자가 떠올리는 "정상적인 레이어 구조 업무 프로젝트" 는 Spring 쪽이 더 대표적이다. A 의 정상성을 독자가 판단하기 쉬운 쪽을 고른다 |
| Kotlin | Agent 친숙도와 독자 범위가 Java 보다 좁다 |
| Spring Data JPA | Agent 친숙도는 가장 높다. 그러나 지연 로딩, dirty checking, 영속성 컨텍스트가 실험 과제와 무관한 실패를 만들고 context 시작 시간을 늘린다 |
| Spring Modulith | 기능 module 검증을 코드 몇 줄로 해 주지만 module 의미를 framework 가 정한다. 책 독자가 다른 stack 으로 옮기기 어렵고, "B 만 특정 framework 기능을 쓴다" 는 반박을 받는다. 같은 규칙을 ArchUnit 3~4개로 직접 쓴다 |
| 외부 DB(PostgreSQL) | DB 준비 시간과 컨테이너 의존이 실험 결과에 섞인다. 과제 세 개 모두 DB 방언과 무관하다 |
| npm | 병렬 실행마다 `node_modules` 를 복사하는 비용이 크다. pnpm 은 content-addressable store 를 공유한다 |

기술 선택이 연구 주제가 되지 않도록 A 와 B 는 §6.4 차이 대장에 적은 것 외에는 같은 의존성과 같은 lockfile 을 쓴다.

## 3.4 버전 결정

### 선택 규칙

기준일은 2026-10-03 이다. 선택한 버전은 실험이 끝날 때까지 바꾸지 않는다.

1. **6개월 조건은 minor 출시일이 아니라 선택한 major line 의 최초 stable release 날짜에 적용한다.** 그 날짜가 기준일 6개월 전(2026-04-03) 이전이어야 한다
2. 조건을 만족하는 major line 중 가장 높은 line 을 고르고, 그 line 에서 기준일 현재 최신 stable minor · patch 를 쓴다. minor 가 최근에 나왔다는 이유로 제외하지 않는다
3. LTS 를 발표하는 런타임(Java, Node.js)은 LTS line 만 후보로 둔다. 비 LTS line 은 다음 major 가 나오면 지원이 끝나서 실험 기간 안에 보안 수정이 끊길 수 있다
4. Spring Boot BOM 이 관리하는 라이브러리(JUnit, AssertJ, H2, Spring Framework, Mockito)는 따로 선언하지 않고 BOM 버전을 쓴다
5. 다른 패키지와 버전을 맞춰야 하는 패키지(Vitest 계열, Storybook 계열, `@types/*`)는 그 패키지를 따른다. plugin 이 감싸는 도구는 plugin 이 공식 지원하는 버전을 쓴다(google-java-format, §3.5)

### 결정표

npm 패키지의 날짜는 npm registry 의 `time` 메타데이터(`npm view <패키지> time`, UTC)에서 major 별 최초 stable 버전(`X.Y.Z` 형식, prerelease 제외)을 골랐다.

| 기술 | 선택 버전 | 해당 major 최초 stable 출시일 | 6개월 조건 | 공식 출처 |
|---|---|---|---|---|
| Java | Eclipse Temurin 25.0.4.1+1 (LTS) | 25 GA: 2025-09-16 | 충족 | https://openjdk.org/projects/jdk/25/ , https://api.adoptium.net/v3/info/release_versions |
| Spring Boot | 4.1.1 | 4.0.0: 2025-11-20 | 충족 | https://github.com/spring-projects/spring-boot/releases , Maven Central `org.springframework.boot:spring-boot` |
| Gradle | 9.8.0 | 9.0.0: 2025-07-31 | 충족 | https://services.gradle.org/versions/all |
| ArchUnit | 1.5.1 | 1.0.0: 2022-10-03 | 충족 | https://github.com/TNG/ArchUnit/releases |
| Spotless Gradle plugin | 8.10.3 | 8.0.0: 2025-09-24 | 충족 | https://github.com/diffplug/spotless/blob/main/plugin-gradle/CHANGES.md |
| google-java-format | 1.36.1 | 1.x line(2016 이후) | 충족. 최신 1.37.0 은 규칙 5 로 제외(§3.5) | https://github.com/google/google-java-format/releases , Spotless `gradle/libs.versions.toml`(tag `gradle/8.10.3`) |
| io.spring.dependency-management | 1.1.7 | 1.0.0(1.x line) | 충족 | https://plugins.gradle.org/plugin/io.spring.dependency-management |
| JUnit Jupiter | 6.0.3 (BOM) | 6.0.0: 2025-09-30 | 충족 | Spring Boot 4.1.1 `spring-boot-dependencies` POM, https://github.com/junit-team/junit-framework/releases |
| Node.js | 24.21.0 (LTS) | 24.0.0: 2025-05-06 (LTS 시작 24.11.0: 2025-10-28) | 충족 | https://nodejs.org/dist/index.json |
| pnpm | 10.34.6 | 10.0.0: 2025-01-07 | 충족 | npm registry `pnpm` |
| React · React DOM | 19.3.0 | 19.0.0: 2024-12-05 | 충족 | npm registry `react`, `react-dom` |
| TypeScript | 6.0.3 | 6.0.2: 2026-03-23 (6.0.0 · 6.0.1 은 beta · rc 만 있음) | 충족 | npm registry `typescript` |
| Vite | 8.3.2 | 8.0.0: 2026-03-12 | 충족 | npm registry `vite` |
| @vitejs/plugin-react | 6.1.1 | 6.0.0: 2026-03-12 | 충족 | npm registry `@vitejs/plugin-react` |
| Vitest · @vitest/browser-playwright | 4.1.11 | 4.0.0: 2025-10-22 | 충족 | npm registry `vitest` |
| Storybook · @storybook/react-vite · @storybook/addon-vitest | 10.6.1 | 10.0.0: 2025-10-28 | 충족 | npm registry `storybook` |
| Playwright · @playwright/test | 1.63.0 | `playwright` 1.0.0: 2020-05-06 | 충족 | npm registry `playwright` |
| React Router | 7.18.4 | 7.0.0: 2024-11-22 | 충족 | npm registry `react-router` |
| TanStack Query | 5.104.1 | 5.0.0: 2023-10-17 | 충족 | npm registry `@tanstack/react-query` |
| Testing Library React | 16.3.3 | 16.0.0: 2024-06-03 | 충족 | npm registry `@testing-library/react` |
| jsdom | 29.1.1 | 29.0.0: 2026-03-15 | 충족 | npm registry `jsdom` |
| ESLint | 10.12.0 | 10.0.0: 2026-02-06 | 충족 | npm registry `eslint` |
| typescript-eslint | 8.71.0 | 8.0.0: 2024-07-31 | 충족. peer `typescript >=4.8.4 <6.1.0` | npm registry `typescript-eslint` |
| Prettier | 3.9.9 | 3.0.0: 2023-07-05 | 충족 | npm registry `prettier` |

보조 패키지도 같은 규칙으로 정했다. `@types/react` · `@types/react-dom` 19.3.0, `@types/node` 24.19.1, `@testing-library/dom` 10.4.2, `@testing-library/jest-dom` 6.10.0, `@testing-library/user-event` 14.6.7, `eslint-plugin-react-hooks` 7.1.1, `@eslint/js` 10.0.1, `eslint-config-prettier` 10.1.8, `globals` 17.13.0.

### 조건을 만족하지 않아 제외한 major

| 기술 | 제외한 major | 최초 stable 출시일 | 제외 이유 |
|---|---|---|---|
| TypeScript | 7 | 2026-07-08 | 6개월 미달. typescript-eslint 8.71.0 도 7 을 지원 범위에 넣지 않는다 |
| Vitest | 5 | 2026-09-03 | 6개월 미달 |
| React Router | 8 | 2026-06-17 | 6개월 미달 |
| pnpm | 11, 12 | 2026-04-28, 2026-08-26 | 6개월 미달 |
| jsdom | 30 | 2026-07-27 | 6개월 미달 |
| @testing-library/jest-dom | 7 | 2026-07-20 | 6개월 미달 |
| Node.js | 26, 25 | 2026-05-05, 2025-10-15 | 26 은 6개월 미달이고 기준일에 LTS 가 아니다(LTS 예정 2026-10-28). 25 는 비 LTS(규칙 3) |
| Java | 27, 26 | 2026-09-15, 2026-03-17 | 26 은 6개월 조건은 만족하지만 비 LTS 다(규칙 3). 27 은 6개월 미달 |
| google-java-format | 1.37.0(minor) | 2026-10-01 | Spotless 8.10.3 과 API 비호환(§3.5). 규칙 5 |

### 6개월 기준을 유지하는 이유

실험이 버전 선택에 요구하는 것은 네 가지다. Agent 가 익숙한 기술, 안정된 도구, 반복 가능한 실행, framework 신기능이 결과에 섞이지 않는 환경이다. 최신 기술 사용은 목적이 아니다.

비교한 기준:

| 기준 | 판단 |
|---|---|
| major line 최초 stable 후 6개월(현행) | 기준일만 정하면 누가 적용해도 같은 버전이 나온다. 이번 확인에서 이 기준이 제외한 TypeScript 7 은 typescript-eslint 지원 범위 밖이었다. 새 major 직후의 생태계 지연을 거르는 효과가 실제로 있다 |
| 선택한 모델의 학습 기준일 이전 버전 | Agent 친숙도에 가장 직접 대응한다. 그러나 모델은 Phase 0B(§19.2)에서 정하므로 지금 적용할 수 없고, 모델을 바꾸면 Variant 의존성을 다시 만들어야 한다. 공개된 학습 기준일은 월 단위라 판정이 흔들린다 |
| 항상 직전 major(N-1) | 규칙은 단순하지만 출시 직후든 2년 뒤든 같은 결과를 내서 안정성과 무관하다. pnpm 처럼 major 가 빠른 도구는 지나치게 오래된 버전을 고른다 |

판단: 현행 기준을 유지하고 규칙 3 ~ 5 를 덧붙인다. 모델 학습 기준일과의 관계는 선택 기준으로 쓰지 않고 Phase 0B 에서 모델을 정할 때 기록한다. TypeScript 6(2026-03-23), Vite 8(2026-03-12), ESLint 10(2026-02-06), jsdom 29(2026-03-15)처럼 기준선에 가까운 major 가 모델 학습 기준일보다 늦으면 §17 한계에 적는다.

남는 위험: 규칙 2 때문에 React 19.3.0(2026-09-09), Vite 8.3.2(2026-10-01)처럼 minor · patch 가 기준일 직전에 나온 버전이 들어간다. semver 상 같은 major 안의 변경이고 A 와 B 에 같게 들어가므로 Variant 사이 차이는 만들지 않는다.

## 3.5 호환 확인 기록

2026-10-03 에 임시 디렉터리에서 확인했다. 확인용 프로젝트는 저장소에 commit 하지 않았고 확인 후 삭제했다.

### Storybook + Vitest browser mode

공식 문서 확인: Storybook Vitest addon 문서는 "Vitest ≥ 3.0" 을 요구 조건으로 적고, Vitest 4 용 설정 예(`@vitest/browser-playwright` 의 `playwright()` provider)와 실행 명령 `vitest --project=storybook` 을 제시한다(https://storybook.js.org/docs/writing-tests/integrations/vitest-addon). `@storybook/addon-vitest@10.6.1` 의 peer 범위는 `vitest ^3.0.0 || ^4.0.0 || ^5.0.0`, `@vitest/browser-playwright ^4.0.0 || ^5.0.0` 이다.

실행 환경: macOS arm64, Node.js 24.21.0, pnpm 10.34.6, `PLAYWRIGHT_BROWSERS_PATH` 를 임시 디렉터리로 지정.

```
pnpm install                                   # package.json 에 §3.4 버전을 정확히 지정
pnpm exec storybook add @storybook/addon-vitest@10.6.1 --yes
pnpm exec tsc --noEmit -p .
pnpm exec vitest --project=storybook --run --reporter=verbose StaffTable
```

| 확인 항목 | 결과 |
|---|---|
| 설치된 버전 | §3.4 표의 버전과 같다(`pnpm list` 로 확인). playwright-core 는 1.63.0 하나다 |
| `storybook add` 가 바꾼 것 | `vite.config.ts` 에 `storybook` test project 추가, `.storybook/main.ts` 에 addon 추가, Playwright Chrome Headless Shell 설치, `@vitest/coverage-v8@4.1.11` 추가. 다른 버전은 바꾸지 않았다 |
| `tsc --noEmit` | exit 0 |
| `Default` story(play 함수에서 버튼 표시와 `navigator.userAgent` 의 Chrome 확인) | `✓ \|storybook (chromium)\| src/StaffTable.stories.tsx > Default` |
| 음성 대조(버튼이 없는 story 에서 같은 assertion) | `× ... > Must Fail`, `Unable to find an accessible element with the role "button" and name "수정"`, exit 1 |
| 파일 이름 필터 | `vitest --project=storybook StaffTable` 이 해당 story 파일만 실행했다. §10.2 의 `pnpm test:stories <필터>` 는 이 명령에 인자를 넘기는 script 로 만든다 |

Variant B 구현 시 주의: `storybook add` 가 추가하는 `@vitest/coverage-v8` 은 A 에 없는 의존성이므로 넣지 않는다. B 에만 있는 패키지는 `storybook`, `@storybook/react-vite`, `@storybook/addon-vitest`, `@vitest/browser-playwright` 네 개다(§16.2).

Linux 컨테이너 안에서의 실행은 확인하지 않았다. 버전 조합은 OS 와 무관하고, Chromium 시스템 의존성은 이미지 작성 단계(체크리스트 3단계)의 완료 조건으로 확인한다.

### Gradle 읽기 전용 의존성 cache

공식 문서 확인: Gradle 9.8.0 User Manual 의 "Sharing the dependency cache with other Gradle instances" 절. `$GRADLE_USER_HOME/caches/modules-2` 를 복사하되 `*.lock` 과 `gc.properties` 는 복사하지 않고, `GRADLE_RO_DEP_CACHE` 가 `modules-2` 를 담은 디렉터리를 가리키게 한다. 이 기능은 incubating 이고, cache 를 만든 Gradle 과 쓰는 Gradle 의 버전이 호환돼야 한다(https://docs.gradle.org/9.8.0/userguide/dependency_caching.html).

실행 환경: Docker 이미지 `eclipse-temurin:25.0.4.1_1-jdk-noble`, Gradle wrapper 9.8.0. 임시 프로젝트는 Spring Boot 4.1.1(`spring-boot-starter-webmvc`, `-security`, `-jdbc`, H2), 시험은 `@WebMvcTest` 1개, `@SpringBootTest` 1개, ArchUnit 1.5.1 규칙 1개, Spotless 8.10.3 + google-java-format 1.36.1.

절차:

1. seed: 네트워크가 있는 컨테이너에서 `GRADLE_USER_HOME=<seed>` 로 `./gradlew build` 실행
2. 읽기 전용 cache: `rsync -a --exclude '*.lock' --exclude 'gc.properties' <seed>/caches/modules-2 <ro>/` (58MB)
3. 실행: `docker run --network none --user 1000:1000`, `<ro>` 는 `:ro` mount, 빈 `GRADLE_USER_HOME`, 깨끗한 프로젝트 복사본에서 `./gradlew build`

| 실행 | 조건 | 결과 |
|---|---|---|
| T6 | `GRADLE_RO_DEP_CACHE` + `--offline` + wrapper 배포본 복사 | exit 0, 시험 XML 3개 `failures="0"`, `spotlessJavaCheck` · `test` 실행, 21초. 쓰기 가능한 `modules-2` 는 28KB |
| T7 | T6 에서 `--offline` 제외 | exit 0, 23초. 고정 버전이 모두 cache 에 있으면 Gradle 이 원격 저장소에 접근하지 않는다 |
| T8 | `GRADLE_RO_DEP_CACHE` 없음 + `--offline` | exit 1, `Plugin [id: 'org.springframework.boot', version: '4.1.1'] was not found` |
| T4 | wrapper 배포본 없음 | exit 1, `java.net.UnknownHostException: services.gradle.org` |
| T5 | wrapper 배포본을 읽기 전용 디렉터리로 symlink | exit 1, `gradle-9.8.0-bin.zip.lck (Read-only file system)` |

T4 · T5 는 Spotless 를 추가하기 전의 같은 프로젝트로 실행했다. 그때 T6 · T8 과 같은 조건의 실행도 각각 exit 0(53초), exit 1 이었다.

결론:

- `GRADLE_RO_DEP_CACHE` 방식이 Gradle 9.8.0 에서 동작한다. §15.2 의 방식을 유지한다
- 읽기 전용 cache 는 wrapper 배포본(`wrapper/dists`)을 포함하지 않는다. harness 가 Agent 시작 전에 이미지의 `wrapper/dists` 를 빈 `GRADLE_USER_HOME` 으로 복사한다. 읽기 전용 symlink 는 wrapper 가 lock 파일을 만들지 못해 실패한다
- Agent 가 `--offline` 없이 `./gradlew test` 를 실행해도 된다(T7). Variant README 에 `--offline` 을 적지 않는다
- 빈 `GRADLE_USER_HOME` 의 첫 build 는 Kotlin DSL script 를 다시 compile 한다. A 와 B 에 같은 비용이다

google-java-format 확인 중 발견한 것: Spotless 8.10.3 에 최신 google-java-format 1.37.0(2026-10-01)을 지정하면 모든 Java 파일에서 `NoSuchMethodError: 'JavaFormatterOptions$Style JavaFormatterOptions$Style.valueOf(String)'` 로 실패했다. Spotless 8.10.3(2026-09-25)이 build 할 때 지정한 기본값은 1.36.1 이고(`gradle/libs.versions.toml`), 1.36.1 로 바꾸자 `spotlessApply` · `spotlessCheck` 가 통과했다. 그래서 1.36.1 을 명시해 고정한다.

---

# 4. A/B 공통 기능

## 4.1 업무 영역

요청에 있던 네 영역에 관리자 계정 영역(`staff`)을 더한다.
실험 3 의 "사용자 목록의 부서명" 은 쇼핑몰 회원이 아니라 관리자 계정에 있는 속성이다. 회원에 부서를 붙이면 업무 모델이 부자연스러워진다.

| 영역 | 기능 | 관리자 API |
|---|---|---|
| member | 회원 조회 · 상세, 상태 변경, 등급(GENERAL, VIP) 변경, 탈퇴 | `GET /api/admin/members`, `GET /api/admin/members/{id}`, `PATCH .../{id}/status`, `PATCH .../{id}/grade`, `POST .../{id}/withdraw` |
| order | 주문 생성(결제 전), 금액 미리보기, 모의 결제 완료, 조회, 상태, 결제 대기 30분 경과 시 만료 | `POST /api/orders/preview`, `POST /api/orders`, `POST /api/orders/{id}/pay`, `GET /api/admin/orders`, `GET /api/admin/orders/{id}`, `POST /api/admin/orders/expire-overdue` |
| delivery | 배송비 계산, 무료배송 규칙, 배송 상태 | `GET /api/admin/deliveries`, `PATCH /api/admin/deliveries/{id}/status`, `GET /api/admin/delivery-policy` |
| refund | 환불 요청 · 승인 · 거절, 환불 가능 상태 확인, 부분 환불 시 배송비 재청구 | `POST /api/admin/refunds`, `POST .../{id}/approve`, `POST .../{id}/reject`, `GET /api/admin/refunds` |
| staff | 관리자 계정 조회 · 생성 · 역할 변경 · 비활성화 | `GET /api/admin/staff`, `POST /api/admin/staff`, `PATCH .../{id}/role`, `POST .../{id}/deactivate` |
| 인증(staff 영역에 속함) | 관리자 계정의 세션 로그인 · 로그아웃, 역할(ADMIN, OPERATOR)과 권한 | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |

## 4.2 업무 규칙(공통 명세)

- 기본 배송비 3,000원
- 할인 기능은 없다. 상품 금액은 주문 상품 금액의 합계다
- **VIP 회원이고 상품 금액이 150,000원 이상이면 배송비 0원.** GENERAL 회원은 항상 3,000원
- 주문 생성 시점의 배송비를 주문에 저장한다. 기준이 바뀌어도 기존 주문의 배송비는 바뀌지 않는다
- 주문 상태는 `PENDING_PAYMENT`, `PAID`, `EXPIRED` 세 가지다. `POST /api/orders/{id}/pay` 가 `PENDING_PAYMENT` 를 `PAID` 로 바꾸고, 주문에 저장된 배송비를 담은 배송(`READY`)을 만든다
- 배송 상태는 `READY`, `SHIPPED`, `DELIVERED` 다. 배송 상태 변경은 주문 상태를 바꾸지 않는다
- 환불 요청 조건: 주문이 `PAID` 이고 배송 상태가 `READY` 또는 `DELIVERED`. 배송 상태가 `SHIPPED`(배송 중)이면 환불 요청 불가
- 환불 금액이 주문 상품 금액보다 작으면 부분 환불이다. 환불은 환불 기록만 남기고 주문 상태를 바꾸지 않는다
- 부분 환불 시 배송비 차감: 주문에 저장된 배송비가 0원인 주문에서, 이미 승인된 환불과 이번 환불의 합계를 뺀 남은 상품 금액이 무료배송 조건(`DeliveryFeePolicy` 의 규칙, 회원의 현재 등급과 승인 시점의 기준)을 만족하지 않으면 환불 금액에서 배송비 3,000원을 차감한다. 판단은 환불 승인 시점에 하고, 한 주문에서 차감은 한 번만 한다. 저장된 배송비가 3,000원인 주문은 차감하지 않는다. 차감액을 노출하는 응답 필드와 환불 금액이 3,000원보다 작을 때의 처리는 `api.md` · `requirements.md` 에서 정한다
- 결제 대기(`PENDING_PAYMENT`) 주문은 생성 30분 후 `EXPIRED`. 시간은 주입한 `Clock` 으로 계산한다
- 고객 로그인은 범위 밖이다. `/api/orders/**` 는 요청 본문의 `memberId` 로 동작하며 인증하지 않는다
- 권한은 영역별 `<AREA>_READ`, `<AREA>_WRITE`. ADMIN 은 전체, OPERATOR 는 READ 전체와 `DELIVERY_WRITE`
- 금액 음수 금지, 필수 ID 누락 시 400, 정의되지 않은 상태 값 400

## 4.3 공통 산출물(작성용 저장소 `lab/spec/`)

| 파일 | 내용 | 용도 |
|---|---|---|
| `requirements.md` | §4.1, §4.2 의 기능 명세 | A, B 구현의 유일한 기준 |
| `api.md` | endpoint, 요청 · 응답 JSON 예시, 오류 코드 목록 | API 동일성 확인 |
| `scenarios.md` | 행동 시나리오 목록. ID 형식 `DLV-03`, 시나리오마다 시험 단계(unit, web, integration, component, e2e) | 시험 수 동일성 확인(§10) |
| `schema.sql` | 테이블과 열 정의 | 두 Variant 에 같은 바이트로 복사. `seed.sql` 과 채점 SQL 의 기준 |
| `seed.sql` | 회원 40명, 주문 120건, 배송 100건, 환불 20건, 관리자 계정 12명 | 두 Variant 에 같은 바이트로 복사 |
| `seed-checks.sql` | 실험 2 의 조회 8개 조건에 맞는 행이 있는지 확인하는 SQL | seed 검증 |
| `ui.md` | 화면 목록, 열 구성, 메뉴 구성, 버튼 이름, 화면 폭 1280px 기준 | 화면 동일성 확인 |
| `versions.md` | §3.4 의 버전 값(B 전용 패키지 제외) | Variant A 세션이 쓰는 버전 기준 |
| `conventions.md` | §5 의 구조 약속을 구현 지시로 옮긴 것(§5.5) | Variant A 세션의 구현 지시 |

seed 의 이름 · 부서명 길이는 20자 이하로 둔다. 실험 3 의 버그 상태가 기준 화면에 드러나지 않게 하기 위해서다.
seed 에는 실험 2 의 조회 화면 8개가 각각 1행 이상 보여 줄 데이터를 미리 넣는다. 실험 과제가 seed 를 바꿀 필요가 없게 한다.
`schema.sql` 은 실험 2 과제가 기존 테이블만 읽도록 회원 `last_login_at` · `withdrawn_at`, 배송 `fee` · `shipped_at` · `delivered_at`, 환불 `amount` · `requested_at` 열을 포함한다. 배송 `fee` 는 결제 완료 시 주문의 배송비를 복사한 값이다. T2-D2(무료배송 적용 배송)가 주문을 읽지 않고 배송 테이블만으로 답할 수 있게 하기 위해서다.
seed 의 날짜는 고정 기준 시각 하나를 기준으로 쓴다. 기준 시각 값은 `requirements.md` 를 쓸 때 정하고, 애플리케이션은 E2E · 숨김 채점 · 실험 실행에서 그 시각으로 고정한 `Clock` 을 쓴다. 실행 날짜가 바뀌어도 T2-M1, T2-O1 같은 기간 조건의 결과가 같아야 하기 때문이다.

## 4.4 화면

관리자 UI 화면 9개: 로그인, 회원 목록, 회원 상세, 주문 목록, 주문 상세, 배송 목록, 배송 정책, 환불 목록, 관리자 계정 목록.
모든 목록은 공통 `DataTable` component 를 쓴다. 메뉴는 영역 그룹(회원, 주문, 배송, 환불, 설정) 아래에 둔다.

---

# 5. Variant A 구조

## 5.1 성격

실무 팀이 Spring 과 React 로 관리자 시스템을 만들 때 흔히 고르는 레이어 중심 구조다.
"리뷰어가 이 PR 을 받아들이는가" 를 기준으로 만들고, 사람 리뷰어 한 명이 §16.3 체크리스트로 승인해야 다음 단계로 간다.

## 5.2 허용하는 특징

- backend 는 `controller`, `service`, `repository`, `domain`, `dto`, `config`, `common` 레이어 package
- frontend 는 `pages`, `components`, `api`, `types`, `hooks`
- frontend 의 route · 메뉴 · 화면 권한을 `src/app/adminRoutes.tsx` 한 표에서 관리한다
- 오류 코드는 `common/error/ErrorCode` enum 한 곳에 모은다
- UI 상태는 실제 앱 흐름으로 확인한다. jsdom component 시험은 있다
- 다른 영역의 데이터는 그 영역의 service 메서드로 읽고 바꾼다는 약속이 README 에 있다. 이 약속과 영역 사이 호출 방향(§7.3)을 막는 자동 검사는 없다

## 5.3 불확실할 때 A 에 유리하게 정한 것

정상적인 선택지가 여러 개이면 A 에 유리한 쪽을 고른다. B 가 이겼을 때 반박의 여지를 줄이기 위해서다.

| 항목 | A 의 선택 | 덜 유리한 정상 선택지 |
|---|---|---|
| 업무 규칙 위치 | `DeliveryFeePolicy` 하나가 무료배송을 판단한다 | 주문 · 환불 service 가 각자 판단 |
| 구조 자동 검사 | ArchUnit 레이어 규칙 2개가 있다 | 자동 검사 없음 |
| 오류 응답 | 오류 코드와 메시지를 담은 JSON. B 와 같은 코드 문자열 | `500 Internal Server Error` 만 반환 |
| `SecurityConfig` | 영역 prefix 단위 규칙(`/api/admin/refunds/**`). 새 조회 API 가 이 파일을 고칠 필요가 없다 | endpoint 마다 규칙 추가 |
| route · 메뉴 | route 와 메뉴를 한 표에 둔다. 새 화면이 고치는 중앙 파일이 하나다 | route 파일과 메뉴 파일이 따로 있음 |
| E2E 보조 함수 | `login`, `createStaff`, `createOrder` 같은 API 보조 함수가 있다 | 화면을 클릭해 데이터 생성 |
| 시험 실행 안내 | README 에 `--tests` 필터 사용법이 있다 | 전체 시험 명령만 안내 |

## 5.4 하지 않는 것

긴 함수, 의미 없는 이름, 거대 클래스, 복사 붙여넣기, 순환 의존, 테스트 누락, 일부러 느린 build, 업무 규칙 숫자를 여러 곳에 적는 것.

## 5.5 A 구현 세션에 주는 지시(`lab/spec/conventions.md`)

A 구현 세션은 연구 문서와 이 설계서를 보지 않고 `lab/spec/` 만 받는다(§18 5번). 체크리스트 4단계의 완료 조건이 명세만으로 나오지 않으므로, 아래 항목을 `conventions.md` 에 구현 지시로 적는다. 실험 목적, Variant 구분, 과제 내용은 적지 않는다.

- 기술: `versions.md` 의 버전, `JdbcClient` + 직접 작성한 SQL, H2 in-memory. JPA 를 쓰지 않는다
- backend package: §7.2 의 레이어 package. 무료배송 판단은 `service/DeliveryFeePolicy` 한 곳에 둔다
- 영역 사이 호출: 다른 영역은 그 영역의 service 메서드로 부른다. 호출 방향은 §7.3 의 의존 방향을 영역 이름 화살표로만 옮겨 적는다(`order → member, delivery` 형식). B 의 interface 이름은 적지 않는다
- 영역 사이에서 주고받는 값: 다른 영역 service 메서드의 인자와 반환값은 도메인 클래스가 아니라 ID(`long`), `domain/` 의 요약 record(`MemberSummary`, `OrderSummary`), enum(`MemberGrade`, `OrderStatus`, `DeliveryStatus`), `Money` 다. B 에서 이 타입들이 공개 contract 로 옮겨 가므로 영역 사이 호출 줄의 지역 변수 타입과 접근 메서드가 A 와 같게 남는다(§16.2)
- 구조 검사: ArchUnit L1, L2(§12.2)
- frontend: §7.5 A 구조. route · 메뉴 · 화면 권한은 `src/app/adminRoutes.tsx` 한 표
- 오류 코드: `common/error/ErrorCode` enum 한 곳(§13)
- 시험: 시나리오 ID 를 시험 이름에 넣는다. 통합 시험 2개. E2E 보조 함수 `login`, `createStaff`, `createOrder`
- 명령 이름: `./gradlew test`, `pnpm test`, `pnpm e2e`, `./scripts/verify-all.sh`
- harness 연동 설정: Vitest 는 `default` 와 `junit` reporter 를 쓰고 JUnit 결과를 `frontend/reports/junit-vitest.xml` 에, Playwright 는 `list` 와 `junit` reporter 를 쓰고 `frontend/reports/junit-e2e.xml` 에 쓴다(§14.3). E2E 의 port 는 `APP_PORT` 로 받고 `reuseExistingServer: false` 다(§11.3)
- README 절 구성: 개요, 실행, 시험 명령, 디렉터리 구조, 규칙, 시험용 로그인 계정. 시험 명령 절에 "완료 전 `./gradlew test` 와 `pnpm test` 를 실행한다" 문장을 넣는다. 시험 필터 예는 `./gradlew test --tests '*StaffServiceTest'` 한 줄로 고정한다. 과제와 무관한 영역이고 B 에도 같은 문장을 쓴다

`DataTable` 의 셀 줄바꿈과 가로 스크롤 동작은 화면 명세 항목이므로 `ui.md` 에 적는다(체크리스트 1단계).
이 지시도 과제를 아는 사람이 쓴다. 같은 작성자 위험은 §16.1 에 있다.

---

# 6. Variant B 구조

## 6.1 만드는 방법

**B 는 완성된 A 를 차이 대장(§6.4)에 따라 재구성해서 만든다.**
업무 로직 메서드 본문은 옮기기만 하고 고치지 않는다. 바뀌는 줄은 다른 기능을 부르는 줄뿐이다. A 에서 `MemberService` 를 부르던 줄이 B 에서는 `MemberQuery` 를 부른다. 이렇게 하면 업무 로직과 이름의 동일성이 보장되고, A 를 B 에서 역설계하지 않는다는 조건(`_research/14` §9)도 지킨다.
B 가 "A 에 Agentic 원칙을 적용한 리팩토링 결과" 라는 점은 책의 서술 흐름과도 맞는다.
이 방식의 목적과 남는 위험은 §16.1 의 "B 를 A 에서 파생하는 이유와 남는 위험" 에 적는다.
A 에 §7.3 의 허용 방향 밖의 영역 사이 호출이 있으면 B 에서 메서드 본문을 고치지 않는다. A 를 고치고 §16.3 의 A 확인을 다시 받은 뒤 B 를 재구성한다.

## 6.2 적용하는 원칙

- backend 는 `member`, `order`, `delivery`, `refund`, `staff`, `shared` 기능 package. 기능 package 의 최상위 타입이 공개 contract 이고 `internal` 하위 package 는 다른 기능이 쓰지 않는다
- frontend 는 `features/<영역>/<화면>/` 단위. 다른 기능은 `features/<영역>/index.ts` 로만 접근한다
- 화면 등록은 화면 디렉터리 안의 `admin-page.ts` 가 하고, 전체 목록은 `src/app/adminPages.ts` 가 build 시점에 모은다(§8.2)
- ArchUnit 경계 규칙 4개와 ESLint 경계 규칙 1개(§12)
- 목록 화면마다 표준 상태 story 와 fixture builder

## 6.3 하지 않는 것

- 코드 생성기, 생성 파일 commit, annotation processor
- 기능마다 별도 Gradle module 또는 별도 배포 단위
- 기능마다 별도 controller 를 use case 단위로 쪼개기. 영역 단위 controller 는 A 와 같은 크기로 둔다
- B 에만 업무 동작 시험 추가
- README 에 "Agent 친화" 같은 실험 의도를 드러내는 문구

## 6.4 차이 대장

A 와 B 의 차이는 이 표에 있는 것뿐이다. 표에 없는 차이를 발견하면 버그로 보고 없앤다.
"분류" 열은 §2.3 에 따라 차이의 근거가 기존 원칙인지, Agent 조건에서 새로 생기는지를 적는다.

| ID | 영역 | A | B | 분류 | 주로 영향을 받는 실험 |
|---|---|---|---|---|---|
| D1 | backend package | 레이어별 | 기능별 + `internal` | 기존(응집도) | 1 |
| D2 | backend 경계 검사 | ArchUnit 레이어 규칙 2개 | ArchUnit 경계 규칙 4개, 기능별 공개 interface | 기존(정보 은닉, fitness function) | 1, 장기 실험 |
| D3 | frontend 디렉터리 | `pages`, `components`, `api`, `types` | `features/<영역>/<화면>`, `shared` | 기존(응집도) | 1, 3 |
| D4 | 화면 등록 | `src/app/adminRoutes.tsx` 한 표 | 화면별 `admin-page.ts` + glob 수집 | 기존(OCP) + 병렬 수정 비용 | 2 |
| D5 | UI 상태 재현 | jsdom component 시험, 실제 앱 E2E | 위와 같음 + 표준 상태 story, fixture builder, story 실행용 Vitest browser project | 기존 실무(CDD) + 사람 없는 재현 | 3 |
| D6 | 오류 코드 위치 · 로그 필드 | v0.1 에서 제외. 두 Variant 모두 중앙 enum, 로그에 코드 | 같음 | 기존(구조화 로그) | 없음. 이후 진단 실험에서 다시 정한다(§13) |
| D7 | 프론트 경계 lint | 없음 | `no-restricted-imports` 1개 | 기존(정보 은닉) | 2, 3 |

## 6.5 같아야 하는 것

언어 · framework · 라이브러리 버전과 lockfile, 업무 로직 메서드 본문, 도메인 클래스 이름과 메서드 시그니처, API 요청 · 응답, 오류 코드 문자열, 화면 렌더링 결과, seed, 행동 시나리오 ID 집합, lint · format 설정(D7 제외), README 절 구성, 명령 이름(`./gradlew test`, `pnpm test`, `pnpm e2e`), 공통 `DataTable` 구현.
이 중 기계로 확인할 수 있는 항목은 §16.2 의 동일성 검사로 확인한다.

---

# 7. 실제 directory · package 예시

대표 기능은 `delivery/free-shipping` 이다. 경로는 작성용 저장소 기준이며, 실행용 저장소로 내보내면 `lab/variants/a/` 가 저장소 루트가 된다.

## 7.1 작성용 저장소

```
lab/
  spec/            공통 명세, API, 시나리오 목록, seed, 화면 명세
  variants/
    a/             Variant A 저장소 루트 (backend/, frontend/, README.md)
    b/             Variant B 저장소 루트
  grading/         숨김 채점 시험(과제별 채점은 grading/tasks/). 실행용 저장소에 들어가지 않는다
  tasks/           과제 원문, 사전 등록 예측, 통합 Agent 문구, 공통 경로 목록
  harness/         내보내기, 컨테이너 이미지, 실행, 수집, 병합, 분석 스크립트
  results/         요약 결과. 원본 로그 보관 위치는 §19.2 [결정 필요]
```

## 7.2 Variant A backend

```
backend/src/main/java/com/example/shop/
  ShopApplication.java
  config/          SecurityConfig, ClockConfig, WebConfig
  common/
    error/         ErrorCode (enum, 전체 오류 코드), BusinessException, GlobalExceptionHandler, ErrorResponse
    money/         Money
  controller/
    AuthController, OrderController
    admin/         MemberAdminController, OrderAdminController, DeliveryAdminController,
                   RefundAdminController, StaffAdminController
  service/         MemberService, OrderService, OrderExpiryService, DeliveryService, SessionUserService,
                   DeliveryFeePolicy, RefundService, StaffService
  repository/      MemberRepository, OrderRepository, DeliveryRepository, RefundRepository, StaffRepository
  domain/          Member, MemberSummary, MemberGrade, MemberStatus, Order, OrderSummary, OrderLine, OrderStatus,
                   Delivery, DeliveryStatus, Refund, RefundStatus, Staff, Role, Permission
  dto/
    member/ order/ delivery/ refund/ staff/   요청 · 응답 record
backend/src/main/resources/
  application.yml, schema.sql, seed.sql
backend/src/test/java/com/example/shop/
  service/         DeliveryFeePolicyTest, OrderServiceTest, RefundServiceTest, ...
  controller/admin/ DeliveryAdminControllerTest (@WebMvcTest), ...
  integration/     CheckoutFlowIT, RefundFlowIT (@SpringBootTest)
  architecture/    LayerRulesTest
```

## 7.3 Variant B backend

```
backend/src/main/java/com/example/shop/
  ShopApplication.java
  shared/
    config/        SecurityConfig, ClockConfig, WebConfig
    error/         ErrorCode (enum, 전체 오류 코드. A 와 같다), BusinessException, GlobalExceptionHandler, ErrorResponse
    money/         Money
    security/      Role, Permission
  member/          MemberQuery (interface), MemberSummary, MemberGrade          ← 공개 contract
    internal/      MemberAdminController, MemberService, MemberRepository, Member, MemberStatus
  order/           OrderQuery, OrderSummary, OrderStatus
    internal/      OrderController, OrderAdminController, OrderService, OrderExpiryService, OrderRepository, Order, OrderLine
  delivery/        DeliveryFeeQuery, DeliveryTracking (interface: 결제 완료 시 배송 생성, 주문의 배송 상태 조회), DeliveryStatus
    internal/      DeliveryAdminController, DeliveryService, DeliveryFeePolicy, DeliveryFeeQueryService,
                   DeliveryRepository, Delivery
  refund/          (다른 기능이 쓰는 타입 없음)
    internal/      RefundAdminController, RefundService, RefundRepository, Refund, RefundStatus
  staff/           (다른 기능이 쓰는 타입 없음. 로그인은 관리자 계정 기능이라 staff 에 둔다)
    internal/      StaffAdminController, StaffService, StaffRepository, Staff, AuthController, SessionUserService
backend/src/test/java/com/example/shop/
  delivery/internal/ DeliveryFeePolicyTest, DeliveryAdminControllerTest
  order/internal/    OrderServiceTest, ...
  refund/internal/   RefundServiceTest, ...
  integration/       CheckoutFlowIT, RefundFlowIT
  architecture/      ModuleBoundaryRulesTest
```

기능 사이 의존 방향(A 는 같은 방향이지만 검사하지 않는다):

```
order    → member (MemberQuery: 등급 조회), delivery (DeliveryFeeQuery: 배송비, DeliveryTracking: 결제 완료 시 배송 생성)
refund   → order (OrderQuery: 상품 금액 · 저장된 배송비 · 상태), delivery (DeliveryFeeQuery, DeliveryTracking: 배송 상태), member (MemberQuery)
delivery → member (MemberGrade 타입만)
staff    → shared 만
member   → shared 만
```

## 7.4 대표 기능 파일 예시

업무 규칙 클래스는 A 와 B 가 같은 코드다. package 선언과 접근 제한자만 다르다.

```java
// A: com.example.shop.service.DeliveryFeePolicy
// B: com.example.shop.delivery.internal.DeliveryFeePolicy
@Component
public class DeliveryFeePolicy {

    static final Money BASE_FEE = Money.won(3_000);
    static final Money VIP_FREE_SHIPPING_THRESHOLD = Money.won(150_000);

    public Money feeFor(Money payableAmount, MemberGrade grade) {
        return isFreeShipping(payableAmount, grade) ? Money.ZERO : BASE_FEE;
    }

    public boolean isFreeShipping(Money payableAmount, MemberGrade grade) {
        return grade == MemberGrade.VIP && payableAmount.isGreaterThanOrEqual(VIP_FREE_SHIPPING_THRESHOLD);
    }

    public Money vipFreeShippingThreshold() {
        return VIP_FREE_SHIPPING_THRESHOLD;
    }
}
```

사용처의 차이:

```java
// A: com.example.shop.service.RefundService
private final DeliveryFeePolicy deliveryFeePolicy;      // 구현 클래스를 직접 주입
private final MemberService memberService;
...
boolean stillFree = deliveryFeePolicy.isFreeShipping(remainingAmount, memberService.gradeOf(order.memberId()));

// B: com.example.shop.refund.internal.RefundService
private final DeliveryFeeQuery deliveryFeeQuery;        // delivery 의 공개 interface
...
boolean stillFree = deliveryFeeQuery.isFreeShipping(remainingAmount, memberQuery.gradeOf(order.memberId()));
```

```java
// B 에만 있는 공개 contract (차이 대장 D2)
// com.example.shop.delivery.DeliveryFeeQuery
public interface DeliveryFeeQuery {
    Money feeFor(Money payableAmount, MemberGrade grade);
    boolean isFreeShipping(Money payableAmount, MemberGrade grade);
}
// delivery.internal.DeliveryFeeQueryService 가 DeliveryFeePolicy 에 위임한다
```

frontend 배송 정책 화면:

```
A: frontend/src/pages/delivery/DeliveryPolicyPage.tsx
   frontend/src/pages/delivery/DeliveryPolicyView.tsx
   frontend/src/pages/delivery/DeliveryPolicyView.test.tsx
   frontend/src/api/deliveryApi.ts
   frontend/src/types/delivery.ts
   frontend/src/app/adminRoutes.tsx            ← 화면 등록
B: frontend/src/features/delivery/delivery-policy/admin-page.ts
   frontend/src/features/delivery/delivery-policy/DeliveryPolicyPage.tsx
   frontend/src/features/delivery/delivery-policy/DeliveryPolicyView.tsx
   frontend/src/features/delivery/delivery-policy/DeliveryPolicyView.test.tsx
   frontend/src/features/delivery/api.ts, types.ts, fixtures.ts, index.ts
```

A 의 화면 컴포넌트도 데이터 조회(`DeliveryPolicyPage`)와 표시를 나눈다. 표시 컴포넌트 분리는 기존 원칙이라 A 와 B 가 같게 둔다. B 에서 story 가 붙는 것은 목록 표시 컴포넌트 5개뿐이다(§11.1). 배송 정책 화면과 공통 `DataTable` 에는 story 가 없다.

## 7.5 Frontend 전체 구조

```
A: frontend/src/
     main.tsx
     app/         App.tsx, adminRoutes.tsx, Layout.tsx, Sidebar.tsx, RequirePermission.tsx
     pages/       member/ order/ delivery/ refund/ staff/ login/   (화면, 표시 컴포넌트, *.test.tsx)
     components/  DataTable.tsx, StatusBadge.tsx, MoneyText.tsx
     api/         client.ts, memberApi.ts, orderApi.ts, deliveryApi.ts, refundApi.ts, staffApi.ts
     types/       member.ts, order.ts, delivery.ts, refund.ts, staff.ts, permission.ts
     hooks/       useSession.ts
   frontend/e2e/  helpers/ (login, api 보조), *.spec.ts

B: frontend/src/
     main.tsx
     app/         App.tsx, adminPages.ts, Layout.tsx, Sidebar.tsx, RequirePermission.tsx
     shared/      ui/DataTable.tsx, ui/StatusBadge.tsx, ui/MoneyText.tsx,
                  api/client.ts, permissions.ts, adminPage.ts(defineAdminPage, 타입), adminGroups.ts
     features/    member/ order/ delivery/ refund/ staff/ auth/
                    <영역>/index.ts, api.ts, types.ts, fixtures.ts
                    <영역>/<화면>/admin-page.ts, *Page.tsx, *View.tsx 또는 *Table.tsx, *.stories.tsx, *.test.tsx
   frontend/.storybook/
   frontend/e2e/  A 와 같은 내용
```

API client 파일은 A 와 B 모두 영역 단위 하나다(`api/deliveryApi.ts`, `features/delivery/api.ts`). 화면 단위로 쪼개면 실험 2 의 충돌이 D4 외의 이유로도 줄어 원인을 나눌 수 없다.

---

# 8. 세 가지 실험 상세 설계

공통 과제 문구 형식(두 Variant 동일):

```
다음 요청을 처리해 줘.

<과제 본문>

필요한 경우 시험을 실행해서 확인해. 코드를 바꿀 필요가 없다고 판단하면 이유를 말해 줘.
```

commit 은 Agent 에게 시키지 않는다. 실행이 끝나면 harness 가 작업 트리 상태로 diff 를 만든다.

## 8.1 실험 1. VIP 무료배송 기준 변경

과제 본문:

> VIP 회원 무료배송 기준을 150,000원에서 100,000원으로 변경하라.

이 과제에서 A/B 차이는 작을 것으로 예측한다. 시작 시점에는 두 Variant 모두 규칙의 주인이 하나이기 때문이다(§2.2 (1)).
그래도 첫 실험으로 두는 이유는 두 가지다.

- 측정 도구 보정: 차이가 작아야 할 과제에서 B 가 크게 이기면 harness 나 Variant 구현에 편향이 있다는 신호다
- package 구조만으로 생기는 탐색 차이와 기능 단위 검증의 위험(아래 B 의 "놓칠 수 있는 지점")을 측정한다

| 항목 | A | B |
|---|---|---|
| 처음 검색 예상 | `무료배송`, `FreeShipping`, `150_000`, `150000`, `VIP` 를 grep. `150_000` 은 `service/DeliveryFeePolicy.java`, `150000` 은 시험 파일과 frontend mock 에 걸린다 | 같은 검색어. 결과가 `delivery/` 아래에 모인다 |
| 관련 코드 위치 | `service/DeliveryFeePolicy`, 사용처 `service/OrderService`, `service/RefundService`, 노출 `controller/admin/DeliveryAdminController`, `dto/delivery/DeliveryPolicyResponse` | `delivery/internal/DeliveryFeePolicy`, 사용처는 `DeliveryFeeQuery` 를 통해 `order/internal/OrderService`, `refund/internal/RefundService` |
| 수정 후보(운영 코드) | `DeliveryFeePolicy.java` 상수 1줄 | `DeliveryFeePolicy.java` 상수 1줄 |
| 관련 시험 | `service/DeliveryFeePolicyTest`(경계값 149,999 · 150,000), `service/RefundServiceTest`(VIP 160,000원 주문에서 20,000원 부분 환불 시 배송비 차감), `controller/admin/DeliveryAdminControllerTest`(정책 응답), `pages/delivery/DeliveryPolicyView.test.tsx`(mock 값) | `delivery/internal/DeliveryFeePolicyTest`, `refund/internal/RefundServiceTest`, `delivery/internal/DeliveryAdminControllerTest`, `features/delivery/delivery-policy/DeliveryPolicyView.test.tsx` · `fixtures.ts` |
| 놓칠 수 있는 지점 | `RefundServiceTest` 시나리오가 140,000원을 "기준 미만" 으로 쓰고 있어 기준 변경 후 실패한다. 시험 값을 고칠 때 시나리오 의도(기준 미만으로 떨어짐)를 유지해야 한다. frontend mock 의 150000 은 시험이 통과하므로 남을 수 있다 | A 와 같다. 추가로 `--tests 'com.example.shop.delivery.*'` 로 기능 단위만 실행하면 `refund` 시험 실패를 보지 못한다. **B 의 기능 단위 검증이 잘못된 확신을 줄 수 있는 지점이다** |
| 첫 빠른 검증 | `./gradlew test --tests '*DeliveryFeePolicyTest'` | `./gradlew test --tests 'com.example.shop.delivery.*'` |
| 최종 검증 | `./gradlew test`, `pnpm test`, `pnpm e2e` | 같음 + ArchUnit 은 `./gradlew test` 에 포함 |

숨김 채점(`lab/grading/tasks/exp1/`):

- VIP, 100,000원 → 배송비 0원. VIP, 99,999원 → 3,000원. GENERAL, 100,000원 → 3,000원
- `GET /api/admin/delivery-policy` 의 기준 값 100000
- 아래 두 항목의 주문은 채점이 API 로 새로 만든다. VIP 회원으로 120,000원 주문 생성(저장된 배송비 0원) → `POST /api/orders/{id}/pay` → 환불 요청 · 승인
- VIP 120,000원 주문에서 30,000원 부분 환불 → 남은 금액 90,000원 → 배송비 3,000원 차감
- VIP 120,000원 주문에서 10,000원 부분 환불 → 남은 금액 110,000원 → 차감 없음
- seed 에 있는 기존 주문의 저장된 배송비가 그대로인지
- Variant 자체 시험 전체 통과

사전 등록 예측: 성공률은 두 Variant 모두 높고 차이가 없다. B 의 열어 본 디렉터리 수가 적다. 첫 검증까지 시간은 차이가 없다. B 에서 기능 단위 검증 후 전체 시험 전에 완료를 선언하는 실행이 A 보다 많을 수 있다.

## 8.2 실험 2. 관리자 기능 8개 병렬 추가

### 과제

영역마다 2개씩, 같은 영역 쌍이 생기게 배정한다. 같은 영역의 두 작업은 A 와 B 모두 같은 controller · repository · API client 를 고치므로 충돌한다. 이 충돌은 D4 와 무관한 기준선이다.

| ID | 화면 | API | 권한 |
|---|---|---|---|
| T2-M1 | 휴면 회원(마지막 로그인 365일 경과) | `GET /api/admin/members/dormant` | `MEMBER_READ` |
| T2-M2 | 최근 30일 탈퇴 회원 | `GET /api/admin/members/withdrawn` | `MEMBER_READ` |
| T2-O1 | 10분 안에 만료될 결제 대기 주문 | `GET /api/admin/orders/expiring` | `ORDER_READ` |
| T2-O2 | 결제 금액 500,000원 이상 주문 | `GET /api/admin/orders/high-value` | `ORDER_READ` |
| T2-D1 | 출고 후 3일 넘게 도착하지 않은 배송 | `GET /api/admin/deliveries/delayed` | `DELIVERY_READ` |
| T2-D2 | 무료배송 적용 배송 | `GET /api/admin/deliveries/free-shipping` | `DELIVERY_READ` |
| T2-R1 | 요청 후 2일 넘게 처리되지 않은 환불 | `GET /api/admin/refunds/stale` | `REFUND_READ` |
| T2-R2 | 부분 환불 목록 | `GET /api/admin/refunds/partial` | `REFUND_READ` |

과제 본문에는 화면 이름, API 경로, 표시 열, 조건, 메뉴 그룹 · 이름, 권한을 적는다. 숨김 채점이 같은 경로를 호출해야 하기 때문이다. 두 Variant 에 같은 문구를 준다.
모든 과제는 기존 테이블만 읽는다. 스키마 변경과 새 권한은 v0.1 범위 밖이다(§17).

### 예상 수정 파일

| 구분 | A | B |
|---|---|---|
| 모든 작업이 고치는 파일 | `frontend/src/app/adminRoutes.tsx` | 없음 |
| 같은 영역 작업끼리 고치는 파일 | `<Area>AdminController`, `<Area>Service`, `<Area>Repository`, `api/<area>Api.ts`, `types/<area>.ts` | `internal/<Area>AdminController`, `internal/<Area>Service`, `internal/<Area>Repository`, `features/<area>/api.ts`, `features/<area>/types.ts` |
| 새 파일 | 화면, 표시 컴포넌트, 시험, dto | 화면 디렉터리(`admin-page.ts`, 화면, 표시 컴포넌트, story, 시험) |

사전 등록 예측: A 는 28개 작업 쌍 중 `adminRoutes.tsx` 에서 충돌하는 쌍이 많다. 같은 영역 쌍 4개는 A 와 B 모두 backend 파일에서 충돌한다. B 의 충돌은 같은 영역 쌍으로 한정된다. 실제 충돌 수는 git 의 3-way merge 가 인접한 hunk 를 어떻게 처리하는지에 따라 달라지므로 수치는 예측하지 않는다.

### B 의 자동 등록 방식

```ts
// B: frontend/src/features/refund/stale-refunds/admin-page.ts
import { defineAdminPage } from '@/shared/adminPage';

export const adminPage = defineAdminPage({
  id: 'refund.stale',
  path: '/refunds/stale',
  group: 'refund',
  label: '처리 지연 환불',
  permission: 'REFUND_READ',
  component: () => import('./StaleRefundsPage'),
});
```

```ts
// B: frontend/src/app/adminPages.ts (전체 목록을 모으는 유일한 위치)
// features/<영역>/<화면>/admin-page.ts 를 모두 읽는다. 화면을 추가해도 이 파일은 고치지 않는다.
const modules = import.meta.glob<{ adminPage: AdminPage }>(
  '../features/*/*/admin-page.ts',
  { eager: true },
);
export const adminPages = sortByGroupAndLabel(Object.values(modules).map((m) => m.adminPage));
```

```tsx
// A: frontend/src/app/adminRoutes.tsx 의 한 항목
{ path: '/refunds/stale', group: 'refund', label: '처리 지연 환불',
  permission: 'REFUND_READ', element: lazy(() => import('../pages/refund/StaleRefundsPage')) },
```

위 예시의 id · 경로 · label 은 설계 설명용이다. Variant 의 코드 · README · 시험에는 실험 2 과제의 id · 경로 · label 을 쓰지 않는다(체크리스트 6단계 내보내기 검사).

상세 화면(회원 상세, 주문 상세)은 메뉴에 넣지 않는다. A 는 표 항목에, B 는 `defineAdminPage` 인자에 `inMenu: false` 를 둔다. 그룹 안 메뉴 순서는 두 Variant 모두 label 가나다순이다(`ui.md`).

검토 결과:

| 질문 | 판단 |
|---|---|
| 너무 마술적인가 | `import.meta.glob` 은 Vite 공식 기능이고 수집 코드는 한 파일 약 30줄이다. 파일 첫 줄 주석에 수집 대상 경로를 적는다. backend 의 Spring component scan 도 같은 성격의 자동 등록이며 A 도 이미 쓰고 있다 |
| compile-time · static 확인 | `defineAdminPage` 의 인자 타입과 `Permission` union 타입은 `tsc` 가 각 파일에서 확인한다. 경로 · id 중복과 등록 누락(화면 디렉터리에 `admin-page.ts` 가 없음)은 compile 단계에서 잡히지 않아 `adminPages.test.ts` 가 시험 단계에서 잡는다 |
| 사람이 전체 구조를 보기 어려운가 | 전체 표를 파일 하나로 읽을 수 없다는 비용이 있다. `pnpm admin-pages` 가 경로 · 메뉴 · 권한 · 원본 파일 표를 출력하고, `grep -r "defineAdminPage(" src/features` 로도 목록을 얻는다. 이 비용은 사람 리뷰 항목(§16.3)에 넣는다 |
| generator 유지보수 부담 | 생성 파일과 생성 스크립트가 없다. 유지할 코드는 수집 함수, 정렬 함수, 검증 시험이다. 출력용 `pnpm admin-pages` 스크립트는 수집 함수를 그대로 쓴다 |
| IDE · 검색 | 경로 문자열 `'/refunds/stale'` 과 화면 컴포넌트 import 가 같은 파일에 있어 검색 한 번에 찾는다. "메뉴는 어디서 만들어지나" 는 `adminPages.ts` 에서 끊기므로 첫 줄 주석으로 안내한다 |
| 의미 충돌 | 메뉴 순서를 숫자로 지정하게 하면 두 Agent 가 같은 숫자를 고를 수 있다. 그룹 순서는 `shared/adminGroups.ts` 에 고정하고, 그룹 안은 label 가나다순으로 정렬한다. 경로 중복은 시험이 잡는다 |
| 중앙에 남기는 것 | `Permission` 목록, 역할별 권한, 메뉴 그룹 순서는 B 도 중앙에 둔다. 보안 기준과 전체 구조 기준이기 때문이다(`_research/10` §3). 실험 2 과제는 이 파일들을 고칠 필요가 없게 정했다 |

"중앙 파일이 없으니 B 가 좋다" 로 결론 내지 않는다. 결과 해석에서 다음 비용을 같이 기록한다.

- B 에서 등록 누락 · 경로 중복이 merge 후 시험에서만 드러난 횟수
- 사람 리뷰어가 전체 메뉴 구조를 파악하는 데 걸린 시간(§16.3)
- 기능이 4개뿐일 때는 A 의 표 하나가 더 단순하다는 점. `_research/12` 사례 2 의 판단을 유지한다

### 병합과 측정

1. 같은 기준 commit 에서 8개 실행을 한다. 동시 실행 수는 실행 계약 §4.2 (2개)를 따른다. 실행마다 별도 컨테이너와 별도 clone 을 써서 서로의 작업을 볼 수 없으므로, 동시 실행 수는 3번의 쌍별 충돌 결과에 영향을 주지 않는다(§15)
2. 실행이 끝나면 harness 가 각 결과를 branch `task/<ID>` 로 commit 한다
3. **쌍별 충돌**: 28개 쌍마다 기준 commit 에서 두 branch 를 3-way merge 해 충돌 파일과 hunk 수를 기록한다. 병합 순서에 영향을 받지 않는 지표다(`_research/sources.md` L1 과 같은 방식)
4. **순차 통합**: ID 사전순으로 통합 branch 에 병합한다. 충돌이 나면 통합 Agent(같은 모델, 고정 문구 "충돌을 해결하고 시험을 통과시켜라")가 해결한다. 병합마다 `./gradlew test`, `pnpm test`, `pnpm e2e` 를 실행한다
5. 마지막에 숨김 채점 8개를 전부 실행한다. 이 결과가 실험 2 의 숨김 채점 결과다. 실행마다 하는 채점(1번의 각 실행)은 개별 과제 판정으로 따로 기록한다(실행 계약 §6.4)

숨김 채점: 각 API 가 seed 에 대해 기대 행을 반환하는지, ADMIN · OPERATOR 로 로그인했을 때 메뉴에 이름이 보이고 화면이 열리는지, 로그인하지 않은 요청이 401 을 받는지.
OPERATOR 가 READ 권한을 모두 가지므로 8개 조회 화면에 접근하지 못하는 역할은 없다. 메뉴 정의의 권한 값이 틀려도 채점으로 드러나지 않는다(§17).

## 8.3 실험 3. 긴 부서명 UI 문제

과제 본문:

> 관리자 계정 목록에서 부서명이 80자 이상일 때 오른쪽 액션 버튼이 밀려난다. 고쳐 줘.

### 버그의 원인(두 Variant 동일)

공통 `DataTable` 의 셀 스타일이 `white-space: nowrap` 이고 표 컨테이너가 `overflow-x: auto` 다. 긴 부서명이 표 폭을 넓혀 1280px 화면에서 액션 열(수정, 비활성화)이 가로 스크롤 밖으로 밀려난다.
고칠 수 있는 위치는 세 가지다. `DataTable` 의 열 정의에 말줄임 옵션을 두는 방법, 관리자 계정 표의 열 폭만 고치는 방법, `nowrap` 을 전체에서 없애는 방법. 셋 다 채점을 통과할 수 있고, 위치는 사람 검토에서 기록만 한다(`_research/15` §10).

### 재현 경로

목표는 "브라우저 없이" 가 아니다. **사람이 애플리케이션을 직접 조작하지 않고 Agent 가 문제 상태를 만들고 검증할 수 있는가** 다. 두 Variant 모두 Playwright Chromium 이 설치돼 있다.

| 단계 | A | B |
|---|---|---|
| 상태 만들기 | backend 실행(`./gradlew bootRun`), frontend 실행(`pnpm dev`), E2E 보조 함수나 API 로 80자 부서명 계정 생성, 로그인, `/staff` 이동 | `StaffTable.stories.tsx` 에 `staffFixture({ department: ... })` 로 story 를 하나 추가 |
| 화면 확인 | Playwright 스크립트나 E2E 시험을 작성해 screenshot 또는 버튼 위치 측정 | `pnpm test:stories StaffTable` 로 Chromium 에서 story 실행, screenshot 또는 위치 측정 |
| backend 필요 여부 | 필요 | 불필요 |
| 최종 확인 | `pnpm e2e` | story 시험 + `pnpm e2e`. 실제 앱에서도 확인해야 완료로 본다 |

jsdom 시험은 layout 을 계산하지 않으므로 두 Variant 모두 이 버그를 jsdom 으로 재현할 수 없다. 이 사실은 두 Variant 에 같다.

### B 에 미리 있는 것과 없는 것

- 있음: `StaffTable` 의 `Default`, `Empty`, `Loading`, `Error`, `ManyRows` story, `staffFixture()` builder, story 실행용 Vitest browser project 설정
- 없음: 긴 부서명 story, 위치 측정 helper, 시각 기준 화면(§11.1)

### 숨김 채점

- API 로 부서명 80자, 120자 계정을 만든 뒤 1280×800 에서 `/staff` 를 연다. 1280×800 은 두 Variant 의 E2E viewport 다(`conventions.md` 의 지시로 Variant 에 들어가 Agent 가 볼 수 있다). `ui.md` 의 기준 화면 폭도 1280px 이다
- 가로 스크롤 없이, 모든 행의 액션 버튼이 보이고 bounding box 의 가로 범위가 표 컨테이너와 viewport 안에 있다. 액션 열을 고정(sticky)하는 수정도 이 조건을 만족한다
- 다른 목록 화면 4개의 seed 기준 screenshot 이 기준 화면과 같다
- 기준 commit 의 seed 데이터로 위 조건이 두 Variant 에서 이미 성립하는지 체크리스트 7단계에서 확인한다. 성립하지 않으면 채점이 버그와 무관한 이유로 실패한다

판정 화면 폭과 진단 화면 폭:

| 화면 폭 | 구분 | 판정 · 점수 | 실행 위치 |
|---|---|---|---|
| 1280×800 | 판정(normative) | 위 조건의 통과 여부가 실험 3 의 숨김 채점 결과다 | 묶음 `exp3`(`lab/grading/tasks/exp3/`) |
| 1024×768 | 진단(diagnostic) | 쓰지 않는다. 실패해도 숨김 채점 결과, 실험 3 성공 여부, 지표에 영향이 없다 | 묶음 `diag-exp3-1024`(`lab/grading/diagnostics/`) |

1024×768 은 과제 문구, `ui.md`, Variant 의 E2E 설정에 없는 화면 폭이다. 판정에 넣으면 Agent 에게 공개하지 않은 요구사항을 숨김 채점이 검사하게 된다. 그래서 같은 조건을 실행해 결과, screenshot, 측정값만 기록한다.
진단 묶음은 판정 묶음과 별도로 순서대로 실행해 종료 코드 · JUnit 파일 · 애플리케이션 프로세스 · 계정 loginId 를 공유하지 않는다. `run.sh` 는 진단 묶음을 다른 묶음과 함께 받으면 거부한다. harness 는 진단 묶음의 결과(실패 · 오류 · 시간 초과 포함)를 실행 상태와 재실행 판단에 쓰지 않는다.

부서명 전체 문자열을 화면에서 확인할 수 있는지(텍스트나 `title` 속성)는 과제 문구에 없으므로 채점하지 않고 사람 검토에서 기록한다.

사전 등록 예측: B 가 첫 재현까지 명령 수와 시간이 적다. 성공률은 차이가 작다. A 에서 재현 없이 CSS 를 먼저 고치는 실행이 더 많다.

---

# 9. 공통 acceptance test

`lab/grading/` 은 숨김 채점이다. 실행용 저장소에 넣지 않는다.

| 구분 | 내용 | 도구 |
|---|---|---|
| 기본 동작 | §4.2 의 규칙, 상태 전이, 권한, 입력 검증. 시나리오 ID 별 1개 이상 | Playwright `request`(HTTP) |
| 화면 | 화면 9개 진입, 목록 열 구성, 쓰기 버튼 권한별 노출(OPERATOR 는 `DELIVERY_WRITE` 외 쓰기 버튼 없음). 요소는 role 과 접근 가능한 이름(`ui.md` 의 버튼 이름)으로 찾는다 | Playwright browser |
| 과제별 채점 | `grading/tasks/exp1`, `exp2/<ID>`, `exp3` | Playwright |
| 동일성 검사 | §16.2 의 API 응답 비교, 화면 screenshot 비교 | 스크립트 |

실행 방식: Variant 의 backend jar 를 빌드하고 frontend `dist/` 를 Spring 정적 자원 경로로 지정해 한 port 로 띄운 뒤 채점 시험을 실행한다.
A 와 B 의 기준 commit 에서 기본 동작 · 화면 채점 시험이 모두 통과해야 실험을 시작한다. 한쪽만 실패하면 구조 비교 전에 기능 차이를 고친다(`_research/16` §7).

Agent 가 보는 시험은 각 Variant 안의 시험(§10)뿐이다. 숨김 채점은 "완료 선언 후 숨김 시험 실패"(`_research/14` §13)를 측정하는 데 쓴다.

---

# 10. Variant 별 내부 시험

## 10.1 시험 수 동일 규칙

- `lab/spec/scenarios.md` 의 시나리오 ID 마다 두 Variant 에 같은 입력 값으로 같은 단계의 시험이 하나씩 있다
- 시험 이름에 ID 를 넣는다. 예: `@DisplayName("[DLV-03] VIP 150,000원 이상은 무료배송")`
- 스크립트가 두 Variant 의 ID 집합을 비교해 같아야 통과한다(§16.2)
- 시나리오에 속하지 않는 시험은 구조 시험으로 따로 센다

| 구분 | A | B |
|---|---|---|
| 업무 단위 시험(Spring 없음) | 시나리오 ID 별 | 같은 ID, 같은 값 |
| web slice 시험(`@WebMvcTest`) | 영역별 | 같은 ID |
| 통합 시험(`@SpringBootTest`) | 2개(주문 흐름, 환불 흐름) | 같은 2개 |
| frontend component 시험(jsdom) | 화면 · 표시 컴포넌트별 | 같은 ID. 렌더링 대상이 story 인지 inline 데이터인지만 다르다 |
| E2E | `E2E-01` ~ | 같은 ID |
| 구조 시험 | ArchUnit 레이어 규칙 2개 | ArchUnit 경계 규칙 4개, ESLint 경계 규칙, `adminPages.test.ts` |
| story 실행 | 없음 | 표준 상태 story(목록 화면 5개 × 5개 상태 예상) |

story 실행과 구조 시험은 B 의 처리 요소이므로 차이 대장에 들어 있다. 결과 보고에는 시험 수를 이 표의 구분별로 따로 적는다.

## 10.2 검증 단계

| 단계 | 검사 대상 | 명령 예(A / B) | 예상 시간 | 실패 시 Agent 가 얻는 정보 |
|---|---|---|---|---|
| 1. 수정한 곳 | 고친 규칙의 단위 시험 | `./gradlew test --tests '*DeliveryFeePolicyTest'` / 같음, `pnpm vitest run <파일>` | backend 5~20초(warm daemon), frontend 2~5초 | 시나리오 ID, 기대값과 실제값 |
| 2. 기능 전체 | 한 영역의 단위 · slice 시험, story 실행 | `--tests '*Delivery*'` / `--tests 'com.example.shop.delivery.*'`, `pnpm test:stories delivery` | 10~30초 | 같은 영역의 다른 시나리오 실패 |
| 3. 연결된 기능 | backend 전체 단위 · slice · 구조 시험, frontend 전체 jsdom 시험 | `./gradlew test`, `pnpm test` | 30~90초 | 다른 영역 시나리오 실패, 구조 규칙 위반(위반 클래스와 규칙 이름) |
| 4. 공통 acceptance | 실제 앱을 띄운 E2E | `pnpm e2e` | 1~3분 | 화면 · API 단위 실패, Playwright trace |
| 5. 전체 regression | 1~4 전부 | `./scripts/verify-all.sh`(두 Variant 동일 이름) | 3~5분 | 위 전부 |

예상 시간은 추정이다. 구현 후 같은 기계에서 10회 측정해 중앙값으로 바꾼다.
이 코드베이스는 작아서 3단계도 1분 안팎으로 예상한다. 따라서 backend 의 "바로 확인" 차이는 작게 나올 가능성이 높다. 이것은 알려진 한계로 기록한다(§17).

2단계 기능 필터의 위험: B 의 package 필터는 다른 기능의 시험을 빼므로, 실험 1 처럼 다른 기능이 규칙을 쓰면 실패를 놓친다. README 의 검증 안내는 두 Variant 모두 "완료 전 `./gradlew test` 와 `pnpm test` 실행" 을 같은 문장으로 적는다.

---

# 11. UI 상태 재현 방식

## 11.1 B

- 목록 표시 컴포넌트(`MemberTable`, `OrderTable`, `DeliveryTable`, `RefundTable`, `StaffTable`)마다 `Default`, `Empty`, `Loading`, `Error`, `ManyRows` story
- 영역별 `fixtures.ts` 에 `staffFixture(overrides)`, `staffListFixture(count, overrides)` 같은 builder. seed 와 같은 값 규칙을 쓴다
- `pnpm test:stories [필터]` 가 Vitest browser mode(Playwright Chromium)로 story 를 렌더링하고 오류 없이 그려지는지 확인한다
- v0.1 의 B 에는 시각 기준 화면(`toMatchScreenshot`)을 두지 않는다. A 에 대응하는 시험이 없고, 실험 3 숨김 채점의 "다른 목록 화면 screenshot 비교" 를 B 안에서만 미리 검사하게 되기 때문이다
- `pnpm test` 는 두 Variant 모두 jsdom 시험만 실행한다. B 의 Vitest 설정은 `unit`(jsdom)과 `storybook`(browser) 두 project 를 두고, `pnpm test` 는 `vitest run --project=unit`, `pnpm test:stories` 는 `vitest run --project=storybook` 이다. A 의 `pnpm test` 는 `vitest run` 이다
- Storybook 화면(`pnpm storybook`)은 사람이 상태를 둘러보는 용도다. 시험은 Storybook 서버 없이 실행된다

## 11.2 A

- 표시 컴포넌트의 jsdom 시험이 시나리오 ID 별로 있다
- 실제 앱 E2E 와 보조 함수(`e2e/helpers/session.ts` 의 `login`, `e2e/helpers/api.ts` 의 `createStaff`)가 있다
- 새 상태를 보려면 앱을 띄우고 데이터를 만들고 화면에 들어가야 한다

## 11.3 두 Variant 공통

- Playwright Chromium, 고정 글꼴, 고정 viewport, `TZ=Asia/Seoul`, `LANG=ko_KR.UTF-8`
- E2E 의 port 는 환경 변수(`APP_PORT`)로 받고 `reuseExistingServer: false` 로 다른 실행의 서버에 붙지 않는다
- Agent 는 `Read` 도구로 PNG screenshot 을 볼 수 있다. 두 Variant 에 같은 조건이다

---

# 12. Architecture rule

## 12.1 B 에 넣는 규칙

| ID | 규칙 | 도구 | 유지 근거 |
|---|---|---|---|
| R1 | 다른 기능의 `..<기능>.internal..` 클래스를 참조하지 않는다 | ArchUnit | 정보 은닉의 경계. 이것이 깨지면 공개 contract 가 의미를 잃는다 |
| R2 | 기능 package 사이에 순환 의존이 없다 | ArchUnit `slices().matching("com.example.shop.(*)..").should().beFreeOfCycles()` | 순환이 생기면 기능 단위 수정 · 검증이 불가능해진다 |
| R3 | `shared` 는 기능 package 를 참조하지 않는다 | ArchUnit | `shared` 가 모든 기능에 의존하는 공용 저장소가 되는 것을 막는다 |
| R4 | 기능 사이 의존은 §7.3 의 허용 방향만 따른다 | ArchUnit, 허용 표를 시험 코드 한 곳에 둔다 | 새 의존이 생기면 의도한 변경인지 사람이 판단하게 한다 |
| R5 | frontend 에서 다른 기능은 `@/features/<영역>` 의 `index.ts` 로만 import 한다 | ESLint `no-restricted-imports` | R1 의 frontend 판. 다른 기능 내부 상태 · 컴포넌트 직접 참조도 이 규칙으로 막힌다 |

R4 는 의존이 바뀔 때마다 허용 표를 고쳐야 한다. 표가 중앙 수정 지점이 되는 비용이 있다. 기능 사이 의존 추가는 드물고 리뷰가 필요한 변경이므로 유지한다. 실험 2 과제는 새 기능 사이 의존을 만들지 않는다.

## 12.2 A 에 넣는 규칙

| ID | 규칙 |
|---|---|
| L1 | `controller` 는 `repository` 를 참조하지 않는다 |
| L2 | `service` · `repository` · `domain` 은 `controller` · `dto` 를 참조하지 않는다 |

A 도 자기 구조의 약속을 기계로 검사한다. A 와 B 의 차이는 검사 유무가 아니라 검사 대상(레이어 대 기능 경계)이다.

## 12.3 넣지 않는 규칙

| 후보 | 제외 이유 |
|---|---|
| 클래스 이름 접미사, 파일 길이, 함수 길이 | 취향이고 정상적인 리팩토링을 막는다(`_research/10` §4) |
| "무료배송 판단은 `DeliveryFeePolicy` 밖에서 하지 않는다" | 판단 여부를 정적으로 정확히 구분할 수 없다. `isFreeShipping` 호출 위치만 세는 규칙은 우회가 쉽고 오탐이 생긴다 |
| 기능 내부 레이어 규칙(`internal` 안의 controller → repository) | A 의 L1 과 같은 내용이다. B 에 넣으면 B 의 규칙 수만 늘어난다. 넣는다면 A 와 같은 내용으로 양쪽에 넣는다 |
| frontend 순환 의존 | 관리자 화면 기능끼리 서로 import 할 이유가 적다. 실행 비용 대비 효과가 낮다 |
| 화면마다 story 필수 | 시험 수를 늘리는 규칙이며 오래 유지할 약속이 아니다 |

---

# 13. 오류 · 로그 전략

API 응답은 두 Variant 가 같다.

```json
{ "code": "REFUND_STATE_INVALID", "message": "배송 중인 주문은 환불을 요청할 수 없습니다." }
```

| 항목 | A | B |
|---|---|---|
| 오류 코드 정의 위치 | `common/error/ErrorCode` enum 하나 | `shared/error/ErrorCode` enum 하나. 내용은 A 와 같다 |
| 업무 오류 로그 | WARN, `code`, 메시지 | 같음 |
| 시스템 오류 | ERROR, stack trace | 같음 |
| 민감 정보 | 이메일 · 이름 · 세션 값을 로그에 남기지 않는다 | 같음 |
| 시험 실패 메시지 | AssertJ 기본 메시지 + 시나리오 ID | 같음 |

D6(기능별 오류 코드, 로그의 `feature` · `operation`)는 v0.1 에서 제외한다. 기능별 enum 을 쓰면 `throw` 줄이 `ErrorCode.X` 에서 `RefundErrorCode.X` 로 바뀌어 업무 로직 본문 동일 조건(§6.1, §16.2)과 충돌하고, v0.1 의 세 실험은 이 차이를 측정하지 않는다. 이후 환불 실패 진단 실험(`_research/12` 사례 6)에서 다시 설계한다.
A 의 중앙 `ErrorCode` enum 은 새 오류 코드를 만드는 작업에서 공통 수정 지점이 된다. 실험 2 과제는 새 오류 코드를 만들지 않는다.

---

# 14. 측정 방법

## 14.1 원칙

Agent 의 자연어 보고는 측정에 쓰지 않는다. 도구 호출 기록, 명령 기록, git diff, 시험 산출물만 쓴다.
지표 계산 스크립트는 실험 시작 전에 고정하고 commit 한다. 계산 중에 Variant 이름을 쓰지 않고 실행 ID 만 쓴다.

## 14.2 Claude Code 에서 얻는 기록

2026-10-03 에 Claude Code 2.1.287 과 공식 문서로 확인한 내용이다.

| 기록 | 얻는 방법 | 담긴 정보 | 근거 |
|---|---|---|---|
| 이벤트 stream | `claude -p --output-format stream-json --verbose --include-hook-events` | 도구 호출(`tool_use` 이름 · 입력), 도구 결과, 마지막 `result` 의 소요 시간 · turn 수 · 비용 · token | `claude --help` |
| 세션 기록 | `$CLAUDE_CONFIG_DIR/projects/<경로>/<session-id>.jsonl` | 항목별 `timestamp`, `tool_use` 입력, `toolUseResult`(Bash 는 `stdout`, `stderr`, `interrupted`), 실패한 Bash 결과의 `Exit code N` | 로컬 세션 기록 확인 |
| hook 기록 | `PreToolUse`, `PostToolUse` hook 이 입력 JSON 을 파일에 추가 | `tool_use_id`, `tool_name`, `tool_input`, `tool_response`(Bash 의 `exit_code` 포함). 입력에 timestamp 필드는 없으므로 hook 이 기록 시각을 붙인다 | https://code.claude.com/docs/en/hooks |
| 세션 ID 고정 | `--session-id <uuid>` | 실행 ID 와 세션 기록 연결 | `claude --help` |

hook 은 기록만 하고 출력과 결정을 내지 않는다. hook 설정은 harness 가 `--settings` 로 넘기며 실행용 저장소에 없다.

## 14.3 시험 산출물 수집

- `PostToolUse` hook 이 Bash 명령을 시험 명령 패턴(`gradlew .*test`, `vitest`, `pnpm (test|e2e|test:stories)`, `playwright test`)으로 판정하면 `backend/build/test-results/`, `frontend/test-results/`, `frontend/reports/junit*.xml` 중 그 명령의 `PreToolUse` 기록 시각 이후 수정된 파일만 `artifacts/test-<순번>/` 으로 복사한다. Gradle 은 이번에 실행하지 않은 시험 클래스의 이전 XML 을 지우지 않으므로, 시각으로 거르지 않으면 이전 결과를 이번 결과로 잘못 센다
- Vitest · Playwright 의 JUnit reporter 는 두 Variant 설정에 같게 넣는다
- 실행 종료 후 harness 가 5단계 전체 검증을 따로 실행하고 시간을 잰다. Agent 의 실행 시간과 섞지 않는다

## 14.4 지표 정의

| 지표 | 계산 |
|---|---|
| 읽은 파일 수 | `Read` 도구의 서로 다른 경로 수 + Bash 의 `cat`, `sed -n`, `head`, `tail`, `less` 가 연 파일 경로 수. 두 값을 따로 보고한다 |
| 검색 횟수 | `Grep`, `Glob` 호출 수 + Bash 첫 프로그램이 `grep`, `rg`, `find`, `fd`, `git grep`, `ls -R` 인 명령 수 |
| 첫 관련 영역 도달 | 최종 diff 의 운영 코드 파일(또는 그 파일이 속한 기능 디렉터리)을 처음 읽은 시점까지의 도구 호출 수와 시간. 정답 파일을 미리 고정하지 않고 실행 후 diff 로 정한다(`_research/17` §2) |
| 수정 파일 수 | 기준 commit 대비 `git diff --name-status` + 추적되지 않은 새 파일. build 산출물 제외 |
| 되돌린 수정 | 실행 중 `Edit` · `Write` 대상이었지만 최종 diff 에 없는 파일 수 |
| 공통 파일 수정 | 사전 등록한 공통 경로 목록(`src/app/**`, `common/**`, `config/**`, `shared/**`, build 파일)에 속한 변경. 두 Variant 의 경로 패턴을 합친 하나의 목록이라 계산에 Variant 이름이 필요 없다. A 에는 `shared/` 가, B 에는 `common/` · 최상위 `config/` 가 없다 |
| 첫 신뢰 가능한 시험 시간 | 실행 시작부터, 첫 운영 코드 수정 이후 실행된 시험 명령 중 JUnit XML 에 시험 1개 이상이 기록된 첫 명령이 끝난 시점까지. compile 오류로 시험이 실행되지 않은 명령은 제외 |
| 전체 시험 시간 | harness 가 실행 후 따로 잰 5단계 검증 시간 |
| 재시도 횟수 | 첫 실패 시험 명령 이후 첫 성공까지 실행한 시험 명령 수. 수정 없이 같은 명령을 다시 실행한 횟수는 따로 센다 |
| merge conflict | 실험 2 의 28쌍 3-way merge 결과. 충돌 쌍 수, 충돌 파일, hunk 수 |
| merge 후 시험 실패 | 실험 2 순차 통합에서 병합마다 실행한 검증의 실패 수와 실패 시험 ID |
| 요청 범위를 넘은 변경 | 자동 표시(과제 영역 밖 파일, build · lock 파일, 삭제 파일, seed 변경)와 사람 검토 판정을 따로 기록한다. 자동 표시는 판정이 아니다 |
| 숨김 채점 | 과제별 채점 통과 여부, 실패 항목 |
| 최종 diff | `final.patch` 원문 보관 |
| 비용 | `result` 의 token · 비용 · turn 수 |

## 14.5 실행 기록 형식

디렉터리 구성, 설정(`run.json`)과 관찰(`result.json`)의 분리, 원본(`raw/`)과 정규화 결과의 분리는 실행 계약 §8 이 기준이다. 아래 목록은 각 기록의 내용이다. 숨김 채점 결과는 `grading.json` 대신 `result.json` 의 `grading` 에 들어가고, 진단 묶음 결과는 판정 결과와 분리된 `grading.diagnostic` 에 들어간다.


```
run.json          실행 ID, 날짜, 과제, Variant(a · b. 지표 계산은 읽지 않는다, 실행 계약 §8.1), 기준 commit, Claude Code 버전, 모델, effort,
                  도구 목록, 시간 제한, 예산 제한, 컨테이너 이미지 digest
stream.jsonl      stream-json 원본. 수신 시각은 원본 줄을 바꾸지 않고 별도 파일에 둔다(실행 계약 §8.4)
transcript.jsonl  세션 기록 원본
hooks.jsonl       hook 기록
artifacts/        시험 산출물 순번별 복사본
final.patch       최종 diff
verify.json       harness 의 5단계 검증 결과와 시간
grading.json      숨김 채점 결과
metrics.json      §14.4 지표 계산 결과
review.json       사람 검토 결과
```

## 14.6 반복과 순서

- 첫 실행은 harness 확인용 pilot 이다. 결과에 넣지 않는다
- 실험 1, 3: Variant 당 5회. A/B 실행 순서는 무작위로 섞는다. 시간 지표 때문에 동시에 실행하지 않는다
- 실험 2: Variant 당 3회(1회 = 8개 실행, 동시 2개). 결과 변동이 크면 반복을 늘린다
- 실행당 시간 제한 45분, 예산 제한 USD 15(`--max-budget-usd`). 전체 예산과 재실행 정책은 실행 계약 §5, §7
- 세션 수 합계: 실험 1 10회, 실험 3 10회, 실험 2 48회와 통합 Agent 실행

## 14.7 사람 검토

- 검토자 2명이 `final.patch` 를 `_research/14` §12 의 질문으로 판정한다
- 경로 이름으로 Variant 를 알 수 있으므로 완전한 맹검은 불가능하다. 실행 ID 만 보여 주고, 판정 기준을 미리 고정하고, 두 검토자의 불일치를 기록한다

---

# 15. Agent 실행 격리

## 15.1 실행용 저장소 내보내기

`harness/export.sh <variant>` 가 다음을 만든다.

- `lab/variants/<variant>/` 만 담은 새 git 저장소. 저장소 이름은 두 Variant 모두 `shop-admin`
- commit 1개, 메시지 `Initial commit`. 작성 이력에 실험 의도가 드러날 수 있어 이력을 넘기지 않는다
- `_research`, `_design`, `lab/spec`, `lab/grading`, `lab/tasks`, 다른 Variant 는 넣지 않는다
- `CLAUDE.md`, `AGENTS.md`, `.claude/` 는 두 Variant 모두 두지 않는다. README 만 둔다
- 내보낸 저장소에서 `agentic`, `variant`, `실험`, `experiment` 문자열을 검색해 0건이어야 한다

## 15.2 실행 단위

**실행마다 컨테이너 1개, 저장소 clone 1개를 쓴다.** git worktree 는 쓰지 않는다. worktree 는 `.git` 의 ref 를 공유하므로 실험 2 에서 한 Agent 가 `git branch -a` 나 `git log --all` 로 다른 Agent 의 작업을 볼 수 있다.

| 자원 | 충돌 원인 | 대책 |
|---|---|---|
| build 산출물 | 같은 작업 트리 공유 | 실행마다 별도 clone. `build/`, `.gradle/`, `node_modules/.vite` 가 실행마다 따로 생긴다 |
| port | backend 8080, Vite 5173 동시 사용 | 컨테이너마다 network namespace 가 따로라 충돌하지 않는다. 컨테이너 밖 실행을 위해 port 는 환경 변수로 받는다 |
| temp directory | `/tmp` 공유 | 컨테이너마다 별도 `/tmp` |
| test DB · 파일 | H2 파일 공유 | H2 in-memory, Spring 의 고유 DB 이름 생성(`spring.datasource.generate-unique-name` 기본값) 사용. 파일 DB 금지 |
| frontend dev server | 다른 실행의 서버에 붙음 | Playwright `reuseExistingServer: false`, 컨테이너 분리 |
| Gradle cache | `~/.gradle` lock 경쟁, cache 상태 차이로 시간 측정 오염 | 실행마다 빈 `GRADLE_USER_HOME`. 의존성은 이미지에 미리 받아 둔 읽기 전용 cache(`GRADLE_RO_DEP_CACHE`, 이미지 안 경로)로 읽는다. harness 가 Agent 시작 전에 이미지의 `wrapper/dists` 를 빈 `GRADLE_USER_HOME` 으로 복사한다. Agent 명령에 `--offline` 은 필요 없다. Gradle 9.8.0 에서 확인한 절차와 결과는 §3.5 |
| pnpm | store 쓰기 경쟁 | 이미지에 store 를 두고 Agent 시작 전 harness 가 `pnpm install --offline --frozen-lockfile` 실행. 설치 시간은 측정에서 뺀다 |
| Playwright 브라우저 | 다운로드 필요 | 이미지에 설치, `PLAYWRIGHT_BROWSERS_PATH` 고정 |
| Claude Code 설정 | 사용자 전역 `CLAUDE.md`, hook, skill, MCP, memory 가 섞임 | 실행마다 빈 `CLAUDE_CONFIG_DIR`, `--strict-mcp-config`(빈 설정), `--settings harness-settings.json`(기록용 hook 만), `DISABLE_AUTOUPDATER=1`, CLI 버전 고정 설치 |
| CPU · 메모리 | 동시 실행 컨테이너끼리 경쟁 | 컨테이너마다 같은 제한(CPU 4개, 메모리 8GB). 동시 실행은 실험 2 의 2개까지(실행 계약 §4.2). 실험 2 의 시간 지표는 참고값으로만 쓴다 |

Gradle 읽기 전용 cache 와 pnpm store 는 두 Variant 의 build 파일과 lockfile 이 확정된 뒤 그 파일로 seed 해서 이미지에 넣는다(체크리스트 7단계 첫 항목). 3단계 이미지를 기반으로 cache 층만 더해 글꼴 · Chromium 을 바꾸지 않는다. 실험 3 기준 screenshot 과 7단계 보정 실행부터 이 이미지를 쓴다. seed 는 `./gradlew build`(Spotless 검사 포함)와 `pnpm install` 을 두 Variant 에서 모두 실행해 만든다. 3단계 pilot 이미지에는 아직 넣지 않는다.

## 15.3 보안

- 실제 secret 을 쓰지 않는다. seed 의 로그인 계정은 시험용이며 README 에 적는다
- 컨테이너 외부 통신은 Anthropic API 도메인만 허용한다. Claude Code 공식 dev container 의 `init-firewall.sh` 방식을 따른다(https://code.claude.com/docs/en/devcontainer)
- API 인증 값은 환경 변수로만 넣고 저장소 · 이미지에 넣지 않는다. 실험 전용 Console workspace 의 API key 와 workspace spend limit 을 쓴다(실행 계약 §4.4)
- `WebSearch` · `WebFetch` 도구를 두 Variant 모두 끈다. 이 저장소가 공개돼 있고 `WebSearch` 는 컨테이너 egress 제한을 거치지 않는다(실행 계약 §3)
- 컨테이너는 non-root 사용자로 실행하고 `--dangerously-skip-permissions` 는 이 조건에서만 쓴다. 공식 문서는 이 플래그를 non-root 컨테이너와 egress 제한을 함께 쓸 때 권한다
- 운영 환경 접근 경로가 없다. host 디렉터리는 실행 계약 §4.3 의 경로만 연결한다. `run.json` 같은 실행 기록은 연결하지 않는다

---

# 16. 실험 공정성 검토

## 16.1 위협과 대책

| 위협 | 대책 | 남는 위험 |
|---|---|---|
| A 를 허수아비로 만듦 | §5.3 의 A 유리 원칙, 사람 리뷰어의 "실무 수용" 승인, §2.2 (1)(3) 수정 | 리뷰어 한 명의 기준 |
| B 에 정답이 들어 있음 | §2.2 (2) 수정, 과제별 "미리 있는 것과 없는 것" 명시(§8.3) | 표준 상태 선택이 우연히 버그와 가까울 수 있다 |
| 시험 수 차이 | 시나리오 ID 집합 동일 검사, 시험 수를 구분별로 보고 | B 의 story 실행은 처리 요소로 남는다 |
| 코드 양 차이 | 운영 · 시험 · 처리 요소 LOC 와 파일 수를 따로 보고 | B 의 파일 수가 많다(interface, `admin-page.ts`, story) |
| framework 특성 오염 | 같은 stack, Spring Modulith 미사용, glob 은 Vite 표준 기능 | `import.meta.glob` 은 Vite 전용이다. 책에서는 같은 원리의 다른 도구를 함께 적는다 |
| Agent instruction 차이 | 같은 과제 문구, 저장소 안 지침 파일 없음, README 절 구성 동일 | README 내용은 구조를 설명하므로 다르다 |
| 실험 의도 노출 | 내보내기 검사(§15.1), 이력 제거, 중립 이름 | 구조 자체에서 의도를 추측할 수 있다 |
| 숨은 정답 | 정답 파일을 미리 고정하지 않는다. 채점은 동작 기준 | 사람 검토의 위치 판정은 주관이 들어간다 |
| 측정 도구 편향 | 지표 스크립트 사전 고정, Variant 를 모르는 계산 | 분류 규칙(검색 · 읽기)이 명령 형태에 따라 놓치는 경우 |
| 같은 작성자가 두 Variant 를 만듦 | A 를 연구 문서 없이 명세만 받은 별도 세션이 만든다. B 는 A 를 차이 대장대로 재구성한다 | 명세와 과제를 같은 사람이 썼다 |
| B 설계자가 A 의 약점을 앎 | 아래 "B 를 A 에서 파생하는 이유와 남는 위험" | 완전히 제거되지 않는다 |

### B 를 A 에서 파생하는 이유와 남는 위험

B 를 완성된 A 에서 파생하는 목적은 세 가지다.

- 업무 로직 동일성 보장: 메서드 본문을 옮기기만 하므로 두 Variant 의 업무 동작이 같다
- B 가 더 좋은 업무 로직을 갖는 것 방지: B 를 따로 구현하면 두 번째 구현이 첫 구현의 버그와 모호한 처리를 고친 상태로 나올 수 있다
- D1 ~ D7 이외 차이 최소화: 차이가 생길 수 있는 지점을 차이 대장 항목으로 한정한다

**남는 위험: B 설계자가 A 의 구조와 약점을 이미 알고 있기 때문에 B 가 의도적으로 유리해질 가능성은 완전히 제거되지 않는다.** 과제 세 개를 정한 사람과 B 를 재구성하는 사람이 같으면 과제가 건드리는 지점을 B 에서만 정리할 수 있다.

완화 방법:

- 차이 대장 외 변경 금지: B 의 변경은 §6.4 의 D1 ~ D7 로만 설명돼야 한다. 체크리스트 5단계는 차이 대장 ID 마다 commit 을 따로 만든다
- parity 검사: §16.2 의 API · 화면 · 시나리오 ID · 업무 로직 본문 · 의존성 비교가 차이 0 이어야 한다
- 사람 검토: §16.3 에서 B 의 commit 별 diff 가 해당 차이 대장 ID 하나로 설명되는지 판정한다

## 16.2 동일성 검사(기계)

| 검사 | 방법 | 통과 기준 |
|---|---|---|
| API 동일 | 두 Variant 를 seed 로 띄우고 모든 GET endpoint 응답 JSON 비교, 오류 응답 표본 비교 | 차이 0 |
| 화면 동일 | 화면 9개를 seed 데이터로 screenshot, 픽셀 비교 | 차이 0 |
| 시나리오 동일 | 시험 이름의 ID 집합 비교 | 동일 |
| 업무 로직 동일 | 규칙 클래스와 service 의 메서드 본문 비교(정규화는 표 아래) | 동일 |
| 의존성 동일 | Gradle 의존성 목록, `pnpm-lock.yaml` 비교 | 차이 대장 D5 의 패키지(`storybook`, `@storybook/react-vite`, `@storybook/addon-vitest`, `@vitest/browser-playwright`)와 그 전이 의존성만 차이 |
| 내보내기 검사 | §15.1 의 문자열 검색 | 0건 |
| 규모 보고 | 운영 · 시험 · 처리 요소 LOC, 파일 수, cold build 시간, 전체 시험 시간 | 업무 동작 시험 LOC 차이 20% 이내(잠정). 기준값은 §19.4 [결정 필요] |

업무 로직 비교의 정규화: package · import 줄은 뺀다. service 는 대응표로 주입 타입 이름(`MemberService` 와 `MemberQuery`)과 필드 이름(`memberService` 와 `memberQuery`)을 같은 이름으로 바꾼다. 그래서 B 의 공개 interface 메서드 이름은 A 에서 부르던 service 메서드 이름과 같게 둔다(`gradeOf`).

## 16.3 사람 검토(구현 완료 시점)

검토자에게 A, B 를 각각 보여 주고 다음을 판정받는다.

- 이 구조를 실무 PR 로 받았을 때 승인하는가. A 가 승인되지 않으면 A 를 고친다
- B 의 commit 마다 diff 가 commit 메시지의 차이 대장 ID 하나로 설명되는가. 설명되지 않는 변경은 되돌린다
- VIP 무료배송 기준이 어디에 있는지 찾는 데 걸린 시간
- 새 관리자 화면을 추가하려면 어떤 파일을 만들고 고쳐야 하는지 설명하는 데 걸린 시간
- 전체 메뉴 구조를 말로 설명하는 데 걸린 시간
- 구조가 이해하기 어려운 지점

## 16.4 B 가 사람에게 더 어려운 부분

- 전체 메뉴를 파일 하나로 볼 수 없다. 출력 명령이나 grep 이 필요하다
- `internal` 과 공개 interface 때문에 같은 기능이 package 두 개로 나뉜다. `DeliveryFeeQuery` 와 `DeliveryFeeQueryService` 처럼 위임만 하는 클래스가 생긴다
- story 와 fixture 를 화면 변경 때 같이 고쳐야 한다
- ArchUnit 위반 메시지가 처음 보는 사람에게 낯설다
- R4 허용 표를 기능 사이 의존이 바뀔 때마다 고쳐야 한다

이 비용은 결과 보고의 "사람에게도 좋은가" 항목(`_research/12` 결과 읽는 방법)에 그대로 적는다.

## 16.5 자체 검토 기록

초안을 세 번 다시 읽고 고친 내용이다.

1회차:
- B 의 controller 를 use case 단위로 쪼개는 안을 뺐다. 실험 2 충돌 감소의 원인을 D4 와 나눌 수 없고 B 의 파일 수만 늘린다
- B 의 API client 를 화면 단위로 쪼개는 안을 뺐다. 같은 이유다
- A 에도 ArchUnit 레이어 규칙을 넣었다. "B 만 자동 검사가 있다" 는 차이를 "검사 대상이 다르다" 로 바꿨다
- B 에 Spring Modulith 를 쓰는 안을 뺐다. framework 특성이 결과에 섞인다
- 실험 1 의 예측에 B 의 기능 단위 검증이 다른 기능 시험을 놓치는 위험을 적었다. B 가 불리할 수 있는 지점을 사전 등록한다

2회차:
- 실험 2 에서 새 권한을 만드는 과제를 뺐다. 권한을 기능별로 흩으면 보안 기준이 분산돼 `_research/10` §3 과 충돌하고, 중앙에 두면 B 도 같은 파일을 고친다. v0.1 은 기존 권한을 쓰는 조회 화면으로 한정하고 한계에 적었다
- 메뉴 순서를 숫자로 정하는 안을 뺐다. 병렬 작업에서 같은 숫자를 고르는 의미 충돌이 B 에만 생긴다
- 실험 3 의 B 에서 시각 기준 화면을 표준 상태만 두도록 했다. 긴 부서명 기준 화면이 있으면 정답이 들어간다(이후 §20.2 에서 시각 기준 화면 자체를 v0.1 에서 제외했다)
- 실행 단위를 worktree 에서 clone 으로 바꿨다. ref 공유로 다른 Agent 작업이 보인다
- `staff` 영역 추가 이유를 적었다. 요청의 네 영역 범위를 넘는 변경이기 때문이다

3회차(작성 완료 후 재독):
- §7.4 예시에서 A 의 환불 service 가 회원 등급을 다른 방식으로 얻고 있어 "업무 로직 본문 동일" 과 맞지 않았다. A 도 `MemberService.gradeOf` 를 부르게 고치고, 동일성 검사에서 주입 타입 이름을 맞춘 뒤 비교하도록 했다
- 시험 산출물 수집이 Gradle 의 이전 XML 을 이번 결과로 셀 수 있었다. 명령 시작 시각 이후 수정된 파일만 복사하도록 고쳤다

---

# 17. 알려진 한계

- 코드베이스가 작아서 탐색 비용과 검증 시간 차이가 실제 업무 저장소보다 작게 나올 것이다. 차이가 없게 나오면 "이 규모에서는 차이가 없다" 로만 해석한다
- 모델 하나, 도구 하나(Claude Code)로 시작한다. 같은 모델이라도 실행 도구에 따라 행동이 달라진다는 보고가 있다(`_research/sources.md` K2)
- 실행당 5회 반복으로는 큰 차이만 구분할 수 있다
- 시작 시점 한 번의 작업만 본다. B 의 경계 검사가 효과를 내는 장기 변경(`_research/12` 사례 9)은 v0.1 범위 밖이다
- backend 는 Spring 이 이미 Controller 를 자동 등록하므로 실험 2 의 A/B 차이가 frontend 에 집중된다. 다른 framework 에서는 backend 중앙 등록 파일이 있을 수 있다
- 스키마 변경, 새 권한, 새 오류 코드처럼 중앙 파일을 피하기 어려운 변경은 실험 2 에 넣지 않았다
- 경로 이름으로 Variant 를 알 수 있어 사람 검토의 맹검이 불완전하다
- 명세 · 과제 · 두 Variant 의 설계를 같은 연구자가 했다
- Claude Code 버전이 바뀌면 결과가 달라질 수 있다. 실험 기간 동안 버전을 고정한다
- 실행 기계가 개인 작업용 Mac 이다. 실험 1 · 3 실행 중 다른 Docker 작업을 하지 않고 host load average 를 기록하지만, 시간 지표에 host 부하가 섞일 수 있다(실행 계약 §4.1)
- OPERATOR 가 READ 권한을 모두 가지므로 실험 2 에서 메뉴 정의의 권한 값이 틀려도 숨김 채점이 잡지 못한다. 권한 값은 사람 검토에서만 확인한다

---

# 18. 구현 순서

1. Phase 0A: 설계 · 도구 버전 동결(§19.1). 완료
2. `lab/spec/` 작성(요구사항, API, 시나리오 ID, schema, seed, 화면 명세, 버전 목록, 구현 지시)
3. 과제 문구(`lab/tasks/*/prompt.md`)와 `lab/grading/` 의 기본 동작 · 화면 · 과제별 채점 시험 작성. Variant 보다 먼저 쓴다
4. Phase 0B 결정(§19.2) 후 harness 골격: 컨테이너 이미지, 내보내기, 실행, 기록 수집. 빈 저장소로 pilot
5. Variant A 구현. 연구 문서가 없는 별도 디렉터리에서 `lab/spec/` 만 받은 세션이 "`lab/spec/` 의 명세를 `conventions.md` 에 따라 구현하라" 지시로 만든다
6. §19.3 결정 후 A 사람 검토(§16.3). 승인 전에는 B 를 만들지 않는다
7. Variant B 를 A 에서 차이 대장대로 재구성
8. §19.4 의 규모 기준 결정 후 동일성 검사(§16.2) 통과
9. 의존성 cache 를 넣은 이미지 재작성(§15.2). 지표 계산 스크립트 작성. 실험 과제가 아닌 보정 과제를 A · B 에 1회씩 실행한 기록으로 분류 규칙을 시험한 뒤 고정한다. 보정 실행은 분석에서 뺀다
10. 사전 등록 예측을 `lab/tasks/` 에 commit 하고 기준 commit 에 tag(`lab-v0.1-base`)
11. pilot 실행(실험 1 · 3 은 Variant 당 1회, 실험 2 는 Variant 당 2개 동시 실행. 결과 제외)과 harness 수정
12. §19.4 의 나머지 결정 후 실험 1, 실험 3, 실험 2 순서로 실행. 비용이 작은 실험부터 한다
13. 지표 계산, 사람 검토, 결과 문서

---

# 19. 결정 항목과 결정 시점

항목마다 그 결정이 없으면 진행할 수 없는 단계 직전에 정한다. 지금 필요하지 않은 항목은 설계 동결을 막지 않는다.
단계 번호는 `_design/experiment-implementation-checklist.md` 의 번호다.

## 19.1 설계 동결 전에 해결(Phase 0A)

| 항목 | 상태 | 근거 |
|---|---|---|
| dependency major · minor · patch 선택 | 해결(2026-10-03) | §3.4 결정표 |
| TypeScript 7, Vitest 5, React Router 8 출시일 | 해결. 각각 2026-07-08, 2026-09-03, 2026-06-17 로 6개월 미달. 6.0.3, 4.1.11, 7.18.4 사용 | §3.4 |
| Storybook 10 과 Vitest 4 호환 | 해결. 공식 지원 범위이고 browser mode 실행 확인 | §3.5 |
| Gradle offline · 읽기 전용 cache 방식 | 해결. `GRADLE_RO_DEP_CACHE` 동작 확인, wrapper 배포본 복사 추가 | §3.5, §15.2 |
| 업무 규칙 공백(할인, 결제 완료, 상태 모델, 환불 차감 기준) | 해결. 할인 없음, `POST /api/orders/{id}/pay` 추가, 주문 · 배송 상태 분리, 저장된 배송비 0원 주문만 차감 | §4.1, §4.2 |
| `lab/spec` 범위 | 해결. `schema.sql`, `seed-checks.sql`, `versions.md`, `conventions.md` 추가 | §4.3, §5.5 |
| `lab/` 위치 | 해결. 이 저장소의 `lab/` 로 둔다. 실행용 저장소는 내보내기로 분리되므로(§15.1) 나중에 별도 저장소로 옮겨도 실험 조건은 바뀌지 않는다 | §7.1 |

## 19.2 harness 구현 전에 결정(Phase 0B, 체크리스트 3단계 진입 조건)

| 항목 | 상태 | 영향 |
|---|---|---|
| Claude 모델과 effort | 결정(2026-10-03). `claude-opus-5-5`(subagent 포함), effort `medium`(Claude Code 의 Opus 5.5 기본값을 명시 고정). 학습 기준일 2026-06 은 §3.4 의 모든 major 최초 stable 출시일보다 늦다. 실행 계약 §2 | 비용, 결과 해석 범위. 정할 때 모델 학습 기준일과 §3.4 의 major 출시일 관계를 기록한다 |
| 실행당 · 전체 예산 | 결정(2026-10-03). 실행당 USD 15 · 45분, 전체 USD 2,000. 실행 계약 §5 | `--max-budget-usd`, 반복 횟수 |
| 실행 기계(이 Mac 의 Docker 또는 Linux 노드) | 결정(2026-10-03). 이 Mac 의 Docker Desktop, `linux/arm64`, 동시 실행 실험 2 만 2개. 실행 계약 §4 | 이미지 CPU 아키텍처, 시각 기준 화면, 동시 실행 수 |
| API 인증 방식 | 결정(2026-10-03). 실험 전용 Console workspace API key, 환경 변수 전달, workspace spend limit. 실행 계약 §4.4 | 실험 전용 key, 예산 한도, 컨테이너에 넣는 방법(§15.3) |
| 원본 로그 보관 위치(git, release 첨부, 별도 저장소) | 결정(2026-10-03). 실행 기계의 결과 root, 실험 종료 후 private GitHub 저장소 release asset. Git commit 하지 않음. 실행 계약 §8.4 | 결과 공개(`_research/15` §12) |
| timeout · retry · 병렬 · 실행 환경 고정 | 결정(2026-10-03). 실행 계약 §3, §4, §6.5, §7 | 실행 사이 조건 동일성 |

## 19.3 Variant A 승인 전에 결정(체크리스트 4단계 완료 판정 전)

| 항목 | 상태 | 영향 |
|---|---|---|
| A 사람 리뷰자 | [결정 필요] | §16.3 |
| A 정상성 판정 방법(누가, 어떤 기록으로 승인하는가) | [결정 필요] | §5.1, §16.3. 판정 질문은 §16.3, 금지 항목은 §5.4 에 이미 있다 |

## 19.4 실제 실험 전에 결정

| 항목 | 상태 | 결정 시점 | 영향 |
|---|---|---|---|
| parity 규모 차이 허용 기준(업무 동작 시험 LOC) | [결정 필요] | 체크리스트 6단계 완료 판정 전 | §16.2 |
| 반복 횟수 변경 여부 | [결정 필요] | 체크리스트 10단계 진입 전(pilot 결과 확인 후) | §14.6 |
| 사람 검토자 2명 | [결정 필요] | 체크리스트 10단계 진입 전 | §14.7 |

## 구현 시작 가능 여부

Phase 0A 가 끝났으므로 체크리스트 1단계(`lab/spec`)와 2단계(`lab/grading`)를 지금 시작할 수 있다. 두 단계는 §19.2 ~ §19.4 의 어느 항목에도 의존하지 않는다.
Phase 0B(§19.2)는 실행 계약으로 결정했다. 설계와 실행 계약이 FROZEN 이면 체크리스트 3단계를 시작할 수 있다.

---

# 20. 동결 판정

## 20.1 판정 기준

`FROZEN` 은 다음을 모두 만족할 때만 표시한다. blocker 0, major 0, dependency 호환 확인 완료, 구현 체크리스트와 설계서 일치.

## 20.2 검토 경과(2026-10-03)

1차(작성자 자체 검토): blocker 0, major 0, minor 4 로 판정했다. 2차 독립 검토에서 이 판정이 틀렸다는 것이 드러났다.

2차(독립 검토, 문서 맥락을 공유하지 않는 별도 세션): blocker 0, major 8, minor 12. major 8건은 모두 문서에서 확인했고 다음과 같이 고쳤다.

| major | 확인한 내용 | 수정 |
|---|---|---|
| B 만 가진 시각 기준 화면 | §11.1 에 있고 D5 행에는 없다. 실험 3 숨김 채점의 화면 비교를 B 안에서만 미리 검사한다 | v0.1 의 B 에서 제외(§11.1). §10.2 5단계의 "시각 비교" 삭제 |
| A 구현 세션 입력 부족 | 4단계 완료 조건(`DeliveryFeePolicy`, ArchUnit L1 · L2, 보조 함수, README 절, `DataTable` 동작, JPA 미사용)이 명세에서 나오지 않는다 | `lab/spec/conventions.md`(§5.5), `ui.md` 의 표 동작 항목 |
| §4.2 업무 규칙 공백 | 할인 규칙 없음, `PAID` 로 바꾸는 API 없음, 환불 차감이 저장된 배송비를 보는지 불명 | 할인 없음, 모의 결제 API, 저장된 배송비 0원 주문만 차감(§4.2). 실험 1 채점의 주문 생성 절차(§8.1) |
| 영역 사이 호출 방향 | 로그인은 staff 를 읽지만 허용 표는 `auth → shared 만`. 배송 상태가 주문 상태를 바꾸면 순환 | 로그인을 staff 에 둠, 주문 · 배송 상태 분리(§4.2, §7.3). A 에 방향 표를 지시(§5.5), 위반 시 A 를 고침(§6.1) |
| D6 와 본문 동일 조건 충돌 | 기능별 enum 이면 `throw` 줄이 바뀐다 | D6 를 v0.1 에서 제외(§6.4, §13) |
| `lab/spec` 에 schema 없음 | seed 를 같은 바이트로 복사하려면 열이 먼저 정해져야 한다. T2-D2 는 B 에서 delivery → order 의존을 만든다 | `schema.sql` 과 필요한 열, 배송 `fee` 복사(§4.3) |
| 2단계 채점이 8단계 과제 문구에 의존, 403 대상 없음 | 실험 2 채점이 문구의 경로 · 열을 쓴다. OPERATOR 가 READ 를 모두 가진다 | 과제 문구를 2단계로 이동. 403 항목을 비로그인 401 과 쓰기 권한 검사로 바꾸고 한계에 적음(§8.2, §9, §17) |
| 3단계와 7단계 순환 | 3단계 pilot 이 7단계 산출물(`metrics.json`)을 요구. 7단계 검증용 기록이 9단계에야 생김 | 3단계 완료 조건을 harness 산출물로 한정. 7단계에 보정 실행 추가 |

minor 12건 중 반영한 것: 1단계 산출물 목록 통일, pilot 규모 통일(§18), `--dangerously-skip-permissions` 를 run.sh 완료 조건에 추가, `pnpm test` 범위(§11.1), `toMatchScreenshot` 제거, 메뉴 순서와 상세 화면(§8.2), 시나리오 시험 단계 열(§4.3), requirements 값 목록(체크리스트 1단계), 과제별 채점 위치 통일(§7.1), A 의 `SessionUserService`(§7.2), 필드 이름 정규화(§16.2), `playwright` peer 확인(체크리스트 5단계). README 시험 필터 예를 staff 영역 한 문장으로 고정했고(§5.5), 실험 3 채점에서 과제 문구에 없는 조건을 사람 검토로 옮겼다(§8.3). story 대상은 목록 표시 컴포넌트 5개로 통일했다(§7.4, §7.5).

3차(독립 재검토): 이전 major 8건 중 7건 해소, 1건 부분 해소(3 · 7단계 순환을 고치며 7단계 보정 실행이 8단계 cache 이미지를 요구하게 됨). 새 major 3건, minor 15건.

| major | 수정 |
|---|---|
| 7단계 보정 실행이 8단계 cache 이미지를 요구 | cache 이미지 재작성을 7단계 첫 항목으로 옮김(§15.2, §18 9번, 체크리스트 7단계) |
| 영역 사이에서 주고받는 타입 미정. B 의 R1 때문에 본문이 바뀜 | A 에 요약 record · enum · `Money` 만 주고받도록 지시(§5.5, §7.2) |
| harness 연동 설정(JUnit reporter 경로, `APP_PORT`)이 A 지시에 없음 | §5.5 에 추가 |

minor 15건은 모두 반영했다. 남은 세부(환불 차감액 응답 필드, 실험 2 조건 경계)는 1 · 2단계 작성자가 정하도록 체크리스트에 적었다.

## 20.3 판정

4차(독립 집중 확인): 3차 major 3건 중 2건 해소, 1건 부분 해소(반환값만 정하고 인자를 정하지 않음, minor 로 판정). 새 major 1건: 6단계의 실험 3 기준 screenshot 이 7단계에서 만드는 실행 이미지를 요구했다. 실험 3 기준선 · 기준 screenshot · 수정 방식 확인 항목을 7단계 이미지 항목 뒤로 옮기고, 7단계 이미지를 3단계 이미지에 cache 층만 더한 것으로 정했다. 인자 타입 규칙도 §5.5 와 체크리스트 4단계에 넣었다. 확인자는 이 major 를 고치면 FROZEN 에 동의한다고 적었다.

| 판정 항목 | 결과 |
|---|---|
| blocker | 0 |
| major | 0 (4차의 1건을 위와 같이 수정) |
| minor | 2차 · 3차 지적은 반영. 1 · 2단계 작성자가 정할 세부는 체크리스트에 적었다 |
| dependency 호환 확인 | 완료(§3.5) |
| 체크리스트와 설계서 일치 | 단계 순서 0A → 1 → 2 → 0B → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 에서 뒤 단계 산출물을 요구하는 곳 없음 |

상태: FROZEN(2026-10-03). 이후 설계를 바꾸면 상태를 REVIEWED 로 되돌리고 이 절에 이유를 적는다.

## 20.4 변경 1: 실험 3 판정 화면 폭(2026-10-03)

FROZEN → REVIEWED. 2단계 채점 구현(`dfed3ca`) 뒤에 확인한 문제다.

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 판정 화면 폭 | 1280×800, 1024×768 둘 다 통과해야 함 | 1280×800 만 판정 |
| 1024×768 | 판정 조건 | 진단. 실행 · 기록만 하고 판정 · 점수에 쓰지 않음 |
| 채점 구현 | `tasks/exp3/exp3.spec.ts` 한 파일에서 두 폭 실행 | 판정은 `tasks/exp3/`(묶음 `exp3`), 진단은 `diagnostics/exp3-1024.spec.ts`(묶음 `diag-exp3-1024`, 계정 `diag.long80` · `diag.long120`). 공용 절차는 `tasks/exp3/long-department.ts` |
| 위치 조건 문구 | "bounding box 가 표 컨테이너와 viewport 안에 보인다" | 구현과 같게 "보이고, 가로 범위가 표 컨테이너와 viewport 안". 판정 내용은 같다 |
| 기준선 확인 단계 | §8.3 에 "체크리스트 6단계" | 체크리스트와 같은 "7단계"로 맞춤(4차 확인에서 체크리스트만 옮겨진 것) |

이유: 과제 문구는 "부서명이 80자 이상일 때 액션 버튼이 밀려난다" 이고 화면 폭을 말하지 않는다. 문구가 가리키는 정상 화면 기준은 `ui.md` 의 "기준 화면 폭 1280px" 하나다. 1024×768 을 판정에 넣으면 Agent 에게 공개되지 않은 요구사항을 숨김 채점이 검사하게 되고, 실험 3 이 측정하려는 국소 UI 수정(관리자 계정 표만 고치는 수정)이 1024px 에서 실패해 오답으로 처리될 수 있다.
판정 높이는 기존 값 800 을 유지했다. 채점 기본 viewport(`playwright.config.ts`), `conventions.md` 의 Variant E2E viewport, "다른 목록 화면 4개" 기준 screenshot 이 모두 1280×800 이라 바꾸면 기존 판정 의미가 달라진다.

독립 검토(문서 맥락을 공유하지 않는 별도 세션): blocker 0, major 0, minor 8. 검토자는 FROZEN 재확정에 동의했다.
확인 항목은 공개 과제 대비 비공개 요구사항, 진단 결과가 판정 경로에 주는 영향, 1280 판정 의미 보존, 구현과 문서 일치 네 가지다.

| minor | 수정 |
|---|---|
| 진단의 `testInfo.attach(body)` 는 통과한 시험에서 파일로 남지 않음 | screenshot 과 측정값을 `testInfo.outputPath` 에 파일로 쓴다. 측정 전에 screenshot 을 남긴다 |
| 진단과 판정이 같은 loginId 를 써서 `run.sh` 밖에서 함께 실행하면 판정 계정 생성이 409 | 진단 계정을 `diag.long80` · `diag.long120` 으로 분리 |
| 진단 묶음 이름 `exp3-diagnostic` 이 `junit-exp3*` glob 에 걸림, 진단 결과 위치 미정 | 묶음 이름 `diag-exp3-1024`. 결과 위치와 harness 처리는 실행 계약 문서에서 정한다 |
| 설계는 "viewport 안" 이라 쓰고 구현은 가로 범위만 검사 | 설계 문구를 구현에 맞춤 |
| 1280 의 근거로 Agent 가 볼 수 없는 `ui.md` 만 듦 | Variant E2E viewport 1280×800 을 근거에 더함 |
| 숨겨진 버튼이면 단정 전에 TypeError, 실패 메시지에 loginId 없음 | 측정값이 null 을 허용하고 단정 label 과 loginId 를 남김 |
| 체크리스트 2단계에 진단 묶음 없음 | 항목 추가 |
| 같은 port 로 동시 실행 시 다른 실행의 애플리케이션에 붙을 수 있음 | `run.sh` · README 에 같은 port 동시 실행 금지를 적음 |

수정 후 확인: `pnpm typecheck` 통과, 묶음 `exp3` 는 1280×800 판정 시험 3개, 묶음 `diag-exp3-1024` 는 진단 시험 2개를 나열하고, 두 묶음을 한 번에 주면 `run.sh` 가 exit 2 로 거부한다.
판정: blocker 0, major 0. 상태를 FROZEN 으로 되돌린다.

## 20.5 변경 2: Phase 0B 결정(2026-10-03)

FROZEN → REVIEWED. §19.2 의 결정 항목을 `_design/experiment-execution-contract-v0.1.md` 로 확정했다. 이 결정이 바꾸는 설계 서술:

| 위치 | 변경 전 | 변경 후 |
|---|---|---|
| §8.2 병합과 측정 1 | 8개 동시 시작 | 8개 실행, 동시 2개. 실행이 서로 격리돼 쌍별 충돌 결과는 동시 실행 수와 무관 |
| §14.5 | `results/<run-id>/` 아래 평면 목록 | 실행 계약 §8 의 구성(설정 · 관찰 · 원본 분리). `grading.json` 을 `result.json` 의 `grading` 으로 대신 |
| §14.6 | 예산 [결정 필요], 실험 2 8개 동시 | 실행당 USD 15, 실험 2 동시 2개 |
| §15.2 | CPU · 메모리 "예: 4개, 8GB" | 4개, 8GB 로 확정 |
| §15.3 | 인증 방식 [결정 필요] | Console workspace API key. `WebSearch` · `WebFetch` 끔 |
| §17 | - | 개인 작업 기계의 host 부하 한계 추가 |
| §19.2 | [결정 필요] 5건 | 결정 |
| §8.2 숨김 채점 | 순차 통합 뒤 채점만 서술 | 실행마다 하는 채점을 "개별 과제 판정" 으로 구분 |
| §14.5 | Variant 코드(가림), 각 줄에 수신 시각 | Variant a · b 를 기록하고 지표 계산은 읽지 않음. 수신 시각은 별도 파일 |

실험 2 의 동시 실행 수를 바꾼 이유: 이 Mac(10 core, 32GB)에서 CPU 4개 · 메모리 8GB 컨테이너 8개(32 CPU, 64GB)를 동시에 실행할 수 없다. 컨테이너 제한을 줄이면 실험 1 · 3 과 실행 조건이 달라지고 메모리 부족 종료가 Agent 실패로 섞인다. 설계 §19.2 는 실행 기계 결정의 영향으로 동시 실행 수를 이미 적어 두었다.

실행 계약 1차 독립 검토: blocker 0, major 4, minor 14, FROZEN 비동의. 지적과 수정은 실행 계약 §12 에 적었다. 설계 쪽 반영은 위 표의 §8.2 숨김 채점 · §14.5 행과 §19.2 의 effort 변경(`high` → `medium`)이다.
실행 계약 2차 · 3차 확인: 2차 blocker 0, major 2, minor 9 → 반영. 3차 blocker 0, major 0, minor 4 → 반영하고 검토자가 FROZEN 에 동의했다. 지적과 수정은 실행 계약 §12.
판정: blocker 0, major 0. 설계와 실행 계약을 FROZEN 으로 되돌린다. 체크리스트 3단계를 시작할 수 있다.
