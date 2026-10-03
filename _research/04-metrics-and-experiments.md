# Agentic Clean Code — Metrics and Experiment Design

작성일: 2026-10-03  
상태: 실험 설계 초안

## 1. 왜 Metric이 필요한가

"Agent 친화적인 코드"를 감으로 설명하면 기존 Clean Code 논쟁을 반복하게 된다.

책의 차별점을 만들려면 다음 질문에 답할 수 있어야 한다.

> 이 구조가 실제로 Agent가 변경하기 더 쉬운가?

따라서 source style metric이 아니라 **task execution metric**을 중심으로 잡는다.

---

## 2. 핵심 Metric 후보

### 2.1 Task Surface Size

하나의 task 해결에 실제로 필요한 범위.

측정 후보:

- Files Read
- Files Changed
- Symbols Inspected
- Directories Traversed
- Commands Executed
- Context Tokens Consumed

주의:

단순히 작을수록 무조건 좋지는 않다. 필요한 정보를 빠뜨려 false fix가 늘어날 수 있다.

따라서 성공한 task끼리 비교하는 방식이 적절하다.

---

### 2.2 Localization Cost

정확한 수정 위치를 찾기 전까지 소비한 비용.

- searches before first correct file
- files opened before correct file
- tokens before localization
- elapsed time before first relevant edit
- wrong-file edit count

책의 중요한 지표 후보다.

---

### 2.3 Change Blast Radius

하나의 요구사항이 실제 repository에 퍼지는 범위.

후보:

- files changed
- modules changed
- packages changed
- dependency fan-out
- unrelated test failures
- required downstream changes

특히:

```
Change Fan-out =
  affected modules outside owning bounded context
  / total affected modules
```

같은 지표를 실험할 수 있다.

---

### 2.4 Change Coupling Score

Git history 기반.

파일 A 변경 시 B가 같이 변경되는 비율.

이것을 module/domain 경계와 비교한다.

위험 signal:

- 서로 다른 bounded context인데 높은 co-change
- central registry가 대부분 feature commit에 포함
- unrelated test/config가 반복 동반 변경

---

### 2.5 Hot File Index

Agent 병렬성에 직접 관련.

후보 정의:

```
HotFile(file) =
  distinct feature/task commits touching file
  × concurrent collision probability
```

실험에서는 간단히:

- 최근 N commit 중 touch 비율
- distinct domain 수
- feature PR touch count

를 사용할 수 있다.

대표 smell:

- root index
- global route registry
- permissions map
- shared config
- giant types
- global stylesheet

---

### 2.6 Verification Latency

수정 후 신뢰 가능한 signal을 얻는 데 걸리는 시간.

- local unit test
- targeted integration
- architecture rule
- typecheck
- visual check

각 단계의 p50/p95를 측정한다.

Agent loop가:

```
inspect → edit → verify → inspect
```

이므로 verification latency는 autonomy throughput의 핵심 변수다.

---

### 2.7 Verification Reliability

- flaky rate
- retry rate
- false failure rate
- environment-dependent failure rate
- non-actionable failure rate

특히 Agent 실험에서는 동일 commit/test를 반복 실행해 determinism을 측정한다.

---

### 2.8 Diagnostic Distance

failure signal에서 root source까지 필요한 탐색 단계.

예:

```
generic 500
→ server log
→ stack trace
→ service
→ repository search
→ source
```

보다:

```
AUTH_TOKEN_EXPIRED
→ auth/token-validator
→ test AUTH-TOKEN-003
```

가 짧다.

측정 후보:

- search/tool calls
- files inspected
- tokens consumed
- time to root cause

---

### 2.9 Parallel Conflict Rate

동일 base commit에서 N Agent에게 독립 task를 배정한다.

측정:

- textual merge conflict
- semantic conflict
- same-file touch
- same-symbol touch
- shared config collision
- post-merge regression

100 Agent 실험은 비용이 크므로 우선 2/4/8/16 Agent scaling curve부터 측정한다.

---

### 2.10 Context Efficiency

성공한 task에 대해:

```
Context Efficiency =
successful changes / context tokens
```

혹은 비교하기 쉽게:

```
Tokens per Successful Task
Files Read per Successful Task
```

를 사용한다.

---

### 2.11 UI Reproducibility Coverage

주요 UI component/page의 state matrix 중 독립 fixture/story로 재현 가능한 비율.

상태 후보:

- default
- loading
- empty
- error
- disabled
- partial data
- permission denied
- long content
- mobile/tablet
- slow response

측정:

```
Reproducible UI States / Required UI States
```

---

### 2.12 Mechanical Enforcement Ratio

중요한 project rule 중 CI가 자동으로 검증하는 비율.

예:

- architecture dependency
- cycle
- naming
- schema
- generated code
- formatting
- import boundary
- security baseline

```
Machine Enforced Rules / Critical Rules
```

---

## 3. 실험 저장소 설계

같은 business domain을 두 가지 방식으로 구현한다.

### Variant A — Conventional Clean

기존 일반적인 clean architecture / clean code 원칙을 잘 따른다.

의도적으로 나쁜 코드를 만들지는 않는다.

### Variant B — Agentic Clean

A와 기능은 같지만 다음을 추가한다.

- bounded task surfaces
- no central hot registry
- module-local contracts
- executable architecture rules
- local fast verifier
- stable error ids
- structured diagnostics
- hermetic fixtures
- UI state stories
- directory-scoped Agent instructions
- deterministic build/test

중요:

A를 strawman으로 만들면 실험 가치가 없다.

---

## 4. 동일 Task Set

두 variant에 같은 요구사항을 준다.

### Feature Task

- 필드 추가
- permission 추가
- API endpoint 추가
- validation rule 추가

### Bug Task

- null edge case
- timezone 오류
- race condition
- wrong permission
- UI overflow

### Cross-cutting Task

- logging policy 변경
- error schema 변경
- dependency upgrade

### UI Task

- empty state
- long text
- mobile layout
- API error state

---

## 5. Agent 실행 방식

동일 model/version/tool budget 사용.

각 task는 독립 fresh context에서 시작한다.

기록:

- prompt
- tool call
- files read
- files changed
- token
- command
- elapsed time
- test results
- final diff
- retries

같은 task를 여러 번 반복하여 stochastic variance를 본다.

---

## 6. Parallel Experiment

N = 2, 4, 8, 16부터 시작.

각 Agent가 서로 다른 feature task를 수행한다.

측정:

- merge conflict count
- semantic conflict count
- shared file touch count
- merge 후 failed test
- integration repair time

가설:

> Agentic variant는 Agent 수가 증가할수록 Conventional variant보다 conflict 증가율이 완만할 것이다.

---

## 7. Localization Experiment

Agent에게 bug report만 제공한다.

예:

```
"관리자 사용자 목록에서 장문의 부서명이 들어오면 버튼이 화면 밖으로 나간다."
```

비교:

- app navigation 필요 여부
- correct component 발견까지 files read
- UI state fixture 존재 여부
- screenshot verifier 실행 여부
- successful fix까지 tool calls

---

## 8. Diagnostics Experiment

같은 defect를 두 variant에 삽입.

### A

generic exception + plain log

### B

stable error id + structured field + source hint + targeted verifier

측정:

- root cause 찾기까지 시간
- 잘못 수정한 파일 수
- search count
- token usage

---

## 9. Test Reliability Experiment

동일 코드에:

- external DB
- real clock
- external network
- shared filesystem state

를 사용하는 verifier와 hermetic verifier를 비교한다.

Agent가 flaky signal에서 얼마나 불필요한 수정/retry를 하는지 관찰한다.

---

## 10. 책에서 사용할 수 있는 결과 형태

최종적으로 "Agentic Clean Score 87점" 같은 단일 점수는 만들지 않는 것이 좋다.

대신 profile을 사용한다.

예:

| Quality | Conventional | Agentic |
|---|---:|---:|
| Files read/task | 18.2 | 6.4 |
| Files changed/task | 5.1 | 2.7 |
| Localization tool calls | 12.8 | 4.3 |
| Targeted verification p50 | 74s | 9s |
| Parallel merge conflicts / 16 tasks | 7 | 1 |
| Flaky verification | 4.1% | 0.2% |
| UI state reproducibility | 35% | 92% |

실험 결과가 예상과 다르면 그것도 책의 중요한 결과다.

---

## 11. 이 단계의 연구 명제

앞으로 검증할 중심 명제:

> **Agentic Clean Code의 품질은 source code가 얼마나 예쁜지가 아니라, 올바른 변경을 수행하기 위해 필요한 탐색·context·coordination·verification의 총비용으로 측정할 수 있다.**

이 명제를 다음 리서치와 실제 실험을 통해 깨뜨릴 수 있어야 한다.


---

## 12.13 Worktree Avoidability / Isolation Metric

병렬 Agent에서 모든 Task에 같은 수준의 격리를 강제하는 대신, 코드베이스가 얼마나 많은 Task를 낮은 isolation level에서 안전하게 실행할 수 있는지 측정한다.

### Worktree Avoidability Rate

```
worktree 없이 안전하게 실행 가능한 edit task
/
전체 edit task
```

### Isolation Escalation Rate

```
shared execution 후보였으나 worktree/container로 승격된 task
/
shared execution 후보 task
```

### Shared Workspace Collision Rate

```
shared workspace에서 file/runtime/state 충돌이 발생한 task pair
/
shared workspace 병렬 task pair
```

### Integration Repair Cost

Worktree 여부와 별개로 병렬 변경을 합친 뒤 추가로 필요한:

- Agent turns
- files changed
- test runs
- tokens
- elapsed time

을 측정한다.

이 지표들은 `18-worktree-minimization.md`의 Hybrid Isolation 실험과 연결한다.


### 2.14 Reasoning Dependency Surface

Agent가 한 변경을 만들기 위해 실제 판단 근거로 읽은 file/module/symbol 범위.

~~~text
RDS(task) = unique reasoning dependencies observed before write
~~~

단순 Files Changed보다 병렬 안전성을 더 잘 설명할 수 있는지 검증한다.

함께 기록할 값:

- readSet(A) ∩ writeSet(B)
- cross-agent stale dependency count
- contract invalidation count
- shared boundary readers/writers
- stale-write retry count

### 2.15 Isolation Decision Accuracy

Hybrid scheduler가 선택한 isolation level의 정확도를 본다.

- False Safe: shared 실행을 선택했지만 충돌/오염 발생
- False Isolation: worktree/container를 선택했지만 shared 실행도 안전했음

목표는 Worktree 수 자체의 최소화가 아니라 성공률을 유지하면서 불필요한 isolation cost를 줄이는 것이다.


---

## 13. Gap Closure 이후 추가 Metric

20~27번 추가 조사로 기존 task execution metric을 다음 영역까지 확장한다.

### 13.1 Evolution Stability

단일 task의 마지막 상태가 아니라 연속 task의 변화율을 본다.

- Structural Erosion Velocity
- Follow-up Resolve Delta
- Context Growth Rate
- Cleanup Debt
- Architecture Violation Persistence

### 13.2 Requirement / Invariant Discovery

- Implicit Requirement Recovery Rate
- Boundary Violation Rate
- Invariant Search Cost
- Clarification Precision / Recall
- Spec Drift Count

### 13.3 Verifier Validity

- Verifier Mutation Kill Rate
- Requirement Coverage
- Orphan Verifier Rate
- Independent Oracle Agreement
- False Rejection Review Rate

중요:

> test 수와 hidden test 수를 verifier quality의 proxy로 사용하지 않는다.

### 13.4 Visual Feedback

- State Reachability Cost
- Visual Diagnosis Cost
- Render-Fix Iterations
- Visual Flake Rate
- interaction-verified UI state coverage

### 13.5 Verification Efficiency

Verification Latency만으로 충분하지 않다.

함께 기록:

- Time to First Trustworthy Signal
- Affected Set Ratio
- Missed Dependency Rate
- Regression Detection per Cost
- Verification Amplification

### 13.6 Context Trust

- Protected Path Violation
- Context Provenance Coverage
- Security Verifier Bypass
- Untrusted-to-Privileged Escalation

실제 공격 성공률 benchmark를 이 책의 핵심 metric으로 만들지는 않는다. 저장소/harness가 품질 경계를 보호하는 정도만 본다.

### 13.7 Continuity / Handoff

- Handoff Recovery Time
- Redundant Exploration
- State Reconstruction Accuracy
- Stale Handoff Rate
- session reset 전후 Continuity Loss

## 14. Metric 사용 원칙 보정

### 14.1 절대값과 정규화 값을 같이 기록한다

Architecture smell, LOC, test 수처럼 분모가 빠르게 바뀌는 metric은 density만 기록하지 않는다.

예:

~~~text
smell_count
smell_per_kloc
new_smells
resolved_smells
~~~

를 함께 본다.

### 14.2 Metric 자체를 목표로 최적화하지 않는다

낮은 files-read가 무조건 좋은 것이 아니다.

필요한 invariant를 놓치고 바로 수정하면 files-read는 낮아도 실패다.

따라서 과정 metric은 성공/정확성 판정과 함께 해석한다.

### 14.3 시간축이 있는 metric을 분리한다

v0.1 단발 A/B와 sequential evolution 실험을 섞지 않는다.

- v0.1: localization/change/verification cost
- 후속: erosion velocity/follow-up maintainability

### 14.4 Verifier도 실험 대상 artifact다

metric을 계산하기 전에:

- reference pass
- negative control
- mutant kill
- spec-verifier traceability

를 확인한다.

상세:

- `20-iterative-structural-erosion.md`
- `21-requirement-discoverability.md`
- `22-verifier-validity.md`
- `23-visual-feedback-loop.md`
- `24-architecture-drift-and-erosion.md`
- `25-verification-efficiency.md`
- `26-context-trust-boundary.md`
- `27-long-running-continuity.md`
