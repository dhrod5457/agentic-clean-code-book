# 추가 리서치 Gap Closure — 무엇을 더 조사하고 어디서 멈출 것인가

작성일: 2026-10-03  
상태: 리서치 종합 v0.1

## 1. 목적

00~19번까지의 자료를 다시 검토한 결과 Worktree, Shared Workspace, multi-agent isolation 분야는 이미 충분한 1차 자료와 반론을 확보했다.

남아 있던 큰 공백은 다음이었다.

1. 장기 반복 변경에서 구조가 어떻게 변하는가
2. 요구사항이 불완전할 때 Agent가 무엇을 하는가
3. verifier 자체를 얼마나 믿을 수 있는가
4. UI에서 visual feedback이 실제 coding loop에 어떤 영향을 주는가
5. Agent가 실제 architecture drift를 만드는가
6. 빠른 verification을 어떻게 충분한 verification과 양립시키는가
7. repository/context 자체를 얼마나 신뢰해야 하는가
8. session을 넘는 장기 개발 상태를 어떻게 이어가는가

20~27번 문서는 이 공백을 채운다.

---

## 2. 추가된 문서

| 문서 | 질문 | 핵심 자료 |
|---|---|---|
| 20 | 반복 변경에서 구조가 무너지는가 | SlopCodeBench, CodeThread, ChainSWE, SWE-CI, Debt Behind AI Boom, EvoCode-Bench |
| 21 | 요구사항이 불완전하면 어떻게 되는가 | SWE-RPG, UnderSpecBench, ClarifyCodeBench, SLUMP, E2E-SWE |
| 22 | verifier를 신뢰할 수 있는가 | ReviveBench, COBA, OpenAI SWE-bench audits, PAIChecker |
| 23 | 화면을 보는 것이 실제로 도움이 되는가 | WebGen-Bench, WebGen-Agent, ReLook, CUA-SWE |
| 24 | Agent가 architecture를 실제로 악화시키는가 | Java 151-repo study, architecture erosion mapping, architecture decay research |
| 25 | 빠른 test와 충분한 test를 어떻게 결합하는가 | Google RTS, Predictive Test Selection, Nx affected |
| 26 | Agent가 읽는 context를 모두 신뢰해도 되는가 | GitInject, USENIX malicious skills, MCP security research |
| 27 | 긴 작업을 새 session이 어떻게 이어가는가 | Anthropic long-running harnesses, SLUMP, NL2Repo, ChainSWE/SWE-CI |

---

## 3. 이번 조사로 강해진 기존 원칙

### Locality / Discoverability

여전히 강하다.

단, "Agent의 context window가 작으니 파일을 작게"가 근거가 아니다.

더 강한 근거는:

- localization이 독립 난제
- implicit invariant recovery도 독립 난제
- long-context capability가 있어도 correct source/invariant discovery 비용은 남음

이다.

### Change Isolation / Parallel Safety

18~19번 연구로 충분히 강해졌다.

단순 write/write conflict보다:

- read/write dependency
- shared contract invalidation
- runtime/build state

까지 포함해야 한다.

### Verifiability

더 중요해졌지만 의미가 바뀐다.

기존:

> 빨리 test할 수 있는가.

보정:

> **빠르고 신뢰도 높은 verifier를 찾을 수 있으며 verifier 자체가 ground truth에 맞게 검증돼 있는가.**

### Recoverability

장기 harness 자료로 강화됐다.

단순 progress summary가 아니라:

- Git
- task state
- executable verification
- durable decision/failure artifact

를 함께 본다.

### Entropy Resistance

20번 자료로 가장 강하게 보강됐다.

snapshot quality보다 반복 변경에서 **열화 속도**를 측정해야 한다.

### Containment

26번 자료로 보정이 필요하다.

권한·workspace뿐 아니라 **context trust boundary**를 포함해야 한다.

---

## 4. 새 품질 속성 후보

모든 것을 새로운 이름으로 만들 필요는 없다.

기존 속성 안에 흡수할 수 있는 것은 흡수한다.

### 별도 후보 1. Invariant Discoverability

한 변경의 올바른 범위를 결정하는 contract, 금지조건, compatibility rule을 얼마나 적은 탐색으로 찾을 수 있는가.

Discoverability의 하위 속성으로 둘 수도 있다.

### 별도 후보 2. Verifier Validity

자동 verifier가 실제 specification과 ground truth를 얼마나 정확하게 판정하는가.

Verifiability의 하위 속성으로 두는 것이 적절하다.

### 별도 후보 3. Context Trust Boundary

Agent가 읽는 정보의 provenance와 신뢰 수준이 보존되며 낮은 신뢰 입력이 privileged action으로 직접 승격되지 않는가.

Containment만으로 표현하기 어려우면 독립 속성으로 둔다.

### 별도 후보 4. Evolution Stability

연속 변경에서 구조/검증/탐색 비용의 증가 속도가 통제되는가.

Entropy Resistance의 더 측정 가능한 표현으로 쓸 수 있다.

---

## 5. 추가할 Metric 후보

### Long-horizon

- Structural Erosion Velocity
- Follow-up Resolve Delta
- Context Growth Rate
- Cleanup Debt

### Requirement

- Implicit Requirement Recovery Rate
- Boundary Violation Rate
- Invariant Search Cost
- Spec Drift Count

### Verifier

- Mutation Kill Rate
- Requirement Coverage
- Orphan Verifier Rate
- Oracle Agreement

### UI

- State Reachability Cost
- Visual Diagnosis Cost
- Render-Fix Iterations
- Visual Flake Rate

### Architecture

- Erosion Velocity
- Violation Persistence
- Boundary Crossing Growth
- raw smell + density 동시 기록

### Verification

- Time to First Trustworthy Signal
- Affected Set Ratio
- Missed Dependency Rate
- Verification Amplification

### Security

- Protected Path Violation
- Context Provenance Coverage
- Security Verifier Bypass

### Continuity

- Handoff Recovery Time
- Redundant Exploration
- State Reconstruction Accuracy
- Stale Handoff Rate

---

## 6. 현재 A/B 실험 설계에 바로 반영해야 할 것

v0.1의 독립 변수 자체를 늘리지는 않는다.

실험 중간에 requirement ambiguity, security injection, long-horizon evolution까지 넣으면 무엇을 측정하는지 흐려진다.

대신 **실험 방법론의 결함을 막는 조치**는 지금 반영할 가치가 있다.

### 6.1 Verifier Calibration

필수:

- reference pass
- negative control
- 핵심 invariant mutant
- requirement ↔ verifier traceability

### 6.2 UI 과정 지표

실험 3에서 추가 기록:

- first reproduction time
- first screenshot/render time
- root component localization time
- render-edit iteration

### 6.3 Verification 과정 지표

- first verifier command
- time to first trustworthy signal
- targeted/full suite 횟수
- 완료 선언 뒤 hidden failure

### 6.4 Metric에서 absolute + normalized를 같이 기록

특히:

- LOC
- test count
- architectural smell
- files/modules

은 density 하나만 쓰지 않는다.

### 6.5 실험 task ambiguity audit

각 task에 대해 구현 전 독립 검토자가:

- target
- expected behavior
- prohibited change
- compatibility condition

이 충분히 결정됐는지 확인한다.

이것은 B에 유리한 repository instruction을 추가하자는 뜻이 아니다.

task 자체의 실험 오류를 줄이기 위한 절차다.

---

## 7. v0.1 뒤에 이어질 실험 순서

### Stage 1 — 현재 A/B

목표:

- localization
- change surface
- parallel feature addition
- UI state reproduction

### Stage 2 — Sequential Evolution

20~30개 작은 task를 reset 없이 순서대로 적용.

목표:

- erosion velocity
- follow-up maintainability
- context growth

### Stage 3 — Requirement Discovery

명시되지 않은 repository invariant를 찾는 능력.

목표:

- invariant discoverability
- overscope/wrong target

### Stage 4 — Isolation Strategy

18~19번의:

- Full Worktree
- Cheap Worktree
- Shared + Central Git
- Optimistic Shared State

비교.

### Stage 5 — Security / Trust Boundary

실제 공격 실험이 아니라 안전한 benign injection과 protected path를 이용해 context trust 정책을 검증.

---

## 8. 추가 리서치를 더 해야 하는가

### 지금은 충분한 영역

- Worktree / Shared Workspace
- repository context/instructions
- multi-agent coordination
- classic modularity와 연결
- coding agent failure taxonomy
- long-horizon structural erosion
- requirement ambiguity
- verifier validity
- UI feedback
- architecture drift 반론
- verification selection
- security trust boundary
- long-running continuity

### 구현/실험 전에 추가 원문이 꼭 필요하지 않은 영역

- 더 많은 Agent framework 비교
- 더 많은 AGENTS.md 사례
- 더 많은 Git alternative
- 일반적인 Clean Code 블로그
- 단순 vendor productivity claim

이들은 현재 논지를 크게 바꿀 가능성이 낮다.

---

## 9. 이후 자료를 추가하는 기준

앞으로는 "관련 있어 보인다"는 이유만으로 sources를 늘리지 않는다.

새 자료는 다음 중 하나를 만족할 때만 추가한다.

1. 현재 core principle을 반박한다.
2. 기존 metric 정의를 바꾼다.
3. 실험 validity 문제를 발견한다.
4. 현재 자료보다 훨씬 큰/좋은 empirical evidence다.
5. 실제 실험 결과와 충돌하는 설명을 제공한다.

그 외 자료는 집필 단계에서 참고문헌 후보로만 관리한다.

---

## 10. Research Freeze 후보

다음 조건이 충족되면 리서치 단계는 v0.1 기준으로 동결할 수 있다.

- 20~27 자료가 sources index와 research map에 연결
- core principles v0.3에서 새 근거/반론 반영
- A/B experiment design에 verifier calibration 반영
- 실험 task 3개 ambiguity audit 완료
- raw metric schema 확정
- 실험 model/machine/budget 결정

이후 새 논문이 나올 때마다 실험을 미루지 않는다.

---

## 11. 현재 전체 결론

현재 자료를 종합하면 Agentic Clean Code를 다음처럼 설명하는 것이 가장 방어적이다.

> 기존 Clean Code를 폐기하는 것이 아니다. 사람이 코드를 읽고 변경하기 좋게 만들던 품질 속성을 유지하면서, Coding Agent가 저장소를 탐색하고, 요구사항의 숨은 제약을 찾고, 독립적으로 변경하고, 신뢰 가능한 verifier로 결과를 확인하고, 여러 session과 여러 Agent 사이에서 상태를 이어가며, 반복 변경 뒤에도 구조가 빠르게 무너지지 않게 하는 개발 시스템까지 Clean의 범위를 확장한다.

중요한 점은 Agent 전용 문법이나 특정 folder architecture를 제안하는 것이 아니다.

검증해야 하는 대상은:

~~~text
코드 모양
    ↓
Agent 행동
    ↓
변경 결과
    ↓
다음 Agent의 비용
~~~

사이의 실제 인과관계다.

이제 자료를 더 넓게 수집하기보다 원칙을 갱신하고 실험으로 넘어갈 수 있는 상태에 가깝다.
