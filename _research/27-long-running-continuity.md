# Context Window를 넘는 개발은 어떻게 이어지는가

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 문제

장기 Agent 작업에서는 session이 계속 바뀐다.

새 session은 이전 Agent의 내부 reasoning을 직접 가지고 있지 않다.

따라서 중요한 질문은:

> 다음 Agent가 이전 Agent의 머릿속을 복원할 수 있는가?

가 아니다.

더 현실적인 질문은:

> **작업을 이어가는 데 필요한 상태가 durable artifact로 남아 있는가?**

다.

---

## 2. Anthropic — Effective harnesses for long-running agents

출처:

- Anthropic
- Effective harnesses for long-running agents
- 2025-11-26
- https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

이 사례는 여러 context window에 걸친 application development에서 새 session이 이전 session을 잊는 문제를 다룬다.

제안한 기본 구조:

### Initializer Agent

초기에:

- project scaffold
- `init.sh`
- `claude-progress.txt`
- structured feature list
- initial git commit

을 만든다.

### Coding Agent

각 session에서:

1. progress artifact 읽기
2. git log/history 확인
3. 기본 동작 검증
4. 하나의 feature에 집중
5. 구현/검증
6. commit
7. progress 업데이트

### 중요한 점

handoff를 prose summary 하나에 의존하지 않는다.

- Git
- executable app
- feature list
- progress file
- test

가 서로 보완한다.

또 end-to-end browser automation이 application quality를 높이는 데 도움을 줬다고 설명한다.

---

## 3. Anthropic 2026 Harness Design — 모델이 좋아지면 harness도 바뀐다

출처:

- Harness design for long-running application development
- Anthropic
- 2026-03-24
- https://www.anthropic.com/engineering/harness-design-long-running-apps

후속 구조는:

- planner
- generator
- evaluator

세 역할을 분리한다.

Planner:
- 간단한 prompt를 product specification으로 확장

Generator:
- sprint 단위 구현

Evaluator:
- Playwright MCP 등을 사용해
  - 기능
  - UI
  - API
  - DB

를 검증

Generator와 Evaluator는 코딩 전에 **sprint contract**를 합의하고, Agent 사이 communication은 files를 통해 유지한다.

보고된 한 사례에서는 Opus 4.5 기반 harness가 solo 실행보다 훨씬 많은 시간/비용을 썼지만 결과 품질이 크게 좋아졌다. 이후 Opus 4.6에서는 일부 scaffolding이 덜 필요해졌다.

### 가장 중요한 교훈

> 특정 모델의 약점을 보완하기 위해 만든 harness를 영구적인 architecture principle로 만들면 안 된다.

모델 capability가 변하면 harness assumption을 다시 검증해야 한다.

---

## 4. SLUMP의 ProjectGuard와 연결

21번 문서에서 본 SLUMP는 progressive specification에서 장기 drift가 발생함을 보여준다.

외부 project-state layer인 ProjectGuard를 넣었을 때 Claude Code의 single-shot 대비 faithfulness gap의 약 90%를 회복했다.

즉 continuity artifact는 단순 메모가 아니다.

다음과 같은 상태를 machine-readable하게 보존할 수 있다.

- 확정 요구사항
- 아직 미결정인 요구사항
- 완료 feature
- 금지된 회귀
- interface contract
- 검증 결과

---

## 5. NL2Repo-Bench — 빈 저장소에서 전체 repository를 만들 때

출처:

- NL2Repo-Bench
- ICML 2026
- https://proceedings.mlr.press/v306/ding26j.html

긴 요구사항 문서와 빈 workspace에서 repository 전체를 만드는 long-horizon task를 평가한다.

강한 Agent도 평균 test pass가 약 40% 수준이고 repository 전체를 완성하는 경우는 드물었다.

관찰된 failure mode:

- premature termination
- global coherence loss
- fragile cross-file dependency
- inadequate planning

### 의미

긴 작업의 어려움은 단순히 token window가 작기 때문만이 아니다.

**전체 상태를 지속적으로 일관되게 유지하는 문제**가 있다.

---

## 6. ChainSWE / SWE-CI와의 연결

장기 continuity는 session handoff만의 문제가 아니다.

코드 자체도 다음 session의 memory다.

ChainSWE와 SWE-CI는 이전 변경이 그대로 남은 저장소에서 다음 task를 수행한다.

따라서 durable handoff artifact가 좋아도:

- 코드 구조가 누적해서 나빠지고
- test가 stale하고
- architecture가 drift

하면 continuity 품질은 떨어진다.

즉 Recoverability는:

~~~text
Session State
+
Repository State
+
Verification State
~~~

세 가지가 함께 유지돼야 한다.

---

## 7. 좋은 Handoff Artifact의 조건

### 7.1 Source of Truth를 복제하지 않는다

나쁜 예:

~~~text
progress.md:
API는 /users/v2를 사용한다.

실제 코드:
API는 /users를 사용한다.
~~~

사람이 다시 정리해야 하는 duplicate prose는 drift한다.

좋은 artifact는 가능한 한 source에서 생성하거나 source로 링크한다.

### 7.2 완료 상태는 검증 가능해야 한다

~~~text
"로그인 구현 완료"
~~~

보다:

~~~text
AUTH-LOGIN-01 PASS
commit abc123
test auth-login
~~~

가 강하다.

### 7.3 미결정 상태를 완료 상태와 구분한다

다음 Agent가 추측하지 않게 한다.

- DONE
- TODO
- BLOCKED
- DECISION_REQUIRED
- FAILED_VERIFICATION

같이 구분한다.

### 7.4 다음 행동보다 현재 사실을 남긴다

> 다음에는 UserService를 고쳐라.

보다:

> USER-17 acceptance가 실패 중이며 root cause는 아직 미확정.

가 덜 위험하다.

---

## 8. Recoverability를 더 정확하게 정의한다

기존 정의:

> Agent session이 끊겨도 artifact를 통해 다음 Agent가 이어갈 수 있는가.

보정 후보:

> **새 Agent가 이전 Agent의 비공개 reasoning 없이 versioned repository state와 검증 가능한 durable artifact만으로 현재 상태·남은 일·중요 contract를 복원하고 안전하게 다음 변경을 시작할 수 있는가.**

---

## 9. Metric 후보

### Handoff Recovery Time

새 session이 첫 올바른 edit/test를 하기까지 시간.

### Redundant Exploration

이전 session에서 이미 확인한 사실을 다시 찾기 위해 수행한:

- files read
- searches
- commands

### State Reconstruction Accuracy

새 Agent가 현재:

- completed
- pending
- broken
- blocked

상태를 얼마나 정확히 복원하는지.

### Stale Handoff Rate

handoff artifact가 실제 code/test와 불일치하는 비율.

### Continuity Loss

session reset 전후:

- task success
- localization time
- unnecessary edits

변화.

---

## 10. Handoff artifact 후보

한 가지 파일로 모두 해결하지 않는다.

### Git history

무엇이 실제로 바뀌었는가.

### Task/feature ledger

어떤 requirement가 어떤 상태인가.

### Executable verification

무엇이 실제로 통과하는가.

### Decision record

코드만 보고 복원하기 어려운 장기 결정.

### Failure artifact

현재 실패 상태의 재현 명령과 최소 evidence.

### Generated project map

현재 module/API/test 구조를 빠르게 탐색하기 위한 index.

---

## 11. Runmesh 같은 multi-session orchestrator와의 연결

일반적인 multi-agent orchestration에서도 handoff payload에 자연어 summary만 넣으면:

- uncommitted state
- 실제 failure artifact
- verification result
- read dependency

가 빠질 수 있다.

Agentic Clean Code 관점에서는 handoff의 핵심을 conversation summary가 아니라 repository artifact로 옮기는 것이 더 안정적이다.

이 책에서는 특정 orchestrator 구현이 아니라 일반 원칙만 다룬다.

---

## 12. 후속 실험

### Experiment C1 — Fresh Session Recovery

같은 중간 상태의 repository를 새 Agent에게 준다.

조건:

A:
- git + generic README

B:
- git + task ledger + verification IDs + failure reproduction artifact

측정:

- first useful action time
- redundant reads
- wrong assumption
- regression
- completion rate

### Experiment C2 — Stale Handoff

의도적으로 prose progress file 하나를 outdated 상태로 둔다.

Agent가:

- prose를 그대로 믿는지
- executable state를 우선하는지

본다.

이 실험은 Context Trust와도 연결된다.

---

## 13. 현재 판단

장기 Agent 개발에서 가장 중요한 memory는 모델 내부 memory가 아닐 수 있다.

안정적인 방향은:

> **프로젝트 상태를 versioned, executable, inspectable artifact로 외부화하고 새 Agent가 그것을 다시 검증하면서 시작하게 하는 것.**

다만 모델이 발전할수록 필요한 scaffolding 양은 줄 수 있으므로, 특정 progress-file 포맷 자체를 원칙으로 만들지는 않는다.
