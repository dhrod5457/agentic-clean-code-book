# Initial Synthesis — From Clean Code to Agentic Clean Code

작성일: 2026-10-03  
상태: Working hypothesis

## 1. 가장 중요한 변화: 코드 생산 비용보다 검증·통합 비용이 중요해진다

Coding Agent는 코드 작성 비용을 크게 낮춘다. 그러나 코드 생성 속도가 빨라졌다고 소프트웨어 변경 비용 전체가 같은 비율로 낮아지는 것은 아니다.

DORA의 AI-assisted software development 연구는 AI를 조직의 기존 강점과 약점을 증폭시키는 요소로 설명한다. 2026년 DORA 후속 글은 초기 코드 생성이 빨라져도 절약된 시간이 audit와 verification으로 이동할 수 있음을 지적한다.

METR의 2025년 RCT에서는 성숙한 대형 오픈소스에 익숙한 숙련 개발자들이 당시 AI 도구를 사용할 때 오히려 평균 작업 시간이 늘었다. 이 결과는 모든 개발 환경으로 일반화할 수 없지만, "코드 생성 속도 = 개발 생산성"이라는 등식을 반박하는 중요한 자료다.

따라서 Agentic Clean Code는 typing speed가 아니라 다음 비용을 줄이는 방향을 봐야 한다.

- task localization
- context acquisition
- verification
- review
- integration
- regression diagnosis
- conflict resolution
- recovery

## 2. Clean Code의 최적화 단위가 바뀐다

전통적 Clean Code 논의는 주로 identifier, function, class, duplication, comments, tests 같은 source-level practice에 집중했다.

Agent에게는 이보다 큰 단위가 중요해진다.

Agent는 먼저 다음 문제를 풀어야 하기 때문이다.

1. 어디를 수정해야 하는가.
2. 무엇을 읽어야 하는가.
3. 어떤 규칙을 따라야 하는가.
4. 어떤 다른 코드가 영향을 받는가.
5. 변경이 맞는지 어떻게 확인하는가.
6. 실패했다면 어디에서 실패했는가.

따라서 Agentic Clean의 기본 단위 후보는 **Task Surface**다.

### Task Surface

하나의 요구사항을 올바르게 변경하기 위해 Agent가 탐색·이해·수정·검증해야 하는 코드와 도구의 총 범위.

Task Surface가 작다는 것은 단순히 파일이 작다는 의미가 아니다.

- 필요한 파일 수가 적다.
- 관계없는 파일을 읽지 않아도 된다.
- 변경 contract가 명시적이다.
- local test가 존재한다.
- 오류가 담당 모듈로 바로 연결된다.
- 환경 준비가 작고 결정적이다.

## 3. 새로운 Code Smell 후보

### Context Smell

간단한 변경에도 저장소 전체를 읽어야 한다.

예:

- 의미가 불분명한 범용 helper
- 거대한 shared types
- convention이 코드 밖 사람 머릿속에 있음
- 하나의 giant AGENTS.md
- directory와 domain 경계 불일치

### Hot File Smell

독립 기능들이 동일 중앙 파일을 반복해서 수정한다.

예:

- routes.ts
- index.ts
- registry.ts
- giant application.yml
- global permission map
- global CSS
- 하나의 schema barrel

Agent 수가 늘수록 merge collision point가 된다.

### Hidden Contract Smell

실제 제약조건이 type/schema/test로 표현되지 않고 암묵적이다.

Agent는 추측하게 되고 잘못된 패턴을 복제한다.

### Verification Smell

"전체 test를 돌려라" 외에는 검증 방법이 없다.

작은 수정도 긴 feedback loop를 만들고 여러 Agent가 동일 자원을 소비한다.

### Opaque Failure Smell

오류가 사람이 해석해야 하는 긴 로그나 generic exception으로만 표현된다.

Agent가 원인 위치를 찾기 위해 탐색을 다시 시작해야 한다.

### Non-Reproducible State Smell

UI 오류나 runtime issue를 특정 로그인, 운영 데이터, 사람의 클릭 순서로만 만들 수 있다.

Agent가 autonomous loop를 완성할 수 없다.

### Environment Smell

동일 commit인데 개발자 PC, Agent VM, CI 결과가 다르다.

### Instruction Smell

Agent 지침이 길고 중복되고 서로 충돌하며 오래된 내용을 포함한다.

### Entropy Smell

Agent가 과거 구현을 모방하면서 local exception과 중복 abstraction을 계속 증식시킨다.

## 4. Modularity를 Agent 병렬성 관점에서 다시 읽기

Parnas의 1972년 modular decomposition 논문은 모듈화를 flexibility, comprehensibility, development-time reduction과 연결했다.

Agent 시대에도 본질은 그대로지만 새로운 압력이 추가된다.

> 좋은 module은 100명의 인간 팀뿐 아니라 100개의 Agent task가 서로의 상세 구현을 몰라도 진행될 수 있게 해야 한다.

Anthropic의 parallel Claude compiler 실험은 이를 실제로 보여준다.

서로 다른 failing test가 존재할 때 여러 Agent는 다른 문제를 해결할 수 있었다. 그러나 하나의 거대한 kernel compilation failure로 수렴하자 여러 Agent가 같은 bug를 고치고 서로 변경을 덮어썼다.

따라서 Agentic modularity의 질문은 다음과 같다.

- 이 module은 독립적인 verifier를 갖는가.
- 하나의 task를 다른 task와 분리할 수 있는가.
- shared mutable surface가 작은가.
- integration point가 명시적인가.
- 변경 순서에 대한 의존성이 낮은가.

## 5. Test는 검증 도구에서 Agent Interface로 바뀐다

Anthropic의 실험에서 test harness의 quality는 Agent가 자율적으로 전진할 수 있는지 결정했다.

중요한 것은 test 개수만이 아니다.

Agent용 verifier는 다음 특성을 가져야 한다.

- 빠른 default path
- deterministic result
- 실패 원인 요약
- 필요할 때 상세 log로 drill-down
- 수정 범위별 선택 실행
- 잘못된 방향을 통과시키지 않는 강한 oracle
- regression detection
- 사람의 해석 없이 pass/fail 의미가 명확함

따라서 test output 자체가 API다.

좋지 않은 출력:

```
421 tests failed
[thousands of lines]
```

좋은 방향:

```
FAIL AUTH-TOKEN-003
invariant: expired token must be rejected
source_hint: auth/token-validation
details: artifacts/test/auth-token-003.log
```

정확한 syntax가 중요한 것이 아니라 "Agent가 다음 행동을 결정할 수 있는 정보 밀도"가 중요하다.

## 6. Documentation보다 Executable Constraint

OpenAI의 Harness Engineering 사례는 아키텍처 규칙을 custom lint와 structural test로 강제한다.

Agentic 개발에서 이 접근이 강한 이유:

- 자연어를 매번 다시 해석할 필요가 없다.
- 모든 Agent에 동일하게 적용된다.
- 위반 시점이 즉시 드러난다.
- 오류 메시지에 remediation을 넣을 수 있다.
- instruction context를 줄일 수 있다.

따라서 우선순위 후보:

```
type/schema
> compiler
> architecture test
> lint
> executable verifier
> generated reference
> concise instruction
> prose guideline
```

모든 규칙을 코드로 만들 수 있다는 뜻은 아니다. 중요한 invariant를 가능한 한 executable하게 만드는 방향이다.

## 7. UI Clean Code의 정의도 달라진다

Agent가 UI를 고치려면 실제 브라우저를 사람이 조작해 상태를 만들어 주어서는 안 된다.

목표는 브라우저 엔진 자체를 제거하는 것이 아니라 **UI state reproduction을 code로 만드는 것**이다.

예:

- default
- loading
- empty
- error
- disabled
- permission denied
- long text
- overflow
- partial data
- slow response

Storybook은 component state를 props와 mock data로 격리할 수 있고 visual regression을 자동화할 수 있다. Playwright는 screenshot baseline 비교를 제공하며 환경 차이가 결과에 영향을 줄 수 있으므로 실행 환경 고정이 중요하다.

Agentic UI quality 후보:

> 특정 UI bug report에서 Agent가 application navigation 없이 해당 state를 직접 만들고 headless verification까지 수행할 수 있는가.

## 8. Repository Instructions의 역설

벤더들은 repository instruction을 권장한다.

- AGENTS.md
- CLAUDE.md
- copilot-instructions.md
- path-specific instructions

실제 사용 가치도 크다.

그러나 2026년 AGENTS.md 연구는 불필요한 repository context가 success rate를 떨어뜨리고 비용을 증가시킬 수 있음을 보여준다.

따라서 원칙은 "문서를 더 작성하라"가 아니다.

### Minimal Sufficient Context

root instruction에는 다음 정도만 남기는 방향을 검증한다.

- repository map
- build/test entrypoint
- invariant
- prohibited action
- deeper documentation 위치

나머지는 task가 필요할 때 검색하는 progressive disclosure 구조로 둔다.

## 9. Hermeticity는 Agentic Clean의 기반 특성이다

Bazel 문서가 설명하는 hermetic build의 목표는 같은 source/configuration에서 host 차이에 관계없이 같은 output을 만드는 것이다.

Agent에게 이 특성은 특히 중요하다.

비결정성은 Agent에게 다음을 구별하기 어렵게 만든다.

- 내가 코드를 잘못 고쳤는가.
- 환경이 달라졌는가.
- test가 flaky한가.
- 외부 API가 달라졌는가.

따라서 Agent용 codebase는 가능하면 다음을 고정한다.

- toolchain
- dependency
- fixture
- time/randomness
- network dependency
- build output location

## 10. Agentic Clean Code의 잠정 정의

> **Agentic Clean Code는 Coding Agent가 최소한의 context로 올바른 변경 위치를 찾고, 다른 Agent와 충돌을 최소화하며, 변경을 독립적으로 검증하고, 실패 원인을 기계적으로 추적하고, 다음 Agent가 같은 상태를 재현할 수 있도록 설계된 코드와 저장소다.**

여기서 "코드"에는 source만 포함되지 않는다.

- directory structure
- contracts
- tests
- fixtures
- build system
- lint
- architecture rules
- logs
- metrics
- traces
- docs
- Agent instructions
- development environment

까지 포함된다.

## 11. 아직 결론 내리지 않을 것

- Clean Code가 완전히 무효가 됐다는 주장
- 특정 함수 길이/파일 길이에 대한 숫자 규칙
- 무조건 microservice가 Agent에 유리하다는 주장
- 무조건 monorepo/멀티레포가 더 좋다는 주장
- AGENTS.md가 필요 없다는 주장
- 무조건 테스트가 많을수록 좋다는 주장
- 100 Agent 병렬화가 모든 프로젝트에 필요한 목표라는 주장

이 항목은 실험과 추가 연구 후 결정한다.
