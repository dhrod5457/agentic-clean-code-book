# Classic Clean Code → Agentic Clean Code Mapping

작성일: 2026-10-03  
상태: 리서치 메모

## 목적

이 문서는 기존 Clean Code, Refactoring, modularity, evolutionary architecture가 해결하려 했던 문제를 다시 읽고, 무엇이 Agent 시대에도 그대로 유효하며 무엇을 확장해야 하는지 정리한다.

핵심 가설:

> Agentic Clean Code는 기존 Clean Code를 폐기하는 개념이 아니라, **코드 단위의 maintainability를 repository/task/execution-system 단위까지 확장하는 개념**이다.

---

## 1. Clean Code가 원래 최적화했던 것

Robert C. Martin의 *Clean Code* 1판은 다음 주제를 중심으로 한다.

- meaningful/searchable names
- small functions
- single responsibility
- no hidden side effects
- clean boundaries
- unit tests
- small classes
- organizing for change
- emergent design
- smells and heuristics

중요한 점은 이 책도 애초에 "코드가 동작하느냐"만 본 것이 아니라 **변경 비용과 이해 비용**을 줄이는 데 초점을 두었다는 것이다.

2025년 2판 역시 clean, flexible, maintainable code와 architecture/design을 강조한다.

따라서 Agentic Clean Code가 기존 Clean Code와 싸워야 할 이유는 없다. 다만 기존 책의 대표 질문이 주로 다음이었다면:

> 사람이 이 함수와 클래스를 쉽게 읽고 수정할 수 있는가?

Agentic 시대에는 질문이 확장된다.

> Agent가 이 변경의 위치를 빠르게 찾고, 필요한 context만 읽고, 다른 작업과 충돌하지 않게 수정하고, 스스로 검증하고, 실패 원인을 다시 찾아갈 수 있는가?

---

## 2. Refactoring: "이해하기 쉽고 수정하기 싸게"

Martin Fowler는 refactoring을 observable behavior를 바꾸지 않으면서 내부 구조를 바꾸어 소프트웨어를 더 이해하기 쉽고 수정 비용을 낮추는 작업으로 정의한다.

이 정의는 Agent 시대에도 거의 그대로 유효하다.

달라지는 것은 "누가 이해하고 누가 수정하는가"다.

### 기존

- 개발자 cognitive load 감소
- 작은 안전한 변경
- behavior preservation
- 지속적인 구조 개선

### Agentic 확장

- Agent context load 감소
- 작은 독립 task surface
- verifier로 behavior preservation 확인
- 반복 Agent 작업으로 생기는 구조적 entropy 지속 제거

따라서 Agentic Refactoring의 목표 후보는:

> "동일한 행동을 유지하면서 다음 Agent가 더 적은 탐색, context, coordination으로 수정할 수 있도록 구조를 바꾸는 것"

---

## 3. Parnas: Information Hiding을 Parallel Agent Boundary로 다시 읽기

Parnas의 modular decomposition 핵심은 단순히 비슷한 기능을 한데 묶는 것이 아니라 **변경될 가능성이 있는 설계 결정을 숨기는 경계**를 만드는 것이다.

Agent 시대에는 다음 해석이 추가된다.

좋은 module은:

- 내부 상세를 다른 Agent가 읽지 않아도 되고
- contract만으로 작업 가능하고
- 한 module 내부 변경이 다른 task로 전파되지 않고
- 독립 verifier가 있으며
- 다른 Agent와 동시에 수정 가능해야 한다.

즉 information hiding은 Agent의 context isolation이며, module boundary는 parallel work boundary가 된다.

---

## 4. Coupling/Cohesion → Change Coupling까지

정적 import/call dependency만 보면 실제 변경 관계를 놓칠 수 있다.

repository mining 연구에서 logical coupling/co-change는 **서로 구조적으로 직접 연결되지 않아도 반복해서 함께 수정되는 파일 관계**를 드러낸다.

133개 GitHub 프로젝트를 분석한 대규모 co-change 연구에서도 co-change cluster가 실제 모듈성 평가와 change propagation 파악에 활용될 수 있음을 보였다.

Agent 시대에는 이것이 특히 중요하다.

두 파일이 import 관계는 없지만 80%의 변경에서 함께 수정된다면:

- Agent가 한 파일만 읽고 작업하면 누락 위험이 높다.
- 두 task를 병렬로 배정하면 충돌할 가능성이 높다.
- 설계상 hidden contract가 있을 수 있다.

따라서 Agentic coupling은 최소 세 층으로 측정할 필요가 있다.

1. **Structural coupling**
   - import
   - call
   - inheritance
   - schema dependency

2. **Change coupling**
   - co-change frequency
   - commit confidence/support
   - cross-module co-change

3. **Task coupling**
   - 동일 요구사항에서 함께 읽는 파일
   - 함께 수정하는 파일
   - 함께 실행해야 하는 test
   - 같은 shared environment 필요 여부

---

## 5. Architecture Fitness Function → Agentic Fitness Function

Evolutionary Architecture는 중요한 architectural characteristic를 objective/testable하게 만들기 위해 fitness function 개념을 제시한다.

예:

- cyclic dependency 금지
- complexity threshold
- performance limit
- security constraint
- logging policy

이 개념은 Agentic Clean Code의 기반으로 매우 적합하다.

Agent는 prose 문서보다 compiler/test/lint에서 즉시 실패하는 규칙을 더 안정적으로 따른다.

따라서 기존 architectural fitness function 위에 Agent-specific fitness function을 추가할 수 있다.

### 후보

- 한 feature 변경의 median files changed <= N
- package 간 forbidden dependency = 0
- cyclic dependency = 0
- cross-domain co-change 비율 <= threshold
- root instruction size <= threshold
- local verifier runtime <= threshold
- test flakiness <= threshold
- UI state fixture coverage >= threshold
- error without stable code/operation context = 0
- central hot-file modification frequency <= threshold

핵심은 "Agent 친화적으로 작성하라"는 문장을 없애고 측정 가능한 제약으로 바꾸는 것이다.

---

## 6. Loose Coupling: Team Autonomy → Agent Autonomy

DORA는 좋은 architecture의 결과를 기술 선택이 아니라 **독립적으로 변경·테스트·배포 가능한가**로 설명한다.

대표 질문:

- 다른 팀 허가 없이 설계를 변경할 수 있는가.
- 다른 팀과 세밀한 coordination 없이 일을 끝낼 수 있는가.
- 통합 test environment 없이 대부분 검증 가능한가.
- 서비스가 독립적으로 deploy 가능한가.

이 질문에서 "팀"을 "Agent task"로 치환하면 놀랄 만큼 그대로 Agentic architecture 규칙이 된다.

### Agent 버전

- 다른 Agent 결과를 기다리지 않고 task를 끝낼 수 있는가.
- shared mutable workspace 없이 검증 가능한가.
- 다른 module 내부 코드를 읽지 않고 contract만으로 수정 가능한가.
- 전체 integrated environment 없이 local verification 가능한가.

따라서 Agentic Clean Code의 상당 부분은 **DORA가 조직/팀 자율성에 적용했던 loosely coupled architecture를 task/Agent 수준으로 내리는 작업**으로 볼 수 있다.

---

## 7. Hermetic Test → Reliable Agent Feedback

Google의 flaky test 연구에서 hermetic environment는 외부 dependency를 줄여 flakiness를 낮추는 중요한 수단이다.

또 작은 test는 큰 test보다 flaky할 가능성이 낮았고, Google 내부 관찰에서는 test binary size와 RAM 사용 증가가 flakiness 증가와 강하게 연관되었다.

Agent에게 flaky verifier는 사람보다 더 치명적일 수 있다.

사람은 경험적으로 "이 테스트 원래 가끔 깨진다"를 기억하지만 Agent는 다음과 같이 잘못 행동할 수 있다.

- 정상 코드를 계속 수정
- 무의미한 retry
- 실패를 자기 변경 때문이라고 오판
- flaky failure를 성공으로 간주
- 다른 module까지 수정하며 blast radius 확대

따라서 Agentic Clean Code에서 test determinism은 개발 편의가 아니라 **Agent reasoning input quality**다.

---

## 8. 기존 원칙을 그대로 유지해야 하는 것

### Searchable Names

기존 Clean Code에서도 searchable name을 강조한다.

Agent 시대에는 더 중요해진다.

좋은 이름은 사람 가독성만이 아니라:

- grep
- symbol search
- semantic search
- error-to-source mapping

의 anchor다.

### Single Responsibility / Cohesion

한 module이 여러 변경 이유를 가지면 Agent가 요구사항 하나를 처리하기 위해 더 큰 context를 읽게 된다.

즉 SRP는 context locality와 연결된다.

### No Hidden Side Effects

Agent가 local code만 보고 결과를 예측할 수 있어야 한다.

hidden side effect는 context explosion을 만든다.

### Clean Boundaries

external API, third-party library, infrastructure detail이 domain 곳곳으로 새면 dependency update 한 번에 수많은 Agent task가 연쇄적으로 필요해진다.

### Unit Tests

Agent는 빠른 local oracle이 필요하므로 유지된다. 오히려 중요도가 상승한다.

---

## 9. 재정의가 필요한 부분

### "Small Function"

함수가 작다는 것만으로 Agent-friendly하지 않다.

100개의 작은 함수가 여러 파일에 흩어져 하나의 task에 모두 필요하면 context cost는 오히려 증가한다.

따라서:

> line count보다 Task Surface가 중요하다.

### "Comments"

많은 설명이 무조건 좋은 것이 아니다.

repository instruction 연구에서 과도한 context가 성능과 비용을 악화시킬 수 있다는 결과가 있다.

따라서:

> more documentation → searchable, scoped, current, executable knowledge

### "DRY"

Agent 시대에는 무조건적인 중복 제거가 global abstraction과 hot file을 만들 위험도 있다.

중복 3줄을 없애기 위해 10개 domain이 하나의 utility를 공유하면 parallel changeability가 나빠질 수 있다.

따라서 DRY는 다음 trade-off와 같이 봐야 한다.

- semantic duplication
- coupling introduced by abstraction
- cross-domain change fan-out
- ownership/task boundary

### "Centralization"

사람 관점에서는 한 곳에 모아 관리하기 쉬운 central registry가 편할 수 있다.

Agent 병렬 환경에서는 conflict hotspot이 된다.

따라서 registry, config, route, permission map의 중앙집중은 별도 smell로 평가해야 한다.

---

## 10. 잠정 결론

기존 Clean Code의 중요한 원칙 대부분은 사라지지 않는다.

다만 "clean"의 측정 범위가 다음처럼 변한다.

```
Function
  ↓
Class
  ↓
Module
  ↓
Task Surface
  ↓
Repository
  ↓
Verification Harness
  ↓
Execution Environment
```

Agentic Clean Code의 차별점은 새로운 naming rule을 만드는 데 있지 않다.

차별점은 기존 software design 원칙에 다음 품질 속성을 추가하는 데 있다.

- Context Efficiency
- Parallel Changeability
- Machine Verifiability
- Machine Diagnosability
- State Reproducibility
- Instruction Locality
- Environment Determinism
- Agent Recoverability
- Entropy Resistance

---

## 주요 출처

- Robert C. Martin, *Clean Code*, Pearson, 2008 / 2025 2nd ed.
  - https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship/P200000009044
  - https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship-2nd-edition/P200000013239
- Martin Fowler, Definition of Refactoring
  - https://martinfowler.com/bliki/DefinitionOfRefactoring.html
- Martin Fowler, *Refactoring*
  - https://martinfowler.com/books/refactoring.html
- David Parnas, *On the Criteria To Be Used in Decomposing Systems into Modules*
  - https://doi.org/10.1145/361598.361623
- Thoughtworks, Architectural Fitness Function
  - https://www.thoughtworks.com/en-us/radar/techniques/architectural-fitness-function
- Thoughtworks, *Building Evolutionary Architectures*
  - https://www.thoughtworks.com/en-us/insights/books/building-evolutionary-architectures
- DORA, Loosely Coupled Teams
  - https://dora.dev/capabilities/loosely-coupled-teams/
- Silva et al., Co-change patterns: A large scale empirical study
  - https://doi.org/10.1016/j.jss.2019.03.014
- Ajienka et al., semantic coupling and co-change
  - https://doi.org/10.1007/s10664-017-9569-2
- Google Testing Blog, Test Flakiness
  - https://testing.googleblog.com/2020/12/test-flakiness-one-of-main-challenges.html
