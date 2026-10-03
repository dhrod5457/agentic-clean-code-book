#!/bin/bash
# 컨테이너 시작 스크립트. root 로 실행해 외부 통신을 DNS resolver 와 api.anthropic.com 443 으로 제한한 뒤,
# 모든 capability 를 버리고 agent 사용자로 인자의 명령을 실행한다.
# Claude Code 공식 dev container 의 init-firewall.sh 를 줄인 것이다. host 네트워크 · SSH · npm · GitHub 은 허용하지 않는다.
# 제한을 설정하지 못하면 명령을 실행하지 않고 exit 90 으로 끝난다.
set -euo pipefail
trap 'exit 90' ERR
IFS=$'\n\t'

DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)
iptables -F; iptables -X; iptables -t nat -F; iptables -t nat -X; iptables -t mangle -F; iptables -t mangle -X
ipset destroy allowed 2>/dev/null || true
if [ -n "$DOCKER_DNS_RULES" ]; then
  iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
  iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
  echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
fi

iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT
# DNS 는 /etc/resolv.conf 의 resolver 로만 보낸다
resolvers=$(awk '$1 == "nameserver" {print $2}' /etc/resolv.conf)
[ -n "$resolvers" ] || { echo "start.sh: resolver 가 없다" >&2; exit 90; }
for ns in $resolvers; do
  iptables -A OUTPUT -p udp -d "$ns" --dport 53 -j ACCEPT
  iptables -A OUTPUT -p tcp -d "$ns" --dport 53 -j ACCEPT
done

ipset create allowed hash:net
for domain in api.anthropic.com; do
  ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
  [ -n "$ips" ] || { echo "start.sh: $domain 을 resolve 하지 못했다" >&2; exit 90; }
  while read -r ip; do
    [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]] || { echo "start.sh: 잘못된 IP $ip" >&2; exit 90; }
    ipset add allowed "$ip"
  done <<< "$ips"
done

iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -m set --match-set allowed dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited
# IPv6 는 모두 막는다
ip6tables -P INPUT DROP 2>/dev/null || true
ip6tables -P OUTPUT DROP 2>/dev/null || true
ip6tables -P FORWARD DROP 2>/dev/null || true

exec setpriv --reuid=agent --regid=agent --init-groups --inh-caps=-all --bounding-set=-all --no-new-privs -- "$@"
