# Agent를 평가하는 검증기부터 검증해야 한다

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 왜 중요한가

Agentic Clean Code 실험은 다음과 같은 자동 검증에 크게 의존한다.

- unit/integration test
- hidden acceptance test
- architecture rule
- screenshot comparison
- lint/typecheck
- metric collector

문제는 verifier가 틀릴 수 있다는 것이다.

Agent가 틀린 것이 아니라:

- 올바른 solution을 reject하거나
- 잘못된 solution을 accept하거나
- task specification과 다른 것을 검사하거나
- 특정 구현 방식에 과적합

할 수 있다.

따라서:

> Test Pass != Production Quality

뿐 아니라:

> **Verifier Pass != Ground Truth**

도 별도로 다뤄야 한다.

---

## 2. ReviveBench — verifier 자체의 defect를 실제로 찾았다

출처:

- ReviveBench
- https://arxiv.org/abs/2609.36161
- 2026-09-28

ReviveBench는 scientific software task의 실행 가능한 verifier를 만들면서:

- native environment
- established external tools
- reference implementation

에 맞춰 verifier를 calibration한다.

benchmark construction/audit 과정에서 총 28개의 verifier defect를 발견했다고 보고한다.

분류:

- 24 false negative
- 2 false positive
- 나머지 defect 유형 포함

한 CFD task에서는 처음 주장한 numerical solver capability를 verifier로 신뢰성 있게 확립할 수 없어 평가 자체의 한계를 드러냈다.

### 연구진이 강조하는 실용적 점검

1. prescribed method/reference implementation이 실제 threshold에 도달하는지 확인
2. 독립적으로 생성한 여러 candidate의 결과가 verifier와 합리적으로 일치하는지 확인
3. 제출 artifact에서 diagnostic 값을 별도로 다시 계산

### Agentic Clean Code 실험에 주는 경고

hidden test가 많다고 자동으로 객관적인 실험이 되는 것이 아니다.

---

## 3. COBA / AgentSuite — benchmark 구성 요소를 따로 감사한다

출처:

- AgentSuite / COBA
- ICML 2026
- https://proceedings.mlr.press/v306/suh26a.html

COBA는 benchmark를 한 덩어리로 보지 않고 구성 요소별로 감사한다.

- User
- Environment
- Ground Truth
- Evaluation

여섯 Agent benchmark를 대상으로 한 평가에서 expert judgment와 비교한 F1이 약 0.791~0.874 범위였고, 숨은 benchmark flaw가 실제 평가 결과에 영향을 줄 수 있음을 보여준다.

### 의미

우리 실험도 다음을 별도 artifact로 관리하는 것이 좋다.

~~~text
Task Spec
Environment Contract
Ground Truth
Verifier
Metric Collector
~~~

한 문서/스크립트에 섞으면 오류 원인을 찾기 어렵다.

---

## 4. SWE-bench Verified도 충분히 깨끗하지 않았다

출처:

- OpenAI, Why SWE-bench Verified no longer measures frontier coding capabilities
- 2026-02-23
- https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/

OpenAI는 frontier model이 자주 실패하는 SWE-bench Verified task 138개를 감사했다.

이는 전체 500개 task의 27.6%다.

그중 59.4%에서 material test/problem-description issue를 발견했다고 보고했다.

분류 예:

- 35.5%: tests too narrow / 올바른 대안 구현을 거부
- 18.8%: tests too wide / issue 범위를 넘어선 동작 요구
- 5.1%: 기타 mismatch

추가로 benchmark contamination도 frontier 평가 문제로 지적했다.

### 의미

사람이 이미 "Verified"한 benchmark도 시간이 지나면서 평가 신뢰도가 떨어질 수 있다.

---

## 5. SWE-Bench Pro 감사에서도 비슷한 문제가 반복됐다

출처:

- OpenAI, Separating signal from noise in coding evaluations
- 2026-07-08
- https://openai.com/index/separating-signal-from-noise-coding-evaluations/

public split 731개 task를 감사한 결과:

- Agent-based audit pipeline: 27.4% broken
- human annotation: 34.1% broken
- 전체 추정 약 30%

주요 failure category:

- overly strict tests
- underspecified prompts
- low-coverage tests
- misleading prompt

이후 OpenAI는 이전의 SWE-Bench Pro 추천을 철회했다.

### 중요한 연결

Task specification quality와 verifier validity는 별개의 문제가 아니라 연결돼 있다.

~~~text
Prompt ambiguity
→ Ground truth ambiguity
→ Test overfitting
→ 잘못된 Agent ranking
~~~

이 연쇄를 막아야 한다.

---

## 6. PAIChecker — Issue와 PR이 정말 같은 문제를 푸는가

출처:

- PAIChecker
- https://arxiv.org/abs/2607.28587
- 2026

연구는 SWE-bench Verified에서 PR-Issue misalignment를 13.6% 관찰하고, 5개 pattern / 11개 scenario로 분류한다.

제안한 checker는 SWE-Gym / SWE-bench Multilingual에서 binary classification accuracy를 약 92% 수준까지 보고한다.

### 의미

reference patch 자체도 항상 완벽한 ground truth는 아니다.

따라서 A/B 실험에서:

> A/B 둘 다 reference diff와 얼마나 비슷한가

를 정답으로 삼아서는 안 된다.

정답은 behavior + invariant + task boundary로 정의해야 한다.

---

## 7. Verifier failure를 네 종류로 나눌 수 있다

### 7.1 False Negative

올바른 solution을 reject.

예:

- 특정 class 이름을 강제
- 의미상 같은 JSON인데 field ordering 요구
- 다른 합리적 algorithm을 거부

### 7.2 False Positive

잘못된 solution을 accept.

예:

- happy path만 확인
- migration completeness 미검사
- hidden invariant 누락

### 7.3 Specification Mismatch

task 설명과 test가 다른 것을 요구.

### 7.4 Measurement Contamination

variant별 environment/cache/tool 차이가 성능 지표에 섞임.

---

## 8. 우리 A/B 실험에 반드시 추가할 검증 절차

현재 설계의 공정성 검토에 다음을 추가하는 것이 좋다.

### V1. Reference Pass

reference implementation이 모든 공개/숨김 verifier를 통과한다.

### V2. Negative Control

의도적으로 잘못 만든 patch가 실제로 실패해야 한다.

예:

- 권한 검사 제거
- 기존 배송비 재계산
- 메뉴만 추가하고 API 미구현
- 긴 부서명을 CSS로 숨겨 실제 접근성 문제 남김

### V3. Mutant Kill Check

핵심 invariant마다 최소 하나의 mutant를 만든다.

~~~text
mutant가 살아남음
→ verifier blind spot
~~~

### V4. Independent Oracle

가능한 핵심 결과는 두 방식으로 확인한다.

예:

- API behavior test + DB state 확인
- screenshot + DOM geometry
- architecture rule + dependency graph report

### V5. Spec-Verifier Traceability

각 acceptance criterion에 verifier ID를 연결한다.

~~~text
REQ-SHIP-01
  → HIDDEN-SHIP-03
  → HIDDEN-SHIP-04
~~~

검사되지 않는 requirement와 requirement 없는 test를 모두 찾는다.

### V6. Blind Metric Calculation

A/B 코드 구조를 알 필요가 없는 metric은 variant label을 가린 상태로 계산한다.

---

## 9. 새 Metric 후보

### Verifier Mutation Kill Rate

~~~text
잡아낸 의도적 잘못된 mutant
/
전체 mutant
~~~

### Requirement Coverage

~~~text
적어도 하나의 verifier가 연결된 acceptance criterion
/
전체 acceptance criterion
~~~

### Orphan Verifier Rate

~~~text
명시적 requirement에 연결되지 않는 verifier
/
전체 verifier
~~~

### Oracle Agreement

독립 verifier 둘이 같은 판정을 내리는 비율.

### False Rejection Review Rate

사람 독립 검토에서 "정답인데 test가 거부했다"고 판정된 비율.

---

## 10. hidden test의 역할도 제한해야 한다

hidden test는 Agent의 test-gaming을 줄이는 데 유용하다.

그러나 hidden이라는 이유만으로 좋은 verifier가 되는 것은 아니다.

좋은 hidden test는:

- 공개 specification에서 유도 가능
- 특정 implementation detail을 강제하지 않음
- deterministic
- reference solution으로 사전 검증
- negative control을 실제로 reject
- failure reason을 사후 분석 가능

해야 한다.

---

## 11. Architecture Rule도 verifier다

Agentic Clean Code는 architecture rule의 mechanical enforcement를 강조한다.

하지만 규칙 역시 잘못 설계할 수 있다.

예:

~~~text
모든 Service 이름은 *Service여야 한다.
모든 package는 정확히 3단계여야 한다.
파일은 300줄 미만이어야 한다.
~~~

이런 규칙은 실제 architecture invariant보다 현재 모양을 고정한다.

따라서 architecture verifier에도 같은 질문을 해야 한다.

> 이 규칙이 깨지면 실제로 우리가 보호하려는 품질이 나빠지는가?

---

## 12. 실험 결과 공개 시 필요한 정보

최종 결과에는 성공률만 쓰지 않는다.

최소 공개 후보:

- task specification version
- reference implementation hash
- verifier source/hash
- mutant list
- verifier calibration 결과
- container image digest
- model/tool/version
- raw execution log
- metric calculation source/version
- 사람 review rubric
- disagreement 기록

이 정도가 있어야 후속 독자가 실험 결과를 감사할 수 있다.

---

## 13. 현재 판단

Agentic 개발에서 테스트와 기계적 검증은 더욱 중요해진다.

하지만 이 사실은:

> 검증을 많이 추가하자.

로 끝나지 않는다.

더 정확한 원칙은 다음과 같다.

> **Agent가 의존하는 verifier는 production code와 같은 수준으로 검증·버전 관리·감사 가능해야 한다.**

Agent가 verifier를 따라 움직일수록 verifier의 결함 비용도 커진다.

따라서 Verifiability와 함께 **Verifier Validity**를 독립된 실험 품질 속성으로 관리할 가치가 있다.
