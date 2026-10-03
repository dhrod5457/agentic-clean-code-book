# UI Coding Agent에서 시각 피드백은 어떤 역할을 하는가

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 기존 연구의 공백

현재 연구에서는 Storybook, Playwright, screenshot comparison을 주로 **UI 상태 재현 도구**로 다뤘다.

하지만 다음 두 문제는 다르다.

### State Reproducibility

Agent가 특정 화면 상태를 직접 만들 수 있는가.

예:

- loading
- empty
- error
- 긴 문자열
- permission denied

### Visual Feedback

Agent가 실제 렌더링 결과를 보고:

- 문제가 있는지 판단하고
- 원인을 좁히고
- 다시 수정하고
- 개선 여부를 확인

할 수 있는가.

두 번째는 Agent의 feedback loop 자체에 관한 문제다.

---

## 2. WebGen-Bench — 웹 코딩을 실제 UI 동작으로 평가한다

출처:

- WebGen-Bench
- https://arxiv.org/abs/2505.03733
- NeurIPS 2025 Datasets & Benchmarks
- 101 instructions
- 647 manually refined UI test cases

WebGen-Bench는 생성된 웹 애플리케이션을 코드 문자열만으로 평가하지 않는다.

자동 web-navigation agent가 실제 UI를 조작하면서 test case를 수행한다.

보고된 초기 결과에서 가장 좋은 조합도 약 27.8% 수준의 성공률이었다.

### 의미

HTML/CSS/JS가 syntax상 맞고 페이지가 뜬다는 것과 사용자가 실제로 원하는 UI interaction이 맞는 것은 다르다.

UI Agent 평가에는 실행 가능한 화면이 필요하다.

---

## 3. WebGen-Agent — screenshot을 feedback loop 안에 넣는다

출처:

- WebGen-Agent
- https://arxiv.org/abs/2509.22644
- ICLR 2026

WebGen-Agent는 다음 feedback을 반복적으로 사용한다.

- VLM 기반 screenshot feedback
- GUI agent interaction feedback
- backtracking
- best candidate selection

WebGen-Bench에서 보고된 예:

Claude 3.5 Sonnet:

- 정확도: 26.4% → 51.9%
- appearance score: 3.0 → 3.9

Qwen2.5-Coder-7B + Step-GRPO:

- 정확도: 38.9% → 45.4%
- appearance score: 3.4 → 3.7

### 의미

시각 정보는 최종 QA 산출물만이 아니라 **Agent가 다음 수정을 결정하는 입력**으로 쓸 수 있다.

---

## 4. ReLook — 생성, 진단, 개선의 반복

출처:

- ReLook
- ACL 2026
- https://aclanthology.org/2026.acl-long.1167/

ReLook은 web generation을:

~~~text
Generate
  ↓
Render
  ↓
Visual Critic
  ↓
Diagnose
  ↓
Refine
~~~

루프로 처리한다.

invalid rendering에는 zero reward를 주고, Forced Optimization 전략으로 "이미 충분히 괜찮아 보인다"는 조기 종료를 줄인다.

논문은 세 web coding benchmark에서 강한 baseline보다 일관된 개선을 보고한다.

### 의미

UI 작업에서 중요한 것은 "screenshot을 볼 수 있음" 자체가 아니다.

Agent가 화면 차이를 **수정 가능한 진단 정보**로 변환할 수 있어야 한다.

---

## 5. CUA-SWE — 코드와 GUI를 함께 다루는 SWE benchmark

출처:

- CUA-SWE
- https://arxiv.org/abs/2609.32600
- 2026-09-26

CUA-SWE는 CLI/code editing만으로 끝나지 않고 computer-use 능력을 software engineering task에 결합한다.

일부 task는 필요한 specification이나 operational state가 실제 실행 중인 application의 visual interface에만 존재한다.

평가는 task-specific deterministic test를 사용한다.

### 연구 의미

실제 software maintenance에서 "source code가 모든 진실을 담고 있다"는 가정이 깨질 수 있다.

특히 UI bug에서는:

- 현재 viewport
- layout geometry
- hidden/visible state
- scroll
- focus
- browser behavior
- visual clipping

이 source만 보고는 충분히 드러나지 않을 수 있다.

---

## 6. Agentic Clean Code 관점에서의 새 구분

### Reproducible State

특정 화면 상태를 명령으로 바로 만들 수 있음.

### Observable State

Agent가 실제 렌더 결과를 안정적으로 얻을 수 있음.

### Diagnosable State

렌더 결과와 code/state 사이의 연결을 좁힐 수 있음.

### Actionable Visual Feedback

실패 정보가 다음 수정 행동을 결정할 정도로 구체적임.

이 네 단계가 모두 필요하다.

---

## 7. Storybook의 역할을 다시 정의한다

Storybook은 단순 component catalog가 아니다.

Agent 관점에서는 다음 인터페이스가 될 수 있다.

~~~text
State ID
  ↓
Deterministic Fixture
  ↓
Rendered Component
  ↓
Screenshot / DOM / A11y Tree
  ↓
Verifier
~~~

장점:

- 로그인/메뉴 탐색 제거
- 특정 edge state 직접 생성
- screenshot 재현
- DOM 기반 geometry 검사
- accessibility 검사
- 같은 상태를 반복 실행

### 주의

Storybook을 넣었다고 Agent 친화적인 UI가 되는 것은 아니다.

- story가 실제 production state와 drift
- 중요 state 누락
- mock이 실제 API와 불일치
- visual baseline이 OS/browser에 따라 흔들림

할 수 있다.

따라서 story 자체도 contract test 대상이다.

---

## 8. Screenshot만으로는 부족하다

pixel diff는 강력하지만 다음 문제가 있다.

- font rendering 차이
- antialiasing
- OS/browser 차이
- animation
- time/randomness
- 작은 색 차이
- 의미 없는 spacing 차이

따라서 UI verifier는 계층적으로 구성하는 것이 좋다.

### Level 1. Structural

- DOM 존재
- role/name
- accessibility tree
- element count
- overflow 여부

### Level 2. Geometric

- bounding box
- clipping
- overlap
- viewport containment

### Level 3. Visual

- screenshot diff
- perceptual similarity

### Level 4. Interaction

- click
- keyboard
- scroll
- focus
- network/state transition

---

## 9. 새로운 Metric 후보

### State Reachability Cost

특정 UI state를 처음 재현할 때까지:

- tool calls
- navigation steps
- elapsed time

### Visual Diagnosis Cost

첫 screenshot 획득 후 root component를 찾을 때까지:

- screenshots
- DOM inspections
- files read
- tokens

### Render-Fix Iterations

정답 상태에 도달하기까지:

~~~text
render → inspect → edit
~~~

반복 횟수.

### UI State Coverage

기존 metric을 세분화한다.

- reproducible states
- visually verified states
- interaction-verified states

### Visual Flake Rate

동일 commit/state를 반복했을 때 screenshot verifier가 불일치하는 비율.

---

## 10. A/B 실험 3에 미치는 영향

현재 긴 부서명 UI 문제는 이 분야를 측정하기 좋은 task다.

다만 B의 Storybook 유무만 보면:

> Storybook이라는 도구가 있으면 편하다.

정도로 끝날 수 있다.

더 중요한 질문은:

> UI state가 코드와 가까운 deterministic artifact로 존재할 때 Agent의 진단 경로가 실제로 짧아지는가?

다.

따라서 기록해야 할 추가 과정 지표:

- 첫 재현까지 시간
- browser navigation step
- 첫 screenshot까지 시간
- root component localization까지 시간
- render-edit cycle 수
- visual/DOM verifier 실패 횟수

---

## 11. 후속 실험 후보

### Experiment U1 — Same Tool, Different State Architecture

A/B 둘 다 Storybook을 사용할 수 있게 한다.

차이는:

A:
- global fixtures
- generic stories
- 실제 bug state를 만들려면 여러 파일 조합

B:
- feature-local state builder
- contract와 함께 위치
- 상태 override가 명확

이렇게 하면 "Storybook 설치 여부" 대신 state architecture를 비교할 수 있다.

### Experiment U2 — Visual Feedback Ablation

같은 codebase, 같은 Agent로:

- source/test only
- DOM feedback
- DOM + screenshot
- DOM + screenshot + interaction

을 비교한다.

이 실험은 코드 구조와 harness 효과를 분리하는 데 유용하다.

---

## 12. 현재 판단

UI에서 Agent 친화성을 다음처럼 정의할 수 있다.

> **문제가 있는 사용자 상태를 짧은 경로로 재현하고, 실제 렌더 결과를 machine-consumable feedback으로 받아 수정 결과를 반복 검증할 수 있는가.**

따라서 UI State Reproducibility는 유지하되, 그 위에 **Visual Observability / Visual Feedback Loop**를 별도 연구 항목으로 추가하는 것이 적절하다.
