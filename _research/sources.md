# Research Sources

작성일: 2026-10-03

가능하면 1차 자료, 공식 engineering report, 논문을 우선한다. 벤더 사례는 실전 근거로 사용하되 일반화에는 주의한다.

## A. Agent-first / Harness Engineering

### A1. OpenAI — Harness engineering: leveraging Codex in an agent-first world

- URL: https://openai.com/index/harness-engineering/
- Date: 2026-02-11
- Type: 실전 engineering case
- 핵심:
  - agent legibility
  - repository knowledge를 system of record로 운영
  - giant AGENTS.md 대신 짧은 map + structured docs
  - worktree별 isolated application/observability
  - architecture invariant를 custom lint/structural test로 강제
  - structured logging, naming, file size 등도 lint로 enforce
  - recurring cleanup agent로 entropy 관리
- 책에서의 용도:
  - Agentic Clean Code의 가장 직접적인 산업 사례
- 주의:
  - OpenAI 내부 greenfield 프로젝트 한 사례이므로 보편 법칙처럼 사용하지 않는다.

### A2. Anthropic — Building a C compiler with a team of parallel Claudes

- URL: https://www.anthropic.com/engineering/building-c-compiler
- Date: 2026-02-05
- Type: 실전/연구 prototype
- 핵심:
  - 16 Agents, 약 2,000 Claude Code sessions
  - Agent마다 container + local clone
  - merge conflict 빈번
  - independent failure가 있을 때 parallelism이 잘 작동
  - 단일 거대 병목에서는 여러 Agent가 같은 bug를 수정하며 이점 감소
  - verifier quality가 autonomous progress에 결정적
  - test output은 짧고 grep 가능해야 함
  - fast deterministic test path가 중요
- 책에서의 용도:
  - Parallel Safety
  - Agent-oriented verifier
  - context-efficient diagnostics

### A3. Anthropic — Effective harnesses for long-running agents

- URL: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Date: 2025-11-26
- 핵심:
  - context window를 넘는 장기 작업
  - session 간 continuity artifact
  - initializer/coding agent 분리
- 책에서의 용도:
  - Recoverability
  - durable repository state

### A4. Anthropic — Harness design for long-running application development

- URL: https://www.anthropic.com/engineering/harness-design-long-running-apps
- Date: 2026-03-24
- 핵심:
  - frontier coding 성능에서 harness design의 영향
  - frontend quality와 long-running autonomy
- 책에서의 용도:
  - source code 외 feedback environment의 중요성

### A5. Anthropic — How we built our multi-agent research system

- URL: https://www.anthropic.com/engineering/multi-agent-research-system
- Date: 2025-06-13
- 핵심:
  - multi-agent는 parallelizable breadth task에 강함
  - dependency가 강하고 context 공유가 필요한 task는 불리함
  - artifact 기반 handoff
  - observability와 evaluation 중요
- 책에서의 용도:
  - coding 외 multi-agent 시스템에서 확인되는 task decomposition 원리
- 주의:
  - research workload 결과를 coding에 그대로 일반화하지 않는다.

### A6. Anthropic — Scaling Managed Agents: Decoupling the brain from the hands

- URL: https://www.anthropic.com/engineering/managed-agents
- Date: 2026-04-08
- 핵심:
  - model capability가 바뀌면 harness assumption이 빠르게 낡을 수 있음
- 책에서의 용도:
  - Agentic Clean 원칙을 특정 모델 limitation에 과적합하면 안 된다는 반론

## B. Repository-level Coding Research

### B1. SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering

- URL: https://arxiv.org/abs/2405.15793
- 핵심:
  - Agent Computer Interface 설계가 repository navigation/edit/test 성능에 큰 영향
- 책에서의 용도:
  - 개발 도구 interface도 코드 품질의 일부라는 근거

### B2. SWE-bench: Can Language Models Resolve Real-World GitHub Issues?

- URL: https://arxiv.org/abs/2310.06770
- 핵심:
  - 실제 issue 해결은 여러 file/function/class를 함께 이해해야 함
  - repository-level task의 난이도
- 책에서의 용도:
  - single-function generation과 real software maintenance의 차이

### B3. RepoBench: Benchmarking Repository-Level Code Auto-Completion Systems

- URL: https://arxiv.org/abs/2306.03091
- 핵심:
  - cross-file retrieval을 별도 능력으로 평가
  - Java/Python repository-level context
- 책에서의 용도:
  - localization/discoverability의 독립된 중요성

### B4. CodePlan: Repository-level Coding using LLMs and Planning

- URL: https://arxiv.org/abs/2309.12499
- 핵심:
  - repository-wide change를 planning, dependency analysis, may-impact analysis로 처리
- 책에서의 용도:
  - blast radius / impact graph

### B5. FastContext: Training Efficient Repository Explorer for Coding Agents

- URL: https://arxiv.org/abs/2606.14066
- Date: 2026
- 핵심:
  - repository exploration 자체가 token/context 병목
  - exploration을 별도 subagent로 분리
  - 일부 benchmark에서 token 사용을 크게 줄이면서 성능 개선
- 책에서의 용도:
  - Context Efficiency
  - Explore/Solve separation

### B6. What Context Does a Coding Agent Actually Need to Act?

- URL: https://arxiv.org/abs/2607.09691
- Date: 2026
- 핵심:
  - edit 시점의 source representation이 중요
  - 무조건 많은 주변 context가 좋은 것은 아님
  - compressed context가 전체 파일보다 효율적일 수 있음
- 책에서의 용도:
  - context locality
- 주의:
  - localization을 oracle로 고정한 실험이므로 "탐색 단계"와 분리해서 읽어야 함.

### B7. Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?

- URL: https://arxiv.org/abs/2602.11988
- Date: 2026
- 핵심:
  - context file이 항상 성능을 높이지 않음
  - 불필요한 instruction은 성공률 저하와 비용 증가 가능
  - 최소 요구사항 권고
- 책에서의 용도:
  - Minimal Sufficient Context
  - Instruction Debt

### B8. SWE Context Bench

- URL: https://arxiv.org/abs/2602.08316
- Date: 2026
- 핵심:
  - 관련 경험을 올바르게 선택한 요약은 정확도/시간/비용을 개선
  - 잘못 선택되거나 unfiltered context는 효과가 낮거나 부정적
- 책에서의 용도:
  - Agent memory/retrieval quality

### B9. Self-Evolving Coding Agents

- URL: https://arxiv.org/abs/2608.03392
- Date: 2026
- Type: survey
- 핵심:
  - executable feedback, repository context, trajectories를 이용한 agent self-evolution
  - feedback reliability, maintainability, benchmark overfitting 문제
- 책에서의 용도:
  - repository feedback loop가 장기적으로 Agent behavior를 형성한다는 관점

## C. Real-world Quality / Productivity

### C1. METR — Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity

- URL: https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
- 핵심:
  - 16명의 숙련 OSS 개발자, 246 task
  - 해당 조건에서 AI 허용 시 평균 완료 시간이 19% 증가
- 책에서의 용도:
  - AI code generation capability와 실제 engineering productivity를 구분
- 주의:
  - early-2025 tools, 숙련자/성숙 OSS라는 좁은 population
  - 2026년 이후 도구에 직접 일반화 금지

### C2. METR — Many SWE-bench-Passing PRs Would Not Be Merged into Main

- URL: https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/
- 핵심:
  - automated grader 통과와 maintainer merge decision 사이 격차
  - code quality, repo standard, broader breakage 문제가 포함됨
- 책에서의 용도:
  - test-passing != production-quality
- 주의:
  - 연구 노트이며 제한된 repo/maintainer sample

### C3. DORA — State of AI-assisted Software Development 2025

- URL: https://dora.dev/research/2025/dora-report/
- 핵심:
  - AI는 조직의 강점과 약점을 증폭하는 amplifier
  - foundational software delivery capability 중요
- 책에서의 용도:
  - 코드 생성보다 시스템 품질이 Agent 효과를 결정한다는 조직 차원의 근거

### C4. DORA — Balancing AI tensions

- URL: https://dora.dev/insights/balancing-ai-tensions/
- Date: 2026-03-10
- 핵심:
  - 생성 속도 향상 후 auditing/verification으로 시간이 이동할 수 있음
  - throughput과 instability의 tension
- 책에서의 용도:
  - verification cost가 새로운 병목이라는 관점

## D. Classic Software Design Foundations

### D1. David Parnas — On the Criteria To Be Used in Decomposing Systems into Modules

- DOI: https://doi.org/10.1145/361598.361623
- Date: 1972
- 핵심:
  - modularization은 flexibility/comprehensibility/development time과 관련
  - 중요한 것은 단순히 module을 만드는 것이 아니라 decomposition criterion
- 책에서의 용도:
  - Agentic modularity가 완전히 새로운 발명이 아니라 기존 information hiding의 새로운 압력이라는 연결점

## E. Mechanical Architecture / Reproducibility

### E1. ArchUnit User Guide

- URL: https://www.archunit.org/userguide/html/000_Index.html
- 핵심:
  - package/class dependency
  - layer constraint
  - cycle checks
- 책에서의 용도:
  - Architecture as Executable Rule

### E2. Nx — Enforce Module Boundaries

- URL: https://nx.dev/docs/features/enforce-module-boundaries
- 핵심:
  - project graph와 tag 기반 dependency constraint
- 책에서의 용도:
  - large workspace에서 boundary를 문서가 아닌 도구로 강제

### E3. Bazel — Hermeticity

- URL: https://bazel.build/versions/8.5.0/basics/hermeticity
- 핵심:
  - 같은 source/configuration → 같은 output
  - host dependency isolation
  - reproducibility, parallel execution
- 책에서의 용도:
  - Agent-friendly reproducible environment

## F. UI Reproducibility

### F1. Storybook — Visual testing

- URL: https://storybook.js.org/tutorials/ui-testing-handbook/react/en/visual-testing
- 핵심:
  - component isolation
  - state를 props/mock data로 재현
  - machine diff 기반 regression
- 책에서의 용도:
  - UI state as code

### F2. Storybook — UI testing docs

- URL: https://storybook.js.org/docs/8/writing-tests
- 핵심:
  - clean-room component environment
  - component/visual/accessibility/snapshot/E2E test
- 책에서의 용도:
  - browser navigation 없이 상태 검증

### F3. Playwright — Visual comparisons

- URL: https://playwright.dev/docs/test-snapshots
- 핵심:
  - screenshot baseline comparison
  - OS/browser/settings 차이에 따른 rendering variance
- 책에서의 용도:
  - visual verification + deterministic environment 필요성

## G. Repository Instructions — 산업 자료

### G1. OpenAI — Introducing Codex

- URL: https://openai.com/index/introducing-codex/
- 핵심:
  - AGENTS.md에 repository navigation/test/practice 제공
  - configured environment와 reliable test 중요

### G2. GitHub — path-specific custom instructions

- URL: https://github.blog/changelog/2025-07-23-github-copilot-coding-agent-now-supports-instructions-md-custom-instructions/
- 핵심:
  - directory/file scope별 instruction
- 책에서의 용도:
  - instruction locality

### G3. GitHub — AGENTS.md support

- URL: https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/
- 핵심:
  - root 및 nested AGENTS.md
- 책에서의 용도:
  - ecosystem convergence
- 주의:
  - B7의 empirical result와 함께 제시해 vendor recommendation과 evidence를 분리한다.

## 다음 수집 우선순위

1. Clean Code / Refactoring / SOLID 원전의 실제 목표 재검토
2. architecture fitness functions
3. build/test selection과 affected graph 연구
4. merge conflict prediction / socio-technical congruence 연구
5. change coupling / logical coupling 연구
6. flaky test가 autonomous agent에 미치는 영향
7. structured error / observability가 automated debugging에 미치는 연구
8. frontend coding agent의 visual feedback 연구
9. secure sandbox / least privilege / supply-chain risk
10. AI-generated code의 duplication, maintainability, architecture drift 실증 연구


## H. Classic Design / Change Coupling / Fitness Functions

### H1. Robert C. Martin — Clean Code, 1st / 2nd edition

- URL:
  - https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship/P200000009044
  - https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship-2nd-edition/P200000013239
- 핵심:
  - searchable names
  - small functions/classes
  - side-effect reduction
  - clean boundaries
  - tests
  - organizing for change
- 책에서의 용도:
  - Agentic Clean Code가 무엇을 계승하고 어디서 범위를 확장하는지 비교 기준

### H2. Martin Fowler — Definition of Refactoring / Refactoring

- URL:
  - https://martinfowler.com/bliki/DefinitionOfRefactoring.html
  - https://martinfowler.com/books/refactoring.html
- 핵심:
  - observable behavior를 유지하면서 이해 가능성과 변경 용이성을 높임
- 책에서의 용도:
  - Agentic Refactoring = 다음 Agent의 탐색·context·변경 비용 감소로 확장

### H3. Thoughtworks — Architectural Fitness Function

- URL: https://www.thoughtworks.com/en-us/radar/techniques/architectural-fitness-function
- 핵심:
  - architecture characteristic를 metrics/tests/monitor 등으로 객관적으로 검증
- 책에서의 용도:
  - Agentic rule을 prose가 아니라 executable rule로 만드는 선행 개념

### H4. Co-change patterns: A large scale empirical study

- URL: https://doi.org/10.1016/j.jss.2019.03.014
- Scope: 133 GitHub projects, 6 languages
- 핵심:
  - repository history의 co-change cluster로 modularity/change propagation을 분석
- 책에서의 용도:
  - change coupling
  - hidden dependency
  - Hot File / blast radius metric 근거

### H5. DORA — Loosely Coupled Teams

- URL: https://dora.dev/capabilities/loosely-coupled-teams/
- 핵심:
  - 다른 팀과 세밀한 coordination 없이 변경·테스트·배포 가능한 architecture
- 책에서의 용도:
  - Team autonomy를 Agent task autonomy로 재해석

## I. Test Determinism / Diagnostic Reliability

### I1. Google — Test Flakiness

- URL: https://testing.googleblog.com/2020/12/test-flakiness-one-of-main-challenges.html
- 핵심:
  - test/application/dependency/OS까지 flakiness 원인
  - hermetic test environment가 external dependency를 제거
- 책에서의 용도:
  - verifier reliability

### I2. Google — Where do our flaky tests come from?

- URL: https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html
- 핵심:
  - larger tests와 flakiness 사이 강한 연관 관찰
- 책에서의 용도:
  - small/fast/local verifier 논거

### I3. Systemic Flakiness

- URL: https://arxiv.org/abs/2504.16777
- Date: 2025
- 핵심:
  - flaky tests가 cluster로 나타나는 systemic flakiness
  - network/external dependency가 주요 원인으로 관찰
- 책에서의 용도:
  - Agent feedback channel contamination

### I4. Google Research — De-Flake Your Tests

- URL: https://research.google/pubs/de-flake-your-tests-automatically-locating-root-causes-of-flaky-tests-in-code-at-google/
- 핵심:
  - 428 projects 대상 code-level flaky root-cause localization
  - case studies에서 82% accuracy 보고
- 책에서의 용도:
  - machine diagnosability / automated localization

## J. AI Code Maintainability / Multi-Agent Coordination

### J1. Debt Behind the AI Boom

- URL: https://arxiv.org/abs/2603.28592
- Date: 2026
- Scope: 304,362 verified AI-authored commits, 6,275 repositories
- 핵심:
  - AI-authored changes가 code smell/bug/security issue를 도입하고 일부가 장기간 잔존
- 책에서의 용도:
  - Entropy Resistance / Continuous Cleanup

### J2. Quality Assurance of LLM-generated Code

- URL: https://arxiv.org/abs/2511.10271
- 핵심:
  - functional correctness와 non-functional quality를 분리
  - industry에서는 maintainability/readability를 중요하게 봄
- 책에서의 용도:
  - test pass != quality

### J3. Is Agent Code Less Maintainable Than Human Code?

- URL: https://arxiv.org/abs/2606.21804
- Date: 2026
- 핵심:
  - 후속 Agent가 agent-generated code 위에서 작업할 때 task resolve rate가 최대 13.1% 감소
  - 전통적인 maintainability metric만으로 차이를 충분히 설명하지 못함
- 책에서의 용도:
  - Agent-to-Agent maintainability라는 새로운 품질 관점

### J4. CooperBench

- URL: https://arxiv.org/abs/2601.13295
- Date: 2026
- 핵심:
  - collaborative coding에서 평균적으로 solo보다 성공률 저하
  - communication만으로 coordination failure를 충분히 해결하지 못함
- 책에서의 용도:
  - Parallel Changeability
  - coordination requirement 자체를 줄이는 architecture

### J5. AsynCodeBench

- URL: https://arxiv.org/abs/2609.32662
- Date: 2026
- 핵심:
  - final task success와 별도로 cross-agent dependency resolution을 측정
  - explicit dependency checker 제안
- 책에서의 용도:
  - Task dependency를 first-class executable artifact로 다루는 근거

### J6. Code Review Agent Benchmark

- URL: https://arxiv.org/abs/2603.23448
- Date: 2026
- 핵심:
  - code generation 증가에 따라 review/QA가 별도 agent capability가 됨
  - 평가한 review agents를 합쳐도 benchmark task의 약 40% 수준 해결
- 책에서의 용도:
  - generation throughput만 늘리는 것으로 quality pipeline이 해결되지 않음

### J7. Not All Agents Are Equal

- URL: https://arxiv.org/abs/2609.17598
- Date: 2026
- Scope: 37,623 provenance-labeled PRs, 2,807 repositories
- 핵심:
  - agent별 quality/post-merge behavior 차이가 큼
- 책에서의 용도:
  - "AI code"를 하나의 단일 품질 범주로 일반화하지 않기 위한 반례

## 갱신된 다음 수집 우선순위

1. Architecture drift / dependency erosion 장기 연구
2. AI agent PR의 실제 concurrent merge conflict 실증 연구 원문 확인
3. semantic conflict / stale contract 연구
4. build/test affected-selection 연구
5. UI coding agent와 visual feedback의 직접 비교 연구
6. secure sandbox / least privilege / supply-chain risk
7. generated code / lockfile / schema hot-file 충돌 사례
8. Agent task specification quality 및 requirement smell
9. long-running agent continuity / handoff artifact
10. 실제 프로젝트를 대상으로 한 Task Surface 실험 설계


## K. Coding Agent Failure Modes

### K1. FixedBench — Coding Agents Don't Know When to Act

- URL: https://www.sri.inf.ethz.ch/publications/gloaguen2026coding
- Date: 2026
- 핵심:
  - 코드 변경이 필요 없는 200개 human-verified task
  - 최신 Agent도 35~65%에서 불필요한 production code 변경 제안
  - "아무것도 하지 않기"를 명시적인 성공으로 취급해야 성능 개선
- 책에서의 쉬운 표현:
  - "고칠 필요가 없는데도 손댄다"
- 책에서의 용도:
  - No Change를 정상적인 완료 상태로 설계해야 한다는 근거

### K2. OverEager Coding Agents / OverEager-Bench

- URL: https://arxiv.org/abs/2605.18583
- Date: 2026
- Scope: 500 scenarios, 약 7,500 runs
- 핵심:
  - benign task에서도 요청 범위를 넘어 관련 없는 파일/설정을 건드리는 현상
  - model뿐 아니라 Agent 실행 framework에 따라 차이가 큼
- 책에서의 쉬운 표현:
  - "시키지 않은 것까지 건드린다"
- 책에서의 용도:
  - task boundary / protected path / scope guard

### K3. SWE Atlas

- URL:
  - https://labs.scale.com/papers/sweatlas
  - https://github.com/scaleapi/SWE-Atlas
- Date: 2026
- Scope:
  - Codebase Q&A 124 tasks
  - Test Writing 90 tasks
  - Refactoring 70 tasks
- 핵심:
  - 코드를 만드는 능력과 코드베이스를 이해·검증·정리하는 능력은 다름
  - 상위 시스템도 전체 평가에서 50%를 넘지 못함
  - edge case, runtime analysis, engineering best practice에서 계속 어려움
- 책에서의 쉬운 표현:
  - "패치를 만드는 것과 소프트웨어를 제대로 고치는 것은 다르다"

### K4. Agentic Rubrics

- URL:
  - https://labs.scale.com/blog/agentic-rubrics
  - https://static.scale.com/uploads/654197dc94d34f66c0f5184e/Scale-Agentic-Rubrics.pdf
- Date: 2026
- 핵심:
  - tests가 accept한 patch 중에도 실제로는 root cause 누락, edge case 누락, wrong layer, scope creep이 존재
  - test와 rubric이 충돌한 사례 중 54%는 rubric이 잡아낸 문제가 실질적인 문제였음
- 책에서의 쉬운 표현:
  - "테스트는 통과했지만 제대로 고친 것은 아니다"

### K5. SWE Refactor Bench

- URL: https://arxiv.org/abs/2608.23564
- Date: 2026
- 핵심:
  - 동작 테스트만 통과하면 실제 migration을 하지 않고 옛 구현을 복사해도 통과할 수 있는 blind spot
  - migration completeness와 behavior correctness를 따로 검사
- 책에서의 쉬운 표현:
  - "정답만 맞추고 숙제는 안 한 패치"
- 책에서의 용도:
  - structural verification / completion check

### K6. CodeTaste

- URL: https://proceedings.mlr.press/v306/thillen26a.html
- Date: 2026
- 핵심:
  - Agent는 상세히 지정된 refactoring은 비교적 잘 수행하지만, 실제 사람이 선택했을 구조 개선을 스스로 발견하는 데는 약함
- 책에서의 쉬운 표현:
  - "어떻게 고치라고 정확히 알려주면 잘하지만, 어디를 정리해야 하는지는 아직 어렵다"
- 책에서의 용도:
  - structural judgement / refactoring discovery

### K7. Debt Behind the AI Boom

- URL: https://arxiv.org/abs/2603.28592
- Date: 2026
- Scope: 304,362 verified AI-authored commits, 6,275 repositories
- 핵심:
  - AI-authored changes에서도 code smell/bug/security issue가 실제로 발생
  - 추적된 AI-introduced issue 중 24.2%가 최신 revision까지 남음
- 책에서의 쉬운 표현:
  - "AI가 만든 작은 문제도 저장소에 남아 쌓인다"
- 책에서의 용도:
  - 지속적인 cleanup과 구조 검사 필요성

### K8. Code for Machines, Not Just Humans

- URL: https://doi.org/10.1145/3793655.3793722
- Date: 2026
- Scope: 5,000 Python files
- 핵심:
  - 사람에게 읽기 좋은 코드 품질과 AI가 의미를 보존하며 수정할 가능성 사이에 유의미한 연관 관찰
- 책에서의 쉬운 표현:
  - "사람에게 좋은 코드와 Agent에게 좋은 코드는 완전히 다른 것이 아니다"
- 책에서의 용도:
  - 기존 Clean Code를 버리는 것이 아니라 확장해야 한다는 반론 근거

### K9. Do AI Agents Really Improve Code Readability?

- URL: https://arxiv.org/abs/2603.13723
- Date: 2026
- Scope: 403 readability-related Agent commits
- 핵심:
  - readability 개선 목적의 Agent 변경도 기존 maintainability/complexity 지표를 악화시키는 사례가 적지 않음
- 책에서의 쉬운 표현:
  - "정리해 달라고 했다고 실제 코드가 더 단순해지는 것은 아니다"
- 책에서의 용도:
  - refactoring verification 필요성


## L. 병렬 충돌 / 권한 경계 추가 자료

### L1. AI Agent Pull Requests on GitHub: Frequency, Structure, and Merge Conflict Rates

- URL: https://arxiv.org/abs/2607.04697
- Date: 2026
- Scope: AIDev-pop 33,596 PRs / 2,807 repositories
- 핵심:
  - Agent가 만든 PR의 동시 진행은 드문 예외가 아님
  - 실제 three-way merge를 재현했을 때 cross-agent PR 쌍의 textual conflict가 41.7%, intra-agent는 19.8%
  - 충돌 파일의 84.4%는 source code
  - textual conflict만 측정한 것이므로 의미상의 충돌 비용은 포함하지 않음
- 책에서의 쉬운 표현:
  - "서로 다른 Agent가 각자 작업한 변경은 실제로 자주 부딪힌다"
- 책에서의 용도:
  - 중앙 공통 파일을 줄이는 원칙
  - 병렬 Agent를 전제로 한 코드 구조

### L2. Do Coding Agents Understand Least-Privilege Authorization?

- URL: https://arxiv.org/abs/2605.14859
- Date: 2026
- Benchmark: AuthBench, 120 terminal tasks
- 핵심:
  - 최신 모델도 작업에 필요한 권한과 불필요한 권한을 동시에 정확하게 나누는 데 어려움
  - 더 오래 reasoning한다고 자연스럽게 해결되지 않음
  - 충분한 권한과 불필요한 권한 제거를 나누어 검사하는 방법이 효과적
- 책에서의 쉬운 표현:
  - "Agent에게 스스로 안전한 권한 범위를 정하라고 맡기지 않는다"
- 책에서의 용도:
  - 작업별 workspace / 최소 권한 / secret 분리

### L3. Improving Code Localization with Repository Memory

- URL: https://www.microsoft.com/en-us/research/publication/improving-code-localization-with-repository-memory/
- Venue: ICLR 2026
- 핵심:
  - bug fixing에서 올바른 수정 위치를 찾는 것이 독립적인 난제
  - commit history와 issue history를 repository memory로 활용하면 localization 개선 가능
- 책에서의 쉬운 표현:
  - "고칠 곳을 찾는 데도 저장소의 과거 경험이 도움이 된다"
- 책에서의 용도:
  - 검색 가능한 구조와 repository history의 가치


## M. 원칙 반론 검토 자료

### M1. Coding Agents are Effective Long-Context Processors

- URL: https://arxiv.org/abs/2603.20432
- Date: 2026
- 핵심:
  - Coding Agent가 file system, shell, code execution을 이용하면 매우 큰 자료도 효과적으로 처리할 수 있음
  - 단순히 context window 안에 모든 내용을 넣는 방식과 다른 결과
- 책에서의 의미:
  - "Agent는 긴 코드를 못 읽으니 무조건 작게 쪼개야 한다"는 주장의 반례
  - locality는 모델 한계가 아니라 탐색 비용과 변경 경계 관점에서 설명해야 함

### M2. The Limits of Long-Context Reasoning in Automated Bug Fixing

- URL: https://arxiv.org/abs/2602.16069
- Date: 2026
- 핵심:
  - SWE-bench 기반 실험에서 긴 context를 직접 넣었을 때 성능 저하
  - 성공한 agent trajectory는 비교적 짧은 context 단계로 진행되는 경향
- 책에서의 의미:
  - 큰 context window가 repository 구조의 필요성을 자동으로 없애지는 않음
  - M1과 함께 읽어야 함

### M3. Beyond Cohesion and Coupling

- URL: https://doi.org/10.1145/3707452
- Venue: ACM TOSEM
- Date: 2025
- 핵심:
  - cohesion/coupling만으로 사람이 이해하기 좋은 module decomposition을 충분히 설명하기 어려움
  - control flow 등 추가 기준이 필요
- 책에서의 의미:
  - "결합도만 낮추면 좋은 Agentic 구조"라는 단순화 방지
  - metric을 목표로 삼아 구조를 억지로 쪼개지 않기 위한 반례

### M4. Martin Fowler — Monolith First

- URL: https://martinfowler.com/bliki/MonolithFirst.html
- 핵심:
  - 좋은 service boundary를 초기에 정확히 잡기 어려움
  - 너무 일찍 강한 경계를 만들면 refactoring 비용 증가
  - coarse-grained structure에서 시작해 실제 경험으로 경계를 찾는 전략
- 책에서의 의미:
  - Agent 병렬성을 이유로 premature decomposition을 하지 않는 근거

### M5. Martin Fowler — Microservice Trade-Offs

- URL: https://martinfowler.com/articles/microservice-trade-offs.html
- 핵심:
  - strong module boundary의 장점과 distributed system cost를 함께 설명
  - module boundary를 얻기 위해 반드시 microservice가 필요한 것은 아님
- 책에서의 의미:
  - "독립 작업 = 독립 서비스"라는 잘못된 결론 방지

### M6. Modular Monolith Architecture in Cloud Environments: A Systematic Literature Review

- URL: https://doi.org/10.3390/fi17110496
- Date: 2025
- 핵심:
  - modular monolith의 단순성, 유지보수성 장점과 scalability/resilience 한계를 함께 정리
- 책에서의 의미:
  - Agentic Clean Code를 특정 architecture style로 고정하지 않기 위한 자료


## N. 유지보수와 장기 작업을 평가하는 최근 벤치마크

### N1. NITR — Needle in the Repo

- URL: https://cs.ucr.edu/~qzhang/nitr.html
- Date: 2026
- 핵심:
  - 최종 기능 성공 여부만 보지 않고 AI가 repository 변경을 유지보수하기 좋은 형태로 했는지 평가
  - change locality
  - reuse와 repository awareness
  - responsibility decomposition
  - dependency control
  - testability / determinism
  - side-effect isolation
  - state ownership
- 책에서의 쉬운 표현:
  - "기능이 돌아간다고 잘 고친 것은 아니다"
- 책에서의 용도:
  - Agentic Clean Code의 비교 실험 설계에 직접적인 참고

### N2. ChainSWE

- URL: https://arxiv.org/abs/2607.02606
- Date: 2026
- Scope: 54 Python projects, 304 chronological issues
- 핵심:
  - repository를 매번 초기화하지 않고 이전 수정 결과 위에서 다음 bug를 계속 해결
  - chain이 길어질수록 Agent 성능이 최대 70%까지 감소
- 책에서의 쉬운 표현:
  - "첫 번째 수정은 잘해도 계속 고치다 보면 점점 어려워질 수 있다"
- 책에서의 용도:
  - 다음 Agent가 더 쉽게 일할 수 있는가
  - 장기 유지보수성

### N3. SWE-CI

- URL: https://arxiv.org/abs/2603.03823
- Date: 2026
- Scope: 100 tasks, 평균 233일 / 71 consecutive commits의 evolution history
- 핵심:
  - 일회성 bug fix가 아니라 장기간 이어지는 CI 형태로 Agent 유지보수 능력을 평가
  - functional correctness에서 long-term maintainability로 평가 범위를 확장
- 책에서의 쉬운 표현:
  - "소프트웨어는 한 번 고치고 끝나는 작업이 아니다"
- 책에서의 용도:
  - 연속 변경 실험 근거

### N4. NL2Repo-Bench

- URL: https://proceedings.mlr.press/v306/ding26j.html
- Venue: ICML 2026
- 핵심:
  - 짧은 patch task가 아니라 long-horizon repository construction 능력을 평가
- 책에서의 쉬운 표현:
  - "짧은 문제 하나를 푸는 능력과 저장소를 오래 만들어가는 능력은 다르다"
- 책에서의 용도:
  - long-horizon engineering 관점

### N5. RACE-Bench

- URL: https://conf.researchr.org/details/ase-2026/ase-2026-research-track/130/RACE-Bench-A-Reasoning-Augmented-Benchmark-for-Repository-Level-Code-Agents-on-Featu
- Venue: ASE 2026
- Scope: 528 feature-addition instances, 12 open-source repositories
- 핵심:
  - final test 결과만 보는 black-box 평가의 한계를 지적
  - feature addition 과정에서 Agent가 어디서 실패하는지 reasoning 과정까지 평가하려는 방향
- 책에서의 쉬운 표현:
  - "성공했는지만 보지 말고 어떻게 고쳤는지도 봐야 한다"
- 책에서의 용도:
  - 비교 실험에서 탐색량/수정과정 기록의 근거

### N6. SWE-fficiency

- URL: https://proceedings.mlr.press/v306/ma26l.html
- Venue: ICML 2026
- Scope: 498 performance tasks, 9 real repositories
- 핵심:
  - Agent가 성능 병목을 찾고 실제 workload를 개선하는 능력 평가
  - 상위 Agent도 전문가 speedup의 평균 0.23배 미만
  - 병목 위치 찾기, 여러 함수에 걸친 실행 흐름 이해, correctness 유지가 어려움
- 책에서의 쉬운 표현:
  - "고칠 곳을 찾는 문제는 버그 수정뿐 아니라 성능 개선에서도 반복된다"
- 책에서의 용도:
  - 코드 위치 찾기와 전체 실행 흐름 이해의 중요성


## O. Worktree 최소화 / Shared Workspace / Hybrid Isolation

### O1. Git — git-worktree Documentation

- URL: https://git-scm.com/docs/git-worktree
- 핵심:
  - linked worktree는 repository 데이터를 공유하지만 `HEAD`, `index` 등은 worktree별로 분리
  - worktree는 단순 별도 디렉터리가 아니라 Git working state isolation
- 책에서의 용도:
  - 같은 checkout에서 파일만 분리하면 Git write operation까지 안전하다는 오해 방지
  - Worktree가 해결하는 문제와 code modularity가 해결하는 문제를 분리

### O2. Claude Code — Run parallel sessions with worktrees

- URL: https://code.claude.com/docs/en/worktrees
- 핵심:
  - parallel session의 file edit collision을 막기 위한 공식 isolation 방식
  - worktree는 fresh checkout이므로 dependency/setup 초기화 필요
  - subagent도 worktree isolation 가능
- 책에서의 용도:
  - 현재 Agent tooling에서 Worktree가 실용적인 기본 격리 수단이라는 근거
  - 동시에 lifecycle/setup cost가 존재한다는 근거

### O3. Anthropic — Building a C compiler with a team of parallel Claudes

- URL: https://www.anthropic.com/engineering/building-c-compiler
- Date: 2026-02-05
- 핵심:
  - 각 Agent를 Docker container + local clone으로 강하게 격리
  - merge conflict는 여전히 빈번
  - Linux kernel처럼 하나의 큰 sequential bottleneck에서는 16 Agent가 같은 문제에 몰려 병렬성 감소
  - verifier를 이용해 서로 다른 파일/실패로 문제를 분해한 뒤 병렬성 회복
- 책에서의 용도:
  - isolation만으로 parallelism이 생기지 않는 실제 사례
  - Independent Change Surface의 중요성

### O4. AI Agent Pull Requests on GitHub: Frequency, Structure, and Merge Conflict Rates

- URL: https://arxiv.org/abs/2607.04697
- Date: 2026
- Scope: 33,596 agent PRs / 2,807 repositories
- 핵심:
  - concurrent cross-agent PR textual conflict 41.7%
  - intra-agent pair 19.8%
  - conflicted files의 84.4%가 source code
  - 약 42%가 modify/delete 또는 add/add structural conflict
  - textual conflict만 측정한 하한
- 책에서의 용도:
  - Worktree는 development-time overwrite를 막아도 merge-time conflict를 제거하지 못한다는 근거
  - Change isolation과 execution isolation의 구분

### O5. CooperBench

- URL: https://arxiv.org/abs/2601.13295
- Project: https://cooperbench.com/
- Date: 2026
- 핵심:
  - 652 collaborative coding tasks
  - cooperative execution이 solo 대비 평균 약 30% 낮은 성공률
  - communication이 conflict를 줄여도 전체 success를 충분히 회복하지 못함
- 책에서의 용도:
  - coordination channel을 늘리는 것보다 coordination requirement 자체를 줄이는 구조의 필요성

### O6. AgentRoom: Concurrent Multi-Agent Coding in a CRDT-Backed Shared Workspace

- URL: https://arxiv.org/abs/2608.23740
- Date: 2026
- 핵심:
  - file claim, status, broadcast, CRDT shared filesystem을 사용한 shared-workspace 접근
  - branch/worktree 후 merge 외의 multi-agent collaboration model을 실험
- 책에서의 용도:
  - shared workspace를 무조건 금지하지 않고 비교 실험 대상으로 두는 근거
  - Full Isolation / Shared Ownership / Overlay 모델 비교

### O7. Bazel — Hermeticity

- URL: https://bazel.build/basics/hermeticity
- 핵심:
  - declared input/output 기반 isolation
  - source tree에 output을 쓰는 build는 같은 source tree에서 다른 target build를 방해할 수 있음
  - hermeticity는 reproducibility와 parallel execution을 지원
- 책에서의 용도:
  - shared workspace 가능 조건은 source file ownership뿐 아니라 build/test state isolation까지 포함해야 한다는 근거

### O8. Nx — Affected Project Graph

- URL:
  - https://nx.dev/docs/features/ci-features/affected
  - https://nx.dev/docs/kb/cipe-affected-project-graph
- 핵심:
  - changed file을 project/dependency graph에 연결해 최소 affected set 계산
  - widely shared project/global input은 affected set을 크게 확장
- 책에서의 용도:
  - Task의 change scope와 dependency graph를 이용해 isolation level을 결정하는 scheduler 아이디어
  - Hot File / Shared Modification Surface의 실행 가능한 예시
