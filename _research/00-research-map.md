# Agentic Clean Code Research Map

작성일: 2026-10-03  
상태: 초기 리서치 가설. 집필 결론 아님.

## 1. 출발점

이 책의 출발 문장은 "Clean Code는 끝났다"지만, 연구 단계에서는 이를 문자 그대로 전제하지 않는다.

검증할 가설은 다음과 같다.

> 기존 Clean Code가 주로 인간 개발자가 읽고 수정하는 코드의 가독성·단순성·유지보수성을 최적화했다면, Agentic Clean Code는 인간과 Coding Agent가 함께 개발하는 저장소의 **탐색 가능성, 변경 격리, 검증 가능성, 재현성, 병렬 수정 가능성, 기계적 진단 가능성**까지 코드 품질의 일부로 본다.

따라서 질문은 "기존 원칙을 폐기할 것인가?"가 아니라 다음과 같다.

> Coding Agent가 주요 코드 작성자·수정자가 되었을 때 Clean의 정의는 어디까지 확장되어야 하는가?

## 2. 핵심 연구 질문

### RQ1. 코드의 독자는 누구인가

- 사람이 읽기 좋은 코드와 Agent가 읽기 좋은 코드는 같은가?
- 자연어로 친절하게 설명된 코드가 항상 Agent에게도 좋은가?
- Agent는 전체 맥락보다 수정 대상의 정확한 source context를 더 필요로 하는가?
- 함수/클래스 가독성보다 repository navigation cost가 더 큰 병목이 되는 시점은 언제인가?

### RQ2. Agent가 코드를 찾는 비용을 어떻게 줄이는가

- 하나의 변경에 필요한 파일 수를 줄일 수 있는가?
- 이름, package, directory, dependency graph만으로 수정 위치를 좁힐 수 있는가?
- "한 파일이 짧다"보다 "한 작업에 필요한 context가 작다"가 더 중요한가?
- 중앙 registry, giant index, global config 같은 hot file은 Agent 병렬 개발에서 어떤 비용을 만드는가?

### RQ3. 10~100개의 Agent가 동시에 수정할 수 있는 코드란 무엇인가

- 파일 충돌보다 change blast radius가 더 중요한가?
- task가 독립적으로 분해되지 않으면 Agent 수 증가가 왜 효과를 잃는가?
- shared mutable state, global CSS, 공용 schema, 중앙 registry는 어떤 병렬성 병목을 만드는가?
- workspace/worktree/container 격리를 코드 구조와 어떻게 함께 설계해야 하는가?

### RQ4. Agent가 스스로 검증할 수 있는 코드란 무엇인가

- 전체 시스템을 띄우지 않고 수정 범위만 검증할 수 있는가?
- test failure가 다음 행동을 알려주는가?
- Architecture Rule을 문서가 아니라 실행 가능한 테스트로 만들 수 있는가?
- UI state를 로그인/탐색 없이 fixture/story로 재현할 수 있는가?
- build와 test가 동일 입력에서 동일 결과를 내는가?

### RQ5. Agent가 문제를 바로 찾을 수 있는 코드란 무엇인가

- 오류 메시지가 source location, operation, invariant와 연결되는가?
- 로그가 사람이 읽는 문장뿐 아니라 grep/query 가능한 구조를 갖는가?
- 실패 출력이 context window를 오염시키지 않는가?
- trace/log/metric/test가 하나의 failure ID 또는 correlation으로 연결되는가?

### RQ6. 저장소 지식은 어떻게 제공해야 하는가

- 거대한 AGENTS.md/CLAUDE.md가 정말 도움이 되는가?
- repository instruction은 어느 정도가 최소 충분 조건인가?
- docs를 많이 만드는 것보다 progressive disclosure와 검색 가능성이 중요한가?
- 코드와 문서의 drift를 어떻게 기계적으로 탐지할 것인가?

### RQ7. Agent 시대의 기술 부채는 무엇인가

기존 기술 부채 외에 다음이 새로운 부채 후보인지 검증한다.

- context debt
- verification debt
- observability debt
- instruction debt
- architecture enforcement debt
- environment debt
- parallelism debt
- repository knowledge debt

## 3. 현재까지 관찰된 강한 신호

### 3.1 Agent-first 개발은 코드보다 환경과 피드백 루프를 더 중요하게 만든다

OpenAI의 2026년 Harness Engineering 사례에서는 사람의 주요 역할이 직접 코드를 작성하는 것에서 환경, 도구, 구조, feedback loop를 설계하는 쪽으로 이동했다. 이 팀은 agent legibility, repository-local knowledge, strict architecture boundary, custom lint, worktree별 app/observability 환경을 핵심으로 보고했다.

연구 의미:

- Clean의 평가 범위를 source code에서 repository + harness로 확장할 필요가 있다.
- 문서화보다 기계적 enforcement가 중요하다.
- Agent가 볼 수 없는 정보는 실질적으로 존재하지 않는 정보가 될 수 있다.

### 3.2 병렬 Agent의 성능은 Agent 수보다 작업의 분해 가능성에 좌우된다

Anthropic의 16-Agent C compiler 실험에서는 여러 독립 failing test가 있을 때 병렬화가 잘 작동했지만, Linux kernel compile처럼 하나의 순차적 병목으로 수렴하면 여러 Agent가 같은 문제를 반복해서 수정하고 서로 변경을 덮어썼다.

연구 의미:

- Agentic Clean Code에는 parallelizability를 품질 특성으로 넣어야 한다.
- "모듈화"를 사람 조직 분업이 아니라 Agent task 분할 관점에서 다시 읽어야 한다.
- verifier와 task decomposition은 구현 코드만큼 중요하다.

### 3.3 테스트 통과는 production-quality의 충분조건이 아니다

METR의 2026년 연구 노트에서는 SWE-bench Verified 자동 grader를 통과한 Agent PR 중 상당수가 실제 maintainer review에서는 그대로 merge되지 않을 것으로 평가됐다.

연구 의미:

- Agentic Clean Code는 correctness benchmark를 넘어서 repo convention, code quality, hidden regression, maintainability를 다뤄야 한다.
- Definition of Done에 independent review 또는 구조적 품질 검증이 필요하다.

### 3.4 Repository context는 많다고 좋은 것이 아니다

2026년 AGENTS.md 실증 연구에서는 repository context file이 평균적으로 task success를 낮추고 inference cost를 20% 이상 증가시키는 경향이 관찰됐다. 연구진은 최소 요구사항만 넣는 방향을 권고했다.

연구 의미:

- Agent documentation의 목표는 maximal context가 아니라 minimal sufficient context다.
- "설명 가능한 저장소"와 "설명을 많이 가진 저장소"를 구분해야 한다.

### 3.5 탐색과 해결을 분리하는 것이 중요해지고 있다

FastContext 연구는 repository exploration을 별도 subagent로 분리해 coding agent의 token 소비를 크게 줄이면서 해결률을 높일 수 있음을 보고했다. 다른 2026년 연구도 edit 시점에는 주변 전체 파일보다 실제 수정 대상 source representation이 훨씬 중요한 신호라는 결과를 제시했다.

연구 의미:

- 코드 구조는 전체 설명을 잘하는 것보다 정확한 locality와 source discoverability를 높이는 방향이 중요하다.
- Agentic Clean Code의 핵심 metric 후보로 context-to-change ratio를 검토한다.

## 4. 기존 Clean Code와의 관계

초기 가설상 유지될 가능성이 높은 것:

- 좋은 이름
- 높은 응집도
- 낮은 결합도
- 작은 변경 단위
- 명확한 interface
- 자동화된 테스트
- 중복 억제
- 단순한 제어 흐름

재정의가 필요한 것:

| 기존 관점 | Agentic 관점 후보 |
|---|---|
| 읽기 좋은 함수 | 적은 context로 수정 가능한 unit |
| 작은 클래스 | 작은 change blast radius |
| 좋은 이름 | search/localization 가능한 이름 |
| 주석 | 검색 가능하고 검증 가능한 repository knowledge |
| 단위 테스트 | Agent용 verifier 및 행동 피드백 |
| 모듈성 | 병렬 Agent가 독립 수정할 수 있는 경계 |
| 오류 메시지 | 자동 진단과 다음 행동을 제공하는 interface |
| 개발 환경 | hermetic/reproducible Agent execution environment |
| 문서 | progressive disclosure 가능한 versioned context |
| refactoring | 지속적인 entropy/agent-slop garbage collection |

## 5. Agentic Clean Code 품질 속성 후보

아직 확정하지 않는다.

1. **Locality** — 하나의 task가 작은 context와 작은 변경 범위에서 끝나는가.
2. **Legibility** — Agent가 구조, contract, 상태를 저장소만 보고 이해할 수 있는가.
3. **Discoverability** — 수정 위치와 관련 검증 방법을 빠르게 찾을 수 있는가.
4. **Change Isolation** — 한 기능 변경이 다른 영역으로 전파되지 않는가.
5. **Parallel Safety** — 여러 Agent가 동시에 수정해도 conflict surface가 작고 통합 가능성이 높은가.
6. **Verifiability** — Agent가 수동 사람 확인 없이 결과를 검증할 수 있는가.
7. **Diagnosability** — 실패에서 원인 코드까지 짧은 탐색 경로가 존재하는가.
8. **Determinism** — 같은 입력에서 build/test 결과가 안정적으로 재현되는가.
9. **Mechanical Enforcement** — 중요한 규칙이 문서가 아니라 lint/test/schema/type으로 강제되는가.
10. **State Reproducibility** — UI/도메인 실패 상태를 fixture로 직접 만들 수 있는가.
11. **Context Efficiency** — 성공적인 변경에 필요한 token/context 양을 줄이는가.
12. **Recoverability** — Agent session이 끊겨도 artifact를 통해 다음 Agent가 이어갈 수 있는가.
13. **Containment** — Agent 오류가 시스템 전체로 퍼지지 않도록 실행·권한·변경 범위가 제한되는가.
14. **Entropy Resistance** — Agent가 기존 나쁜 패턴을 복제해 확산시키지 못하도록 지속적으로 탐지·정리되는가.

## 6. 검증해야 할 반론

책은 다음 반론을 의도적으로 다룬다.

- 모델이 충분히 좋아지면 Agent용 코드 구조는 필요 없어지는 것 아닌가.
- context window가 매우 커지면 locality는 중요하지 않은가.
- 기존 modularity, testability, observability를 새 이름으로 포장하는 것 아닌가.
- Agent 전용 최적화가 사람 개발자의 이해를 오히려 해칠 수 있지 않은가.
- 코드베이스를 Agent에 맞추는 대신 Agent harness가 기존 코드를 더 잘 이해하도록 해야 하지 않는가.
- 지나친 architecture enforcement가 개발 속도와 표현력을 제한하지 않는가.
- 수백 Agent 병렬 개발은 실제 일반적인 개발 환경에서 필요한가.

## 7. 연구 단계

### Phase R1 — Landscape

목표: 분야의 용어와 강한 근거를 확보한다.

- agentic coding / coding agents
- repository-level coding
- context engineering
- harness engineering
- multi-agent software engineering
- automated verification
- agent observability
- hermetic environments
- repository instructions
- UI reproducibility

### Phase R2 — Classic Clean Code 재검토

Clean Code만 보지 않고 다음 전통을 함께 본다.

- Parnas / information hiding / modular decomposition
- coupling & cohesion
- SOLID
- refactoring
- testing
- observability
- reproducible builds
- architecture fitness functions

각 개념에 대해 "human-first 가치"와 "agent-first 가치"를 분리해서 기록한다.

### Phase R3 — Failure Corpus

실제 Coding Agent 실패를 유형화한다.

예상 분류:

- wrong localization
- unnecessary broad edit
- duplicate implementation
- hidden invariant violation
- stale instructions
- flaky/non-hermetic verification
- merge conflict / hot file
- UI state reproduction failure
- opaque runtime error
- context pollution
- premature completion
- test gaming / benchmark overfitting

### Phase R4 — Metrics

책의 주장에 측정 가능한 지표를 붙인다.

후보:

- files-read / files-changed
- tokens-to-first-correct-location
- change fan-out
- dependency fan-out
- conflict probability
- verification latency
- failure-to-source hops
- flaky rate
- environment bootstrap time
- stale-doc rate
- percentage of architecture rules mechanically enforced
- UI state reproducibility coverage

### Phase R5 — Experiments

동일 기능을 두 구조로 구현한 작은 비교 저장소를 만들 수 있다.

- classic-clean 구조
- agentic-clean 구조

여러 Coding Agent에 동일 task를 반복 실행해 탐색량, 수정 파일 수, 성공률, regression, merge conflict, token cost를 비교한다.

## 8. 현재 판단

"Clean Code는 끝났다"는 책 제목/도입부의 강한 문제 제기로는 사용할 수 있다.

하지만 연구 단계의 더 정확한 명제는 다음과 같다.

> **Clean Code의 시대가 끝난 것이 아니라, Clean의 단위가 코드에서 개발 시스템 전체로 확장되고 있다.**

이 명제가 실제 자료와 실험을 버티는지 다음 리서치에서 검증한다.
