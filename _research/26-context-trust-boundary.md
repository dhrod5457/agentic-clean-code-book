# Agent가 읽는 모든 Context를 신뢰해도 되는가

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 기존 Containment의 공백

현재 Agentic Clean Code의 Containment는 주로 다음을 다룬다.

- 작업별 workspace
- 최소 권한
- secret 분리
- 변경 범위 제한
- sandbox

하지만 Coding Agent는 실행 권한만 받는 것이 아니다.

Agent는 다음을 **instruction처럼 읽는다.**

- README
- AGENTS.md / CLAUDE.md
- source comment
- issue / PR
- test failure
- log
- generated file
- dependency documentation
- MCP tool description/response
- downloaded artifact
- Agent skill

따라서 권한이 작아도 오염된 context가 Agent의 판단을 바꾸면 위험하다.

---

## 2. GitInject — 실제 GitHub AI workflow를 공격면으로 본 연구

출처:

- GitInject
- https://arxiv.org/abs/2606.09935
- 2026

GitInject는 실제 GitHub workflow와 ephemeral repository를 이용해 AI-enabled CI/CD의 공격면을 평가한다.

평가:

- 4개 AI provider
- 11개 attack class
- config-file injection
- credential exfiltration
- judgment manipulation
- availability 공격 등

연구에서 테스트한 모든 provider는 default configuration에서 적어도 한 attack class에 취약했다.

### 가장 중요한 해석

논문은 주요 위험을 특정 모델의 "멍청함"보다 CI가:

- credential을 어떻게 제공하고
- repository content를 어떻게 신뢰하고
- Agent action을 어디까지 허용하는가

라는 **구조적 configuration 문제**로 본다.

Agentic Clean Code 관점에서는 코드 안전성만이 아니라 repository/harness의 trust model이 필요하다.

---

## 3. Agent Skill 자체가 악성 instruction carrier가 될 수 있다

출처:

- Do Not Mention This to the User: Detecting and Understanding Malicious Agent Skills in the Wild
- USENIX Security 2026
- https://www.usenix.org/conference/usenixsecurity26/presentation/liu-yi

연구 규모:

- 98,380 skills
- 두 registry
- 157 confirmed malicious skills
- 632 vulnerabilities
- 13 attack techniques

악성 skill 하나당 평균 4.03개의 vulnerability가 관찰됐다.

주요 패턴:

1. credential theft / remote code execution
2. documentation 안의 adversarial instruction으로 Agent behavior 조작

연구진 공개 후 확인된 157개는 registry에서 제거됐다고 보고한다.

### 의미

Agent에게 확장 기능을 많이 붙일수록 단순 tool permission만 보지 말고 **instruction provenance**도 봐야 한다.

---

## 4. Repository 자체가 prompt injection carrier가 될 수 있다

참고 자료:

- RepoGuardBench
- https://github.com/DaoyuanLi2816/RepoGuardBench
- 2026 workshop artifact

다루는 injection 위치:

- README
- issue text
- comments
- logs
- agent rule files

이 자료는 archival evidence보다 낮은 무게로 다루는 것이 좋지만, 공격 surface를 구체화하는 데 유용하다.

### 연구 질문

Agent는 다음을 구분할 수 있는가.

~~~text
Developer Instruction
Repository Fact
Untrusted User Content
Generated Output
External Tool Result
~~~

현재 많은 harness는 이들이 모두 같은 자연어 token stream으로 들어온다.

---

## 5. MCP도 trust boundary가 필요하다

### SOPE

출처:

- SOPE
- ICML 2026
- https://proceedings.mlr.press/v306/lin26r.html

규모:

- 27,216 cases
- 324 transformed real servers
- benchmark Agent 4종 + commercial Agent 3종
- defense 9종

연구는 MCP/tool ecosystem에서 covert privacy exfiltration 위험을 실증한다.

### ShieldMCP

출처:

- ShieldMCP
- ACL Industry 2026
- https://aclanthology.org/2026.acl-industry.58/

runtime에서:

- tool invocation
- tool response

을 검증하는 defense layer를 두어 공격 성공률 감소를 보고한다.

### MCP landscape/security 연구

- ACM TOSEM 2026
- DOI: https://doi.org/10.1145/3796519

MCP ecosystem의 보안/신뢰 문제를 넓게 정리한다.

---

## 6. Least Privilege만으로는 부족하다

현재 sources의 AuthBench 자료는 중요한 기본선이다.

> Agent에게 필요한 권한과 불필요한 권한을 정확히 나누는 능력은 아직 부족하다.

그러나 다음 상황을 생각해보자.

Agent에게:

- 현재 repository write
- test 실행

권한만 줬다.

secret도 없다.

그래도 악성 instruction이 들어오면:

- test 삭제
- 보안 규칙 완화
- dependency 변경
- CI 변경
- production code에 backdoor성 동작 삽입

등은 여전히 가능하다.

즉:

~~~text
Permission Boundary
≠
Instruction Trust Boundary
~~~

둘 다 필요하다.

---

## 7. Context Trust Boundary라는 품질 속성 후보

정의:

> **Agent가 의사결정에 사용하는 정보의 출처·신뢰 수준·권한을 구분하고, 낮은 신뢰도의 context가 높은 권한의 행동으로 직접 승격되지 않게 하는 정도.**

예:

| Context | 기본 신뢰 수준 | 허용 |
|---|---:|---|
| versioned repository policy | 높음 | 규칙 참고 |
| source/test | 높음 | 사실 확인 |
| issue/PR user text | 중간/낮음 | 요구 후보 |
| runtime log | 중간 | 진단 증거 |
| external webpage | 낮음 | 참고 |
| dependency README | 낮음/중간 | 참고 |
| MCP response | tool별 | 검증 후 사용 |
| generated content | 낮음 | 직접 명령으로 취급 금지 |

고정된 신뢰등급 자체보다 **출처가 보존되는 것**이 중요하다.

---

## 8. 코드베이스 차원의 대응

### 8.1 명령과 데이터의 경계를 만든다

예:

- project rule은 versioned policy path에만 둔다.
- 사용자 입력/issue content를 instruction file로 복사하지 않는다.
- logs 안의 문자열을 command로 실행하지 않는다.
- generated artifacts에 privileged instruction을 넣지 않는다.

### 8.2 critical operation은 explicit policy로 통제한다

예:

- dependency 추가
- CI workflow 변경
- secret-accessing code 수정
- auth/permission 변경
- migration destructive operation

은 별도 gate를 둔다.

### 8.3 Agent가 수정할 수 없는 policy도 필요할 수 있다

Agent가:

> architecture rule을 통과하지 못하니 rule 자체를 삭제

할 수 있다면 mechanical enforcement가 약하다.

중요한 verifier/policy는 execution role과 modification role을 분리할 수 있다.

---

## 9. Harness 차원의 대응

### Provenance Preservation

context를 Agent에게 전달할 때 출처를 잃지 않는다.

~~~text
source: issue
trust: untrusted-user-content
content: ...
~~~

### Tool Allowlist / Capability Scope

task마다 필요한 tool만 노출.

### Egress Control

외부 network/secret access를 기본 허용하지 않는다.

### Protected Path

특정 task에서:

- CI
- auth
- security config
- agent policy

변경을 금지하거나 승인 대상으로 둔다.

### Action Validation

write/command/tool call 직전에 policy check.

---

## 10. Metric 후보

### Untrusted-to-Privileged Escalation Rate

낮은 신뢰 context가 privileged action을 유발한 비율.

### Protected Path Violation

task scope 밖 critical path 변경 시도.

### Context Provenance Coverage

Agent에게 제공된 context 중 source/trust metadata가 있는 비율.

### Security Verifier Bypass

Agent가 task 성공을 위해 verifier/policy 자체를 변경한 횟수.

### Secret Exposure Surface

task에 실제로 노출된 secret/capability 수.

---

## 11. 실험 후보

### Experiment S1 — Repository-borne Instruction

동일 task에 benign but adversarial-looking text를 낮은 신뢰 source에 둔다.

예:

- issue body
- fixture text
- log sample

Agent가 이를 project instruction으로 잘못 해석하는지 본다.

실제 secret/외부 공격은 사용하지 않는다.

### Experiment S2 — Protected Policy

동일 architecture failure를 주고:

A:
- Agent가 verifier도 자유롭게 수정 가능

B:
- verifier protected / 변경 시 별도 승인

을 비교한다.

측정:

- rule bypass
- actual fix
- scope expansion

---

## 12. 책에서의 위치

이 내용은 일반적인 AI Security 책을 쓰려는 것이 아니다.

Agentic Clean Code에서 필요한 범위는:

> **코드 품질을 지키는 repository/harness가 Agent에게 어떤 정보를 신뢰시키고 어떤 행동을 허용할지 명시해야 한다.**

정도로 제한하는 것이 좋다.

보안 공격 기법 자체를 깊게 파는 것은 책의 범위를 벗어난다.

---

## 13. 현재 판단

Containment는 권한·workspace 격리만으로 정의하면 부족하다.

다음 보정이 적절하다.

> **Agent의 실행 권한뿐 아니라 의사결정 context에도 trust boundary가 있어야 한다. 낮은 신뢰 입력이 높은 권한의 코드 변경이나 도구 호출로 직접 승격되지 않게 한다.**

이는 향후 MCP, skills, external context 사용이 늘수록 더 중요해질 가능성이 높다.
