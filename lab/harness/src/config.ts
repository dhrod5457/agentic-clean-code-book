import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// 실행 설정 · 과제 정의 · 실행 입력과 그 hash. 기준은 _design/experiment-execution-contract-v0.1.md §3, §8

export const LAB_ROOT = path.resolve(import.meta.dirname, '../../..');

export interface ExecConfig {
  id: string;
  agent: {
    executable: string;
    version: string;
    model: string;
    subagent_model: string;
    effort: string;
    max_budget_usd: number;
    disallowed_tools: string[];
    settings_file: string | null;
    // settings 가 부르는 hook 스크립트. 내용이 실행 조건 hash 에 들어간다
    hook_files: string[];
  };
  timeouts_ms: {
    prepare: number;
    agent: number;
    grace: number;
    grading_normative: number;
    grading_diagnostic: number;
  };
  retry: { max_attempts: number };
  grading: { run_script: string };
  // runtime: docker 는 실제 실행(실행 계약 §4), local 은 컨테이너 없이 가짜 process 로 orchestration 만 시험할 때 쓴다.
  // grading_network: 채점 컨테이너의 docker network. 의존성 cache 층이 생기기 전(체크리스트 7단계)에는 bridge 다
  environment: { runtime: 'docker' | 'local'; image: string | null; platform: string; cpus: number; memory: string; grading_network: 'bridge' | 'none' };
}

export interface TaskDef {
  experiment: string;
  prompt: string;
  grading: { normative: string[]; diagnostic: string[] };
}

export interface RunSpec {
  experiment: string;
  task: string;
  variant: string;
  repetition: number;
  attempt?: number;
  retryOf?: string | null;
  source: { repo: string; commit: string };
  port: number;
}

export class SpecError extends Error {}

// Agent 가 볼 수 있는 곳에 있으면 안 되는 문자열(설계 §15.1, 실행 계약 §4.3)
export const FORBIDDEN = /agentic|variant|실험|experiment/i;

export function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

// key 를 정렬하고 공백 없이 쓴 JSON
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>).sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

// 실행 설정과 설정이 가리키는 파일 내용까지 묶은 hash. 같은 실험 ID 의 실행은 모두 같아야 한다
export function conditionHash(config: ExecConfig, labRoot: string): string {
  const referenced = [config.agent.settings_file, ...config.agent.hook_files]
    .filter((p): p is string => p !== null)
    .map((p) => `${p}:${sha256(readFileSync(path.resolve(labRoot, p)))}`);
  return sha256(`${canonicalJson(config)}\n${referenced.join('\n')}`);
}

export function inputHash(spec: RunSpec, promptSha256: string, condition: string): string {
  return sha256(canonicalJson({
    experiment: spec.experiment,
    task: spec.task,
    variant: spec.variant,
    repetition: spec.repetition,
    source_commit: spec.source.commit,
    prompt_sha256: promptSha256,
    condition_hash: condition,
  }));
}

const EXPERIMENT = /^(exp[123](\.r[0-9]+)?|pilot-[0-9]+|calibration-[0-9]+)$/;

// 실행 디렉터리를 만들기 전에 입력을 확인한다. 실패하면 실행을 시작하지 않는다
export function validateSpec(spec: RunSpec, tasks: Record<string, TaskDef>): TaskDef {
  if (!EXPERIMENT.test(spec.experiment)) throw new SpecError(`실험 ID 형식이 아니다: ${spec.experiment}`);
  const task = tasks[spec.task];
  if (!task) throw new SpecError(`과제 정의가 없다: ${spec.task}`);
  const base = spec.experiment.replace(/\.r[0-9]+$/, '');
  if (base.startsWith('exp') && base !== task.experiment) {
    throw new SpecError(`과제 ${spec.task} 는 ${task.experiment} 의 과제다: ${spec.experiment}`);
  }
  if (spec.variant !== 'a' && spec.variant !== 'b') throw new SpecError(`Variant 는 a 또는 b 다: ${spec.variant}`);
  if (!Number.isInteger(spec.repetition) || spec.repetition < 1) throw new SpecError(`반복 번호는 1 이상이다: ${spec.repetition}`);
  if (!/^[0-9a-f]{40}$/.test(spec.source.commit)) throw new SpecError(`source commit 은 40자리 SHA 다: ${spec.source.commit}`);
  if (!Number.isInteger(spec.port) || spec.port < 1024 || spec.port > 65535) throw new SpecError(`채점 port 범위가 아니다: ${spec.port}`);
  return task;
}
