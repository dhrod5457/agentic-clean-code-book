# Shared Workspace vs Worktree — 더 깊은 리서치

작성일: 2026-10-03
상태: 리서치 메모. 결론 확정 아님.
연결 문서: 18-worktree-minimization.md

## 1. 이번 추가 조사의 핵심

앞선 리서치에서는 다음 가설을 세웠다.

> Agent-friendly codebase는 Worktree를 없애는 것이 아니라, Worktree 없이도 안전한 Task 비율을 높인다.

추가 조사 결과 이 가설은 유지할 수 있다. 다만 기준을 더 정확히 바꿔야 한다.

처음에는 주로 "두 Agent가 같은 파일을 쓰는가"를 중심으로 생각했다.

하지만 최근 multi-agent 연구를 보면 더 중요한 것은 다음이다.

> 한 Agent가 판단에 사용한 파일이 다른 Agent 때문에 바뀌었는가.

즉 병렬 안전성은 Write Set만으로 판단하기 어렵다.

새로운 핵심 개념은 다음 두 가지다.

- Change Surface: Agent가 실제 수정하는 범위
- Reasoning Dependency Surface: Agent가 판단을 위해 읽고 의존한 범위

두 Agent가 서로 다른 파일을 수정하더라도 같은 contract, schema, type, config를 읽었다면 한쪽 변경이 다른 Agent의 판단을 낡게 만들 수 있다.

따라서 "서로 다른 파일을 수정하니 안전하다"는 규칙은 충분하지 않다.

---

## 2. STORM: Worktree 대신 상태 일관성을 관리한다

2026년 Multi-agent Collaboration with State Management는 이 문제를 정면으로 다룬다.

기존 방식:

~~~text
Agent A → Worktree A
Agent B → Worktree B
Agent C → Worktree C
              ↓
            Merge
~~~

STORM 방식:

~~~text
             Shared Workspace
                    │
        ┌───────────┼───────────┐
      Agent A     Agent B     Agent C
        │            │            │
        └──── mediated read/write ┘
                    │
             State Manager
~~~

핵심은 모든 Agent를 격리하지 않고 파일 읽기와 쓰기를 중재하는 것이다.

### 2.1 Primary File Set은 겹치지 않게 시작한다

Manager가 Task를 분리할 때 Agent마다 primary file set을 준다.

논문에서는 이를 대략 다음처럼 모델링한다.

~~~text
F_A ∩ F_B = ∅
~~~

즉 기본적으로 다른 파일을 맡긴다.

하지만 실제 실행에서는 Agent가 자기 파일만 읽지 않는다.

예를 들어:

~~~text
Agent A
writes:
  attendance/service.ts

reads:
  shared/user.ts
  shared/permission.ts
  config/policy.ts
~~~

Agent B가 shared/permission.ts를 변경하면 Agent A는 자기 파일을 한 줄도 겹치지 않게 수정하고 있어도 stale context 위에서 작업하게 된다.

### 2.2 Read Snapshot이 중요하다

STORM은 Agent가 읽은 파일과 그 버전을 기록한다.

개념적으로:

~~~text
Agent A read set

user.ts          v10
permission.ts    v7
service.ts       v3
~~~

Agent가 write를 시도할 때 현재 버전과 비교한다.

permission.ts가 v7에서 v8로 바뀌었다면 A의 write를 거부한다.

A가 새 상태를 읽고 다시 판단하게 만든다.

### 2.3 이 방식은 Optimistic Concurrency Control과 닮아 있다

STORM도 직접 optimistic concurrency control에서 영감을 받았다고 설명한다.

원리는 단순하다.

- 충돌이 드물 것이라고 가정하고 일단 병렬 실행
- write 시점에 읽었던 상태가 여전히 유효한지 검사
- stale이면 write를 거부하고 다시 실행

이것은 Worktree 방식과 철학적으로 다르다.

Worktree:

> 서로 못 보게 먼저 분리한다.

STORM:

> 같이 보게 하되, 낡은 판단으로 쓰지 못하게 한다.

### 2.4 결과

Commit0-Lite에서 Claude Sonnet 4.6 기준:

- Single Agent weighted score: 20.7
- GitWorktree multi-agent: 24.6
- STORM: 46.2

macro score:

- Single Agent: 66.4
- GitWorktree: 63.8
- STORM: 82.5

PaperBench에서도 STORM이 GitWorktree baseline을 앞섰다.

논문 전체 요약 기준으로 STORM은 GitWorktree 방식보다:

- Commit0-Lite: +18.7
- PaperBench: +1.4

를 보고했다.

### 2.5 특히 중요한 구현 세부사항

STORM에서는 Engineer Agent가 직접 commit하지 않는다.

Manager가:

- repository 분석
- task 분해
- engineer 실행
- diff 검토
- test
- commit

을 담당한다.

이것은 앞선 18-worktree-minimization.md에서 제안했던 "Shared Workspace에서는 Git write operation을 중앙 coordinator가 담당한다"는 가설과 거의 일치한다.

### 출처

- Liu et al., Multi-agent Collaboration with State Management, 2026
  https://arxiv.org/abs/2605.20563

---

## 3. 하지만 Worktree 방식이 틀렸다는 뜻은 아니다

같은 2026년에 나온 CAID 연구는 거의 반대 방향의 결과를 보여준다.

CAID는 Centralized Asynchronous Isolated Delegation의 약자다.

구조는 다음과 같다.

~~~text
          Central Manager
                │
       dependency-aware plan
                │
     ┌──────────┼──────────┐
 Worktree A  Worktree B  Worktree C
     │           │           │
     └──────── branch ────────┘
                │
           integration
                │
              tests
~~~

CAID는 다음을 결합한다.

- 중앙 task decomposition
- 비동기 실행
- isolated workspace
- branch-and-merge
- executable verification

2026년 7월 수정본 기준 연구는 single-agent 대비:

- PaperBench: +25.6%p
- Commit0: +14.7%p

의 absolute improvement를 보고한다.

연구진은 git worktree, git commit, git merge 같은 기존 SWE primitive를 신뢰 가능한 multi-agent coordination의 핵심으로 평가한다.

### 해석

STORM과 CAID를 함께 읽으면 다음 결론이 더 타당하다.

> Worktree 자체가 문제도 아니고 Shared Workspace 자체가 답도 아니다.

실패하는 것은 대체로 다음이다.

- 잘못된 task decomposition
- 숨은 dependency
- 늦은 conflict 발견
- 불명확한 integration contract
- 약한 verification

즉 isolation strategy보다 위에 있는 orchestration 구조가 중요하다.

### 출처

- Geng, Neubig, Effective Strategies for Asynchronous Software Engineering Agents, 2026
  https://arxiv.org/abs/2603.21489

---

## 4. 기존 소프트웨어공학에서도 Modularity와 Conflict는 직접 연결돼 있었다

Agent 시대 이전 연구도 이 주장을 강하게 뒷받침한다.

2020년 Understanding predictive factors for merge conflicts는:

- 100 Ruby MVC project
- 25 Python MVC project
- 총 73,504 merge scenario

를 분석했다.

변경들이 동일한 application slice에 걸쳐 얽혀 있어 modular하지 않을 때 merge conflict 발생 가능성이:

- Ruby 표본: 6.13배
- Python 표본: 4.39배

높아졌다.

또한 다음이 커질수록 conflict 가능성이 증가했다.

- developers
- commits
- changed files
- contribution duration

### Agentic Clean Code 관점

이 결과는 중요한 연결고리다.

~~~text
Task Surface ↓
Changed Files ↓
Cross-domain Change ↓
Hot Files ↓
~~~

가 되면 단순히 Agent가 읽기 편한 정도를 넘어 실제 병렬 변경 충돌 확률 자체를 줄일 가능성이 있다.

즉 Agentic Clean Code의 "작은 Change Surface"는 새로 만든 유행어가 아니라 기존 merge conflict 실증 연구와 이어진다.

### 출처

- Dias, Borba, Barreto, Understanding predictive factors for merge conflicts, Information and Software Technology, 2020
  https://doi.org/10.1016/j.infsof.2020.106256

---

## 5. Agent PR의 Conflict는 실제로 드물지 않다

AgenticFlict는 2026년 대규모 dataset이다.

규모:

- Agentic PR: 142,652
- repositories: 59,412
- deterministic merge simulation 성공: 107,026
- conflict PR: 29,609
- conflict regions: 336,380

전체 simulated PR 중 textual conflict rate:

~~~text
27.67%
~~~

충돌이 발생한 PR 기준:

- 평균 conflict files: 4.36
- median conflict files: 2
- 평균 conflict regions: 11.36
- 평균 conflict-marker 내부 lines: 540.42

즉 충돌이 생기면 단순히 한두 줄에서 끝나는 경우만 있는 것이 아니다.

### 주의

이 dataset은 일반적인 모든 Agent 병렬 실행을 직접 측정한 것은 아니다.

또한 textual merge conflict 중심이다.

따라서 semantic conflict, build conflict, runtime conflict까지 포함하면 integration 문제는 더 넓다.

### 출처

- Ogenrwot, Businge, AgenticFlict, AIware 2026
  https://arxiv.org/abs/2604.03551

---

## 6. GitButler는 이미 "Agent마다 Worktree"가 아닌 모델을 제품으로 구현하고 있다

GitButler의 2026년 Agent 문서는 여러 Coding Agent가 하나의 working directory에서 각각 다른 branch를 사용하는 use case를 지원한다.

Vanilla Git:

~~~text
Agent A → Worktree A → Branch A
Agent B → Worktree B → Branch B
~~~

GitButler:

~~~text
             One Working Directory
                    │
       ┌────────────┼────────────┐
   Branch A      Branch B      Branch C
   Agent A       Agent B       Agent C
~~~

GitButler는 여러 parallel branch를 동시에 workspace에 적용한다.

각 branch는 별도의 staging 영역을 갖는 형태로 표현되고, file 또는 hunk 단위 change를 특정 branch에 commit할 수 있다.

### 중요한 경고도 공식 문서에 적혀 있다

공유되는 것:

- filesystem
- dependency install
- generated files
- app/runtime state

따라서 GitButler도 다음 경우에는 Worktree를 권한다.

- incompatible checkout state
- isolated runtime 필요
- 같은 Task의 competing attempt
- 서로 같은 file/generated output을 수정

즉 GitButler 사례 역시 "독립 Task라면 Shared Workspace가 가능하지만 runtime isolation까지 자동으로 해결되는 것은 아니다"라는 Hybrid 모델을 지지한다.

### 출처

- GitButler, Parallel agents
  https://docs.gitbutler.com/ai-agents/parallel-agents
- GitButler, Parallel Branches
  https://docs.gitbutler.com/features/branch-management/virtual-branches

---

## 7. GitButler의 Agent benchmark는 무엇을 말하고 무엇을 말하지 않는가

GitButler는 vcbench.dev에서 plain Git, Jujutsu, GitButler를 Coding Agent에게 사용시켜 version-control task를 비교한다.

2026-07-20 공개 결과:

- 360 canonical runs
- 359/360 pass
- GitButler 120/120 pass
- plain Git 120/120 pass
- Jujutsu 119/120 pass

GitButler는 plain Git보다 평균적으로:

- 약 65% wall time 감소
- 약 78% version-control command 감소

를 보고한다.

### 하지만 이 결과를 과장하면 안 된다

이 benchmark는:

- GitButler가 직접 관리
- coding implementation benchmark가 아님
- multi-agent shared-edit conflict benchmark가 아님
- 이미 존재하는 file changes를 올바른 version-control state로 만드는 시험

이다.

따라서 이 자료로 "GitButler shared workspace가 Worktree보다 안전하다"고 주장할 수는 없다.

반면 다음은 충분히 연구 가치가 있다.

> Agent가 사용하는 Version Control interface가 단순해지면 tool call과 상태 조작 비용이 크게 줄어들 수 있다.

Agentic Clean Code는 source code만이 아니라 Agent-facing VCS interface까지 개발 시스템의 일부로 봐야 한다는 근거다.

### 출처

- VCBench
  https://vcbench.dev/
- Source repository
  https://github.com/gitbutlerapp/version-control-bench

---

## 8. Vanilla Git에서도 Index를 따로 둘 수는 있다

Git에는 GIT_INDEX_FILE 환경변수가 있다.

이를 이용하면 process마다 다른 index file을 사용할 수 있다.

또한 git read-tree는 temporary index를 사용해 tree operation을 수행하는 저수준 기능을 제공한다.

따라서 이론적으로:

~~~text
Agent A → index-A
Agent B → index-B
Agent C → index-C
~~~

처럼 staging state를 분리할 수 있다.

하지만 이것만으로 Shared Workspace가 안전해지지는 않는다.

Working Directory는 여전히 하나이기 때문이다.

Agent A와 B가 동시에 실제 file content를 수정하면 alternate index는 이를 막지 못한다.

### 의미

Git의 index 문제와 filesystem 문제를 분리해서 생각해야 한다.

Shared Workspace 설계에는 최소 세 층이 있다.

~~~text
1. Source File State
2. Version Control State
3. Runtime / Build State
~~~

세 층을 각각 어떻게 격리하거나 중재할지 결정해야 한다.

### 출처

- Git documentation — GIT_INDEX_FILE
  https://git-scm.com/docs/git
- Git read-tree
  https://git-scm.com/docs/git-read-tree

---

## 9. Jujutsu는 "동시 변경 자체를 정상 상태로 본다"

Jujutsu의 concurrency design도 Agent 환경에서 참고할 가치가 있다.

일반적인 VCS는 local mutation을 lock으로 직렬화하는 경우가 많다.

Jujutsu는 다른 방향을 택한다.

각 operation이 시작될 때 repository view를 읽고, 실행 도중 다른 process가 바꾼 상태는 보지 않는다.

동시에 여러 operation이 끝나면 operation log가 갈라지고 다음 operation이 divergent state를 merge한다.

즉 local concurrency를 예외가 아니라 정상적인 distributed state divergence로 다룬다.

Jujutsu는 conflict도 first-class state로 보관할 수 있다.

rebase 중 conflict가 생겨도 전체 operation을 중단하지 않고 conflict state 자체를 commit graph에 유지할 수 있다.

### 주의

Jujutsu 문서도 Git backend와 colocated repository의 일부 concurrent scenario에는 알려진 문제와 충분히 검증되지 않은 영역이 있다고 경고한다.

따라서 Jujutsu를 바로 해결책으로 채택하자는 뜻은 아니다.

### 출처

- Jujutsu, Concurrency
  https://jj-vcs.github.io/jj/latest/technical/concurrency/
- Jujutsu, First-class Conflicts
  https://jj-vcs.github.io/jj/latest/conflicts/

---

## 10. Build Runtime은 Worktree와 독립적으로 격리할 수 있다

Buck2의 Isolation Directory는 하나의 project source tree 안에서도 여러 daemon/build environment를 분리할 수 있다.

각 isolation directory는 artifacts, cache, daemon state를 분리한다.

예:

~~~text
same source root

Agent A build → buck-out/agent-a
Agent B test  → buck-out/agent-b
Agent C lsp   → buck-out/agent-c
~~~

이 사례가 중요한 이유는 Source checkout isolation과 Build isolation을 같은 단위로 묶을 필요가 없기 때문이다.

기존 Worktree-per-Agent는 편해서 source, Git state, build output, runtime을 한 번에 분리한다.

하지만 미래의 Hybrid 모델에서는 각각 독립적으로 선택할 수 있다.

예:

~~~text
Source: shared
Git commit: centralized
Build output: per-task
Runtime port: per-task
DB: per-task
~~~

이 경우 Worktree 없이도 많은 종류의 충돌을 제거할 수 있다.

### 출처

- Buck2, Isolation Directory
  https://buck2.build/docs/concepts/isolation_dir/

---

## 11. 반대로 Worktree 자체의 비용도 과장하면 안 된다

Git Worktree는 full clone과 다르다.

Git 공식 문서상 linked worktree는 repository data 대부분을 공유하고 HEAD, index, 일부 per-worktree ref/config 같은 상태만 별도로 가진다.

즉 "100 Worktrees = 100 Full Git Repositories"는 아니다.

또한 sparse-checkout은 worktree별로 설정할 수 있다.

Agent가 담당하는 module만 checkout한다면 큰 monorepo에서 source footprint를 줄일 수 있다.

### 연구 의미

Worktree 최소화에는 두 전략이 있다.

### 전략 A — Worktree 수 자체를 줄인다

Shared Workspace / STORM / GitButler 방식.

### 전략 B — Worktree를 싸게 만든다

- shared Git object store
- sparse checkout
- shared dependency/cache
- remote build cache
- task-local build output

실험에서는 두 전략을 반드시 비교해야 한다.

그렇지 않으면 "Worktree 비용"을 과장한 잘못된 결론이 나올 수 있다.

### 출처

- Git Worktree
  https://git-scm.com/docs/git-worktree
- Git Sparse Checkout
  https://git-scm.com/docs/sparse-checkout

---

## 12. Optimistic vs Pessimistic Concurrency로 다시 보면 구조가 명확해진다

Database concurrency control의 오래된 구분을 그대로 가져오면 이해가 쉽다.

### Pessimistic

충돌할 수 있다고 보고 먼저 막는다.

Coding Agent에서는 Worktree, File Lock, Exclusive Change Domain, Serialized Task와 가깝다.

### Optimistic

대부분 충돌하지 않을 것이라고 보고 먼저 실행한다.

충돌이 실제로 발생할 때 감지하고 재시도한다.

Coding Agent에서는 Shared Workspace, Versioned Read Set, Write Validation, Retry와 가깝다.

1980년대 optimistic concurrency 연구부터 "conflict가 드물다"는 가정이 중요한 조건이었다.

따라서 Agentic Codebase에서 low-coupling / low-hotspot 구조를 만드는 것은 단순한 코드 품질 문제가 아니다.

> Optimistic multi-agent execution이 실제로 경제적인 조건을 만드는 일이다.

### 출처

- Kung, Robinson, On Optimistic Methods for Concurrency Control, ACM TODS, 1981
  DOI: 10.1145/319566.319567
- Observations on optimistic concurrency control schemes, 1984
  https://doi.org/10.1016/0306-4379(84)90020-6

---

## 13. 새롭게 추가해야 할 Metric

### 13.1 Reasoning Dependency Surface

Agent가 한 변경을 만들기 위해 실제 판단 근거로 읽은 file/module/symbol 범위.

~~~text
RDS(task) =
unique files/modules used as reasoning context
~~~

Files Changed보다 이 값이 병렬 안전성을 더 잘 설명할 수 있는지 검증한다.

### 13.2 Cross-Agent Read/Write Overlap

~~~text
readSet(A) ∩ writeSet(B)
~~~

이 값이 크면 서로 다른 파일을 수정해도 stale reasoning 위험이 높다.

### 13.3 Stale Context Rejection Rate

STORM류 시스템에서:

~~~text
stale state 때문에 거부된 write
/
전체 write
~~~

높은 repository 영역은 병렬 shared execution에 적합하지 않을 가능성이 있다.

### 13.4 Boundary Contention

특정 contract/schema/module이 동시에 몇 개 Task의 read/write boundary가 되는지 측정한다.

예:

~~~text
permission-schema.ts
readers: 12
writers: 3
~~~

이 파일은 단순 Hot File보다 더 위험하다.

많이 수정되지 않더라도 많은 Agent reasoning이 의존하면 병렬 병목이다.

### 13.5 Isolation Decision Accuracy

Scheduler가 shared, worktree, container, serialized 중 하나를 선택했을 때 실제로 적절했는지 측정한다.

False Safe:

~~~text
shared로 배정했지만 conflict 발생
~~~

False Isolation:

~~~text
worktree로 격리했지만 실제로는 shared가 안전했음
~~~

두 오류를 분리한다.

---

## 14. Hybrid Isolation은 Task 시작 전에만 결정하면 안 된다

앞선 문서에서는 Task 시작 시 isolation level을 정하는 모델을 제안했다.

추가 자료를 보면 이것도 수정하는 것이 좋다.

~~~text
Task
 ↓
Initial Isolation
 ↓
Observe Read/Write Set
 ↓
Contention Changes?
 ├─ No  → Continue
 └─ Yes → Escalate / Retry / Serialize
~~~

즉 isolation은 정적 설정이 아니라 runtime adaptive policy가 될 수 있다.

---

## 15. Agentic Clean Code에 새로 보이는 핵심 원칙

추가 조사 전에는 "서로 다른 Task가 서로 다른 파일을 수정하게 만들자" 정도로 설명할 수 있었다.

지금은 더 정확하게 다음처럼 말할 수 있다.

> 서로 다른 Task가 서로의 판단 근거를 자주 무효화하지 않게 만들어라.

이를 코드 수준으로 바꾸면:

- shared contract 수를 줄인다.
- global config dependency를 줄인다.
- module-local type을 우선한다.
- central registry를 줄인다.
- broad barrel export 의존을 줄인다.
- generated global artifact를 줄인다.
- 한 module 변경이 전체 dependency graph를 invalidate하지 않게 한다.
- Task가 읽어야 하는 cross-domain context를 줄인다.

이것은 단순한 low coupling보다 Agent 실행 관점에서 더 직접적인 설명이다.

---

## 16. 현재까지의 결론

이번 조사로 가장 중요한 판단은 세 가지다.

첫째, Worktree는 여전히 매우 좋은 baseline이다. CAID와 현재 Coding Agent 도구들이 이를 보여준다.

둘째, Worktree가 유일한 안전한 모델은 아니다. STORM, AgentRoom, GitButler은 각각 다른 방식으로 shared state를 관리하고 있다.

셋째, Agent-friendly codebase가 Worktree를 줄이는 진짜 이유는 파일이 작아서가 아니라 동시 Task 사이의 Read/Write Dependency가 적기 때문이다.

따라서 다음 실험에서는 단순한 same-file collision보다 Write/Write overlap, Read/Write overlap, contract invalidation, runtime resource overlap, integration repair cost를 같이 측정해야 한다.

---

## 17. 다음 실험 모델 수정안

기존 3개 조건에서 5개로 늘리는 것이 좋다.

### E1. Full Worktree

- Agent별 Worktree
- Agent별 Git branch
- Agent별 runtime

Baseline.

### E2. Cheap Worktree

- Worktree
- sparse-checkout
- shared dependency/cache
- isolated output

Worktree overhead를 최적화한 baseline.

### E3. Naive Shared Workspace

- 같은 checkout
- 별도 state manager 없음

Negative control.

### E4. Shared Workspace + Central Git

- disjoint write scope
- 중앙 commit
- build/runtime state 분리

코드 구조 효과를 본다.

### E5. Optimistic Shared State

- read/write version tracking
- stale-write rejection
- central commit
- task-local runtime
- contention 발생 시 isolation escalation

STORM에 가까운 모델.

### 비교 Metric

- success rate
- wall time
- tool calls
- worktree count
- changed files
- files read
- Read/Write overlap
- stale rejection
- textual conflict
- build conflict
- semantic conflict
- integration repair cost
- disk footprint
- environment bootstrap cost

이렇게 해야 "Worktree를 줄일 수 있는가"를 의견이 아니라 실험 결과로 답할 수 있다.
