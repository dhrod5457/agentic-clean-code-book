# Worktree를 줄일 수 있는 Agent-Friendly Codebase

작성일: 2026-10-03  
상태: 리서치 메모. 결론 확정 아님.

## 1. 연구 질문

다중 세션 Coding Agent를 운영할 때 보통 Agent마다 Git worktree를 하나씩 준다.

이 방식은 단순하고 안전하다. 하지만 Agent 수가 많아질수록 다음 비용이 생긴다.

- checkout 수 증가
- dependency 설치 및 초기화 반복
- worktree 생성·정리 비용
- 각 worktree가 오래된 base 위에서 작업하는 stale state
- merge/rebase 횟수 증가
- integration 단계 집중

여기서 질문은 다음과 같다.

> 코드베이스가 충분히 Agent-friendly하다면 모든 Agent에게 worktree를 만드는 대신, 충돌 가능성이 있는 작업에만 선택적으로 worktree를 사용할 수 있는가?

현재 자료를 종합하면 답은 **"가능성이 높지만, 코드 구조만으로 Worktree를 없앨 수는 없다"** 쪽이다.

중요한 구분은 다음과 같다.

- **Code architecture**는 여러 작업이 같은 파일·모듈·계약을 건드릴 확률을 줄인다.
- **Worktree**는 실제 파일과 Git의 작업 상태를 서로 분리한다.
- **Hermetic execution**은 build/test가 서로의 임시 파일·캐시·환경을 오염시키는 것을 막는다.
- **Orchestrator**는 어떤 작업이 공유 workspace에서 안전한지 판단하고 위험한 작업만 격리한다.

즉 네 가지가 서로 다른 문제를 푼다.

---

## 2. Git Worktree가 실제로 격리하는 것

Git 공식 문서는 linked worktree가 repository의 많은 데이터를 공유하지만 `HEAD`, `index` 같은 항목은 worktree별로 가진다고 설명한다.

따라서 Worktree의 장점은 단순히 "폴더 하나를 더 만든다"가 아니다.

각 Agent가 별도 worktree를 사용하면 다음이 분리된다.

- checked-out files
- HEAD
- index
- branch working state

반대로 하나의 checkout을 여러 Agent가 그대로 공유하면 파일을 서로 다른 경로에서 수정하더라도 다음 동작은 공유 상태를 건드릴 수 있다.

- `git add`
- `git commit`
- `git checkout`
- `git reset`
- `git rebase`

따라서 **"서로 다른 파일을 고치니 같은 checkout에서 아무 Git 명령이나 동시에 실행해도 된다"** 는 결론은 성립하지 않는다.

### 해석

공유 workspace를 쓰려면 적어도 두 가지 모델 중 하나가 필요하다.

1. Agent는 source edit만 하고 Git write operation은 중앙 coordinator가 직렬화한다.
2. Agent마다 Git state 또는 filesystem overlay를 별도로 제공한다.

두 번째는 구현 방식이 다를 뿐 Worktree와 비슷한 격리 계층이 다시 등장한다.

### 출처

- Git, git-worktree documentation  
  https://git-scm.com/docs/git-worktree

---

## 3. 현재 Coding Agent 제품은 Worktree를 기본 안전장치로 본다

Claude Code 공식 문서는 parallel session을 별도 worktree에 두면 한 세션의 edit가 다른 세션의 파일을 건드리지 않는다고 설명한다.

또한 fresh checkout이므로 각 worktree에서 개발 환경을 초기화해야 한다고 명시한다.

이 자료에서 알 수 있는 것은 두 가지다.

첫째, **현재 범용 Coding Agent 환경에서는 Worktree가 가장 단순하고 강한 기본 격리 방식**이다.

둘째, Worktree에는 분명 운영 비용이 있다.

- fresh checkout 초기화
- dependency/setup
- gitignored file 전달
- lifecycle cleanup
- base branch synchronization

따라서 Worktree를 "나쁜 것"으로 볼 이유는 없지만, Agent 수와 짧은 Task 수가 급격히 늘면 모든 Task에 같은 격리 비용을 지불하는 것이 최선인지 따로 검증할 필요가 있다.

### 출처

- Claude Code, Run parallel sessions with worktrees  
  https://code.claude.com/docs/en/worktrees

---

## 4. 완전 격리만으로 병렬성이 생기지는 않는다

Anthropic의 2026년 C compiler 실험은 16개의 Claude Agent를 병렬로 운영했다.

이 실험은 shared checkout을 쓰지 않았다.

각 Agent마다:

- Docker container
- local clone
- 독립 workspace

를 제공하고, 완료 시 upstream으로 push하는 구조를 사용했다.

즉 filesystem isolation은 강했다.

그런데 Linux kernel compile 단계에서는 16개 Agent를 사용해도 효과가 줄었다. 모든 Agent가 동일한 하나의 큰 실패를 만나 같은 문제를 고치려 했기 때문이다.

Anthropic은 문제를 여러 파일의 독립적인 실패로 분해할 수 있는 verifier를 만든 뒤에야 여러 Agent가 서로 다른 문제를 병렬로 해결할 수 있었다.

### 중요한 해석

이 사례는 다음을 보여준다.

> Worktree/container는 **충돌을 격리**하지만, 작업 자체를 **병렬화 가능한 구조로 만들지는 않는다.**

병렬성은 오히려 다음에 더 직접적으로 좌우된다.

- Task가 서로 독립적인가
- 실패를 서로 다른 영역으로 나눌 수 있는가
- 한 Task가 다른 Task의 변경을 기다리지 않아도 되는가
- 여러 Task가 같은 중앙 파일을 수정하지 않는가

따라서 Agentic Clean Code에서 더 먼저 최적화해야 할 것은 Worktree 수가 아니라 **Independent Change Surface**다.

### 출처

- Anthropic, Building a C compiler with a team of parallel Claudes  
  https://www.anthropic.com/engineering/building-c-compiler

---

## 5. Worktree는 merge conflict를 없애지 않는다

2026년 `AI Agent Pull Requests on GitHub` 연구는 33,596개의 Agent 작성 PR과 2,807개 repository를 분석했다.

실제 three-way merge를 재현한 결과:

- 동일 Agent 계열의 concurrent PR pair textual conflict: 19.8%
- 서로 다른 Agent의 concurrent PR pair textual conflict: 41.7%
- conflict file 중 source code: 84.4%
- conflict 중 modify/delete 또는 add/add 같은 structural conflict: 약 42%

중요한 점은 이 연구가 **textual conflict만 측정했다**는 것이다.

build conflict와 semantic conflict는 포함하지 않았으므로 실제 integration friction은 더 클 수 있다.

### Agentic Clean Code 관점

Worktree는 개발 중 상대 Agent가 내 파일을 덮어쓰는 문제를 해결한다.

하지만 두 Agent가 결국 같은 파일 또는 같은 책임 영역을 변경했다면 merge 시점에 문제는 그대로 돌아온다.

따라서:

> **Worktree isolation과 Change isolation은 다른 개념이다.**

Worktree를 많이 쓰는 것만으로 높은 병렬성을 얻을 수 없고, 코드베이스가 independent changes를 지원해야 한다.

### 출처

- Xu, Subramanian, Karthik, *AI Agent Pull Requests on GitHub: Frequency, Structure, and Merge Conflict Rates*, 2026  
  https://arxiv.org/abs/2607.04697

---

## 6. Agent끼리 더 많이 대화하게 만드는 것도 충분하지 않다

CooperBench는 652개 collaborative coding task에서 두 Agent가 각자 독립적으로 구현 가능한 feature를 맡도록 했다.

그러나 협업 시 평균 성공률이 solo 대비 약 30% 낮았다.

연구는 communication이 conflict를 줄이는 경우가 있어도 전체 성공률을 충분히 회복하지 못한다고 보고한다.

이 결과는 중요한 방향을 제시한다.

> 병렬 Agent 시스템의 첫 번째 해법을 "Agent끼리 더 자주 대화시킨다"로 두면 안 된다.

더 안전한 순서는 다음에 가깝다.

1. 애초에 겹치지 않는 Change Domain으로 나눈다.
2. dependency와 contract를 기계적으로 드러낸다.
3. 실제 의존성이 있는 경우에만 coordination을 요구한다.

### 출처

- Khatua et al., *CooperBench: Why Coding Agents Cannot be Your Teammates Yet*, 2026  
  https://arxiv.org/abs/2601.13295
- Project page  
  https://cooperbench.com/

---

## 7. Shared Workspace 자체를 연구하는 흐름도 등장했다

2026년 AgentRoom은 별도 private workspace를 나중에 merge하는 방식 대신 CRDT 기반 shared workspace를 실험한다.

Agent가 사용하는 coordination primitive는 다음과 같다.

- file-level claim
- status
- broadcast
- CRDT-merged shared filesystem

논문의 초기 결과는 일부 조건에서 2-Agent 구성이 solo보다 task abandon을 줄이고 변동성을 낮추는 결과를 보고한다.

이 연구는 아직 Worktree를 대체할 일반 해법이라고 보기에는 이르다.

하지만 중요한 신호는 있다.

> "Agent마다 완전히 분리된 branch/worktree + 마지막 merge"만이 유일한 병렬 개발 모델은 아니다.

앞으로 비교해야 할 후보는 최소 세 가지다.

### Model A. Full Isolation

```
Agent
  → Worktree/Clone
  → Branch
  → Merge
```

### Model B. Shared Workspace + Ownership

```
Shared source
  ├─ Agent A owns domain A
  ├─ Agent B owns domain B
  └─ Git write is serialized
```

### Model C. Shared Base + Per-Agent Overlay

```
Read-only Base
  ├─ Agent A writable overlay
  ├─ Agent B writable overlay
  └─ Coordinator integrates deltas
```

Agentic Clean Code는 특정 모델 하나를 정답으로 고정하기보다, **어떤 코드 구조에서 어느 모델이 안전한지**를 실험해야 한다.

### 출처

- Cho, Lee, *AgentRoom: Concurrent Multi-Agent Coding in a CRDT-Backed Shared Workspace*, 2026  
  https://arxiv.org/abs/2608.23740

---

## 8. Shared Workspace가 가능하려면 build/test도 source tree를 오염시키지 않아야 한다

코드 파일만 겹치지 않는다고 공유 workspace가 안전해지는 것은 아니다.

두 Agent가 서로 다른 module을 수정해도 build/test 과정에서 다음을 공유하면 충돌할 수 있다.

- generated output
- temporary directories
- fixed ports
- local DB
- cache
- test fixtures
- runtime pid/state
- log path

Bazel의 hermetic build 문서는 build action이 선언된 input만 읽고 선언된 output만 만들어야 한다고 설명한다.

특히 build가 source tree에 output을 쓰는 경우 동일 source tree에서 다른 target을 build할 수 없게 될 수 있다고 명시한다.

이 원리는 Agent shared workspace에도 직접 연결된다.

### Agent-friendly 조건

공유 workspace를 늘리려면:

- source tree에 build output을 쓰지 않는다.
- task별 temp/output directory를 분리한다.
- port를 동적으로 할당한다.
- DB/schema fixture를 task별로 격리한다.
- cache가 correctness에 영향을 주지 않게 한다.
- test가 외부 mutable state에 의존하지 않는다.

즉 **Hermetic Verification은 Worktree Avoidability의 전제조건**이다.

### 출처

- Bazel, Hermeticity  
  https://bazel.build/basics/hermeticity

---

## 9. Dependency Graph는 Worktree 선택에도 사용할 수 있다

Nx의 `affected` 방식은 변경된 file을 project graph에 연결하고, 해당 변경에 의해 영향을 받는 최소 project set을 계산한다.

여기서 중요한 점은 특정 도구로 Nx를 쓰자는 것이 아니다.

아이디어를 Agent scheduler에 가져올 수 있다.

예:

```
Task A
changed/owned:
  attendance/**

affected:
  attendance-api
  attendance-domain

Task B
changed/owned:
  student-card/**

affected:
  student-card-api
  student-card-domain
```

affected graph가 겹치지 않고 exclusive runtime resource도 공유하지 않는다면 shared workspace 후보가 된다.

반대로:

```
Task C
touches:
  package-lock.json
  shared-schema/**
  root-config/**
```

처럼 graph 전체에 영향을 주는 변경이면 worktree 또는 serialized execution으로 올릴 수 있다.

Nx 문서도 global input이나 넓게 사용되는 shared project를 수정하면 affected set이 거의 전체 workspace로 커질 수 있다고 설명한다.

이것은 Agentic Clean Code의 **Hot File / Shared Modification Surface** 개념과 직접 연결된다.

### 출처

- Nx, Run Only Tasks Affected by a PR  
  https://nx.dev/docs/features/ci-features/affected
- Nx, Reduce the Number of Affected Projects  
  https://nx.dev/docs/kb/cipe-affected-project-graph

---

## 10. 제안하는 Hybrid Isolation Model

현재 근거를 바탕으로 가장 현실적인 가설은 다음과 같다.

> **Shared Workspace를 기본으로 강제하는 것도 아니고, Worktree를 항상 기본으로 강제하는 것도 아니다. Task의 충돌 가능성에 따라 isolation level을 선택한다.**

### Level 0. Read Only

분석, 검색, 문서 확인.

별도 Worktree 불필요.

### Level 1. Shared Edit

조건:

- write domain이 겹치지 않음
- generated output 격리
- runtime resource 격리
- Agent가 직접 Git state를 변경하지 않음
- 중앙 coordinator가 commit/staging 관리

Worktree 생략 후보.

### Level 2. Isolated Worktree

다음 중 하나면 승격:

- same-file 가능성
- shared contract 변경
- root config 변경
- dependency/lockfile 변경
- code generation
- broad formatter/refactor
- migration/schema 변경
- Git history operation 필요

### Level 3. Full Sandbox / Container

다음이 필요한 경우:

- dependency/runtime 자체 변경
- untrusted code execution
- destructive test
- OS/toolchain 차이
- 강한 security boundary

핵심은 isolation을 boolean으로 보지 않고 **필요한 만큼만 올리는 것**이다.

---

## 11. Scheduler가 계산해야 할 것

Task마다 최소한 다음 정보를 계산하거나 선언할 수 있어야 한다.

```text
write_scope
affected_modules
contracts_read
contracts_write
runtime_resources
generated_outputs
git_operations
risk_level
```

그리고 두 Task A/B에 대해:

```text
write_scope(A) ∩ write_scope(B)
affected_modules(A) ∩ affected_modules(B)
contracts_write(A) ∩ contracts_read/write(B)
runtime_resources(A) ∩ runtime_resources(B)
```

를 검사한다.

충돌이 없으면 shared execution 후보.

충돌이 있으면:

- serialize
- worktree
- container

중 하나로 승격한다.

이 방식이 가능하려면 코드베이스의 module boundary와 resource ownership이 기계가 읽을 수 있어야 한다.

즉 Agent-friendly architecture가 Worktree 수를 줄이는 방식은:

> "Agent가 알아서 안 부딪힐 것이다"가 아니라  
> **"어디까지 독립인지 기계가 판정할 수 있게 만드는 것"** 이다.

---

## 12. 새로 추가할 Metric 후보

### Worktree Avoidability Rate

```text
worktree 없이 안전하게 실행 가능한 edit task
/
전체 edit task
```

목표는 무조건 100%가 아니다.

높을수록 lightweight parallelism을 더 많이 사용할 수 있다는 신호로 본다.

### Isolation Escalation Rate

```text
shared 후보였지만 실행 전/중 worktree 이상으로 승격된 task
/
shared 후보 task
```

높으면 scope prediction이나 architecture boundary가 부정확할 수 있다.

### Shared Workspace Collision Rate

```text
shared workspace에서 충돌/오염이 발생한 task pair
/
shared workspace 병렬 task pair
```

### Independent Change Surface

Task pair가 동시에 수정 가능한 독립 영역의 크기.

후보 입력:

- disjoint write paths
- disjoint symbols
- disjoint bounded contexts
- disjoint generated outputs
- disjoint runtime resources

### Integration Repair Cost

병렬 작업 완료 후 integration을 위해 추가로 소비한:

- Agent turns
- files changed
- tokens
- test runs
- elapsed time

Worktree를 많이 사용하면 개발 중 interference는 줄어도 integration repair cost가 늘 수 있으므로 함께 측정해야 한다.

---

## 13. 실험 설계 제안

같은 Task set을 세 조건으로 비교한다.

### E1. Worktree per Task

모든 edit task에 별도 worktree.

현재의 안전한 baseline.

### E2. Shared Workspace Naive

모든 Agent가 같은 checkout 사용.

의도적으로 좋은 결과를 기대하는 조건이 아니라 shared-state failure를 측정하는 negative control.

### E3. Hybrid Isolation

- dependency/write graph로 사전 판정
- 안전 task는 shared
- 위험 task는 worktree
- Git write는 coordinator가 직렬화
- build/test output은 task-local

측정:

- task success
- textual conflict
- semantic conflict
- workspace corruption
- setup time
- integration repair time
- total wall clock
- token/tool call
- disk usage
- worktree count
- stale-base incidents

### 핵심 가설

```text
H1:
Agent-friendly codebase일수록 Hybrid Isolation에서
Worktree Avoidability Rate가 증가한다.

H2:
Worktree 수 감소가 성공률 저하 없이 가능하려면
change boundary + hermetic execution + centralized git operation이 함께 필요하다.

H3:
중앙 registry/hot file 비율이 높을수록
Hybrid Isolation은 빠르게 Worktree/serialization 쪽으로 승격된다.

H4:
모든 Task에 Worktree를 사용하는 전략은 development-time interference에는 강하지만,
Agent 수가 커질수록 stale-base와 integration repair cost가 병목이 될 수 있다.
```

H4는 아직 직접 실험으로 검증해야 한다.

---

## 14. 현재 단계 결론

현재 자료만으로 "Agent-friendly code를 만들면 Worktree가 필요 없다"고 결론 내리면 과장이다.

더 정확한 주장은 다음과 같다.

> **Agent-friendly code는 Worktree 자체를 없애는 것이 아니라, 강한 격리가 없어도 안전한 Task의 비율을 높인다.**

그리고 이 문장은 한 단계 더 구체적으로 바꿀 수 있다.

> **좋은 Agentic Codebase는 작업의 독립성을 기계가 판정할 수 있어서, 모든 Agent를 무조건 격리하지 않고 필요한 Task만 격리할 수 있다.**

따라서 책에서 Worktree는 "필수/불필요"의 문제가 아니라 **Isolation Cost를 어디까지 지불해야 하는가**의 문제로 다루는 것이 적절하다.

---

## 15. 책에 넣을 수 있는 쉬운 표현

> Worktree는 서로의 책상을 나눠 주는 방법이다.  
> 하지만 두 사람이 계속 같은 서류를 고쳐야 한다면 책상을 나눠도 마지막에는 부딪힌다.

Agentic Clean Code가 해야 할 일은 책상을 더 많이 만드는 데서 끝나지 않는다.

> **각 Agent가 애초에 서로 다른 일을 잡을 수 있도록 코드의 경계를 만드는 것.**

그렇게 되면 Worktree는 모든 작업의 기본 비용이 아니라, 충돌 위험이 있는 작업에 사용하는 안전장치가 될 수 있다.
