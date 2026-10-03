# 요구사항이 불완전할 때 Agent는 무엇을 하는가

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 문제

현재 Agentic Clean Code 연구는 주로 다음을 묻는다.

> 요구사항이 주어졌을 때 Agent가 올바른 코드를 찾고 안전하게 수정할 수 있는가?

하지만 실제 개발의 요구사항은 benchmark처럼 완전하지 않다.

예를 들어 사용자는:

> 관리자 목록에서 퇴사자를 숨겨줘.

라고만 말할 수 있다.

저장소에는 실제로 다음 조건이 숨어 있을 수 있다.

- 감사 화면에서는 퇴사자도 보여야 함
- CSV export는 기존 동작 유지
- API에는 상태를 포함하되 UI만 숨김
- 관리자 권한별 결과가 다름
- 기존 모바일 클라이언트와 호환 필요

이런 조건은 issue에 없고 코드, 테스트, API contract, 과거 commit, 문서에 흩어져 있을 수 있다.

따라서 Agent 친화성에는 localization뿐 아니라 **암묵적 요구사항을 발견하는 능력**도 포함될 수 있다.

---

## 2. SWE-RPG — Issue 해결을 세 단계로 나눠보면 어디서 실패하는가

출처:

- SWE-RPG: A Unified Issue Resolution Benchmark
- https://arxiv.org/abs/2608.09072
- 2026
- 31개 Python/Java repository
- 163 tasks: bug fix 113, feature 50

SWE-RPG는 issue 해결을 한 덩어리로 평가하지 않고 다음을 분리한다.

1. requirement clarification
2. implementation planning
3. code generation

각 단계에 검증된 intermediate ground truth를 두어 어느 단계에서 실패했는지 본다.

보고된 전체 평균 resolved 비율은 31.5% 수준이었고, **implicit requirement recovery failure**가 실행의 24.5~46.0%에서 주요 병목으로 나타났다.

### 의미

Agent가 코드를 잘 작성하지 못해서만 실패하는 것이 아니다.

코드를 쓰기 전에:

> "이 요청이 실제로 무엇을 의미하는가?"

를 복원하는 단계에서 이미 큰 손실이 생긴다.

---

## 3. UnderSpecBench — 모호하면 Agent가 질문하는가, 추측하는가

출처:

- Coding Agents Are Guessing: Benchmarking Action Under Underspecification
- UnderSpecBench
- https://arxiv.org/abs/2607.02294
- 2026
- 69 DevOps task families
- 2,208 prompt variants

UnderSpecBench는 같은 environment와 안전한 정답 행동을 유지한 채 instruction만 바꾼다.

변수:

- intent clarity
- target certainty
- blast radius information

행동은 deterministic oracle로 다음처럼 분류한다.

- Safe Success
- Wrong Target
- OverScope
- clarification/refusal/deferment 등 non-action

주요 결과:

- 실제 행동한 실행의 55.8~67.8%가 적어도 하나의 action boundary를 침범
- target ambiguity가 action quality를 크게 악화
- blast-radius hint만 추가하는 것으로 action propensity가 충분히 낮아지지 않음

### 중요한 해석

불명확한 요구사항은 단순히 성공률을 낮추는 문제가 아니다.

Agent가:

> 모르니 멈춘다.

가 아니라:

> 아마 이 뜻일 것이다.

라고 행동할 수 있다.

이것은 production code 변경에서는 중요한 차이다.

---

## 4. ClarifyCodeBench — 강한 Coding Agent가 질문도 잘하는가

출처:

- ClarifyCodeBench
- https://arxiv.org/abs/2607.00711
- 2026

이 benchmark는 coding request 안의 ambiguity를 식별하고 필요한 clarification question을 만드는 능력을 평가한다.

관찰된 중요한 경향:

- 코드 생성 성능이 높은 Agent라고 clarification 성능도 자동으로 높은 것은 아님
- reasoning을 늘려도 ambiguity detection 개선은 제한적
- 여러 ambiguity가 동시에 있으면 성능이 크게 떨어짐

### 의미

Agent harness에서:

~~~text
uncertain → ask
~~~

정책을 적는 것만으로 충분하지 않을 수 있다.

저장소가 ambiguity를 줄이는 contract와 executable evidence를 제공해야 한다.

---

## 5. SLUMP — 요구사항이 작업 중에 계속 생기면 어떻게 되는가

출처:

- When the Specification Emerges
- SLUMP
- https://arxiv.org/abs/2603.17104
- 2026
- 20 recent ML papers
- 371 atomic verifiable components
- 약 60 progressive coding requests

SLUMP는 완성된 specification을 한 번에 주는 조건과, 실제 제품 개발처럼 요구가 점진적으로 나타나는 조건을 비교한다.

Claude Code 기준 20개 중 16개 paper에서 single-shot specification이 더 높은 faithfulness를 보였고, Codex에서도 20개 중 14개에서 같은 경향이 보고됐다.

progressive specification에서는 structural integration도 악화됐다.

연구에서 추가한 ProjectGuard라는 외부 project-state layer는 Claude Code에서 single-shot 대비 faithfulness gap의 약 90%를 회복했다.

보고된 예:

- fully faithful components: 118 → 181
- severe failures: 72 → 49

### 의미

요구사항을 prompt history 안에서만 유지하면 장기 프로젝트에서 drift가 생길 수 있다.

중요한 결정과 완료 상태를 **durable project artifact**로 외부화하는 것이 도움이 될 수 있다.

---

## 6. E2E-SWE — 좋은 benchmark task 자체도 검증이 필요하다

출처:

- E2E-SWE
- https://arxiv.org/abs/2609.38335
- 2026
- 186 full-repository generation tasks
- 11 languages

이 benchmark는 task를 software engineer와 LLM이 함께 만들고, 실제 model rollout을 이용해 task defect를 반복 감사한다.

연구 의미는 benchmark 점수보다 task 작성 방법에 있다.

좋은 Agent 실험은:

- 요구사항이 실행 가능한지
- hidden test와 specification이 맞는지
- reference implementation이 존재하는지
- rollout 중 예상하지 못한 ambiguity가 없는지

를 실험 전에 점검해야 한다.

---

## 7. 새로운 구분: Requirement Completeness와 Requirement Discoverability

두 문제를 구분해야 한다.

### Requirement Completeness

사용자 request 자체에 필요한 조건이 충분히 적혀 있는가.

이것은 task author/harness 문제다.

### Requirement Discoverability

request에 직접 쓰지 않은 repository invariant를 Agent가 찾아낼 수 있는가.

예:

~~~text
요청
 ↓
관련 feature
 ↓
module contract
 ↓
architecture rule
 ↓
tests
 ↓
historical decision
~~~

이 경로가 명확한가.

두 번째는 코드베이스 설계와 직접 연결된다.

---

## 8. Agentic Clean Code에 추가할 연구 질문

### RQ — 숨은 제약을 얼마나 쉽게 발견할 수 있는가

- 한 feature의 invariants가 어디에 기록돼 있는가.
- production code와 test가 서로 다른 규칙을 암시하지 않는가.
- public contract와 internal implementation을 구분할 수 있는가.
- 금지된 변경 범위를 machine-readable하게 알 수 있는가.
- 과거 결정이 현재 코드와 충돌하지 않는가.
- 요구가 불충분하면 안전하게 질문/보류할 수 있는가.

---

## 9. 품질 속성 후보: Invariant Discoverability

정의 후보:

> **한 변경의 올바른 범위를 결정하는 데 필요한 invariant, contract, 금지 조건을 적은 탐색으로 찾을 수 있는 정도.**

Locality와 차이:

- Locality: 관련 코드가 가까운가.
- Invariant Discoverability: 올바른 행동을 제한하는 규칙을 찾을 수 있는가.

예를 들어 파일은 가까워도 중요한 backward compatibility 규칙이 오래된 wiki에만 있으면 discoverability는 낮다.

---

## 10. Metric 후보

### Implicit Requirement Recovery Rate

gold requirement 중 prompt에 직접 쓰이지 않은 항목을 Agent가 실제 구현에 반영한 비율.

### Clarification Precision / Recall

- 정말 모호한 상황에서 질문했는가.
- 명확한 상황에서 불필요하게 멈추지는 않았는가.

### Boundary Violation Rate

~~~text
wrong target + overscope
/
action runs
~~~

### Invariant Search Cost

올바른 invariant를 처음 확인하기 전:

- files read
- searches
- tokens
- elapsed time

### Spec Drift Count

연속 task에서 이전에 확정된 요구사항과 충돌한 구현 수.

---

## 11. 코드베이스 설계에 미치는 영향

### 11.1 중요한 invariant는 실행 가능한 artifact로 둔다

예:

- architecture test
- schema
- type
- API contract
- compatibility test
- permission matrix
- invariant-focused test name

문서에만 있는 규칙보다 drift를 잡기 쉽다.

### 11.2 feature ownership을 찾을 수 있게 한다

한 규칙의 주인이:

- package
- service
- test
- API
- error identifier

에서 서로 다른 답을 주면 requirement recovery가 어렵다.

### 11.3 "모르면 질문하라"가 가능한 harness가 필요하다

Agent가 무조건 production edit를 해야 성공으로 간주되면 UnderSpecBench와 같은 guessing을 유도한다.

정상 완료 상태에 다음이 포함돼야 한다.

- no change
- clarification required
- blocked by missing contract
- conflict with existing requirement

---

## 12. 현재 A/B 실험에는 어떻게 반영할 것인가

v0.1의 세 task는 가능한 한 specification을 명확하게 유지해야 한다.

A와 B 중 한쪽만 숨은 요구사항을 더 쉽게 발견하도록 만들면 구조 비교가 아니라 task ambiguity 비교가 된다.

따라서 v0.1에는:

- task text 고정
- expected behavior 고정
- hidden test 사전 고정
- ambiguity audit

만 추가하는 것이 적절하다.

Requirement Discoverability는 별도 실험으로 둔다.

### Experiment R1 — Implicit Invariant Discovery

Task prompt에서는 동일한 핵심 요청만 제공한다.

저장소 안에는 양쪽 모두 동일한 business invariant가 존재하지만 제공 방식이 다르다.

A:
- 여러 위치에 흩어진 자연스러운 conventional structure

B:
- module-local contract + executable invariant

측정:

- invariant discovery success
- wrong-layer edit
- overscope
- hidden regression
- search cost

중요: A를 의도적으로 난해하게 만들면 안 된다.

---

## 13. 현재 판단

Agentic Clean Code는 "Agent에게 더 많은 설명을 주는 방법"으로 축소하면 안 된다.

더 정확한 방향은:

> **요구사항이 불완전해도 저장소의 contract와 invariant를 빠르게 찾아 안전한 변경 범위를 결정할 수 있게 한다.**

그리고 요구사항 자체가 결정되지 않은 경우에는:

> **추측해서 코드를 쓰는 것보다 질문하거나 보류하는 것이 정상적인 성공 상태가 되어야 한다.**

이 두 가지를 코드 구조와 harness 양쪽에서 함께 다뤄야 한다.
