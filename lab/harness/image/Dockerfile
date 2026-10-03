# 실험 실행 이미지. 버전은 lab/spec/versions.md, 실행 조건은 _design/experiment-execution-contract-v0.1.md §4.5.
# Agent 컨테이너와 채점 컨테이너가 같은 이미지를 쓴다. build 한 digest 를 lab/harness/image.lock 에 기록한다.
FROM eclipse-temurin:25.0.4.1_1-jdk-noble@sha256:0d623ea18d7b0fe1e12a2c0a920f7e950cad433387e5a49d3611e1507fa07602

ARG NODE_VERSION=24.21.0
ARG NODE_SHA256_ARM64=6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2
ARG PNPM_VERSION=10.34.6
ARG PLAYWRIGHT_VERSION=1.63.0
ARG CLAUDE_CODE_VERSION=2.1.287

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Seoul \
    LANG=ko_KR.UTF-8 \
    LC_ALL=ko_KR.UTF-8 \
    PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright

# git: Agent 작업. iptables · ipset · dnsutils: egress 제한(설계 §15.3). fonts-noto-cjk: 한글 고정 글꼴
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl git xz-utils locales tzdata jq \
      iptables ipset iproute2 dnsutils \
      fonts-noto-cjk \
 && sed -i 's/^# *ko_KR.UTF-8/ko_KR.UTF-8/' /etc/locale.gen && locale-gen ko_KR.UTF-8 \
 && ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && echo Asia/Seoul > /etc/timezone \
 && rm -rf /var/lib/apt/lists/*

RUN test "$(dpkg --print-architecture)" = arm64 \
 && curl -fsSLo /tmp/node.tar.xz "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.xz" \
 && echo "${NODE_SHA256_ARM64}  /tmp/node.tar.xz" | sha256sum -c - \
 && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner \
 && rm /tmp/node.tar.xz \
 && npm install -g "pnpm@${PNPM_VERSION}" "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
 && npm cache clean --force

# Chromium 과 시스템 의존성. 브라우저는 root 소유 고정 경로에 두어 Agent 가 바꾸지 못한다
RUN npx -y "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chromium \
 && chmod -R a+rX "${PLAYWRIGHT_BROWSERS_PATH}" \
 && rm -rf /var/lib/apt/lists/* /root/.npm

# 기본 이미지의 ubuntu 사용자(uid 1000, sudo 그룹)를 지우고 권한 없는 agent 사용자를 만든다
RUN userdel -r ubuntu \
 && useradd -m -u 1000 -s /bin/bash agent \
 && mkdir -p /work && chown agent:agent /work

# 시작 스크립트: 외부 통신 제한 후 agent 로 권한을 낮춘다. 컨테이너는 root 와 NET_ADMIN 으로 시작한다
COPY start.sh /usr/local/sbin/start.sh
RUN chmod 755 /usr/local/sbin/start.sh

WORKDIR /work
ENTRYPOINT ["/usr/local/sbin/start.sh"]
CMD ["bash"]
