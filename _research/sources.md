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
