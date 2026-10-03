import { readFileSync } from 'node:fs';
import path from 'node:path';

// lab/spec/seed.sql 을 읽어 표마다 행 객체 배열로 바꾼다. 채점 기대값은 이 값에서 계산한다.
// seed.sql 이 쓰는 값 형식(숫자, '문자열', NULL, TRUE/FALSE, TIMESTAMP WITH TIME ZONE '...')만 해석한다.

export const T0 = '2026-01-15T10:00:00+09:00';
export const T0_MS = Date.parse(T0);
export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

export interface MemberRow {
  id: number;
  name: string;
  email: string;
  grade: 'GENERAL' | 'VIP';
  status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';
  joined_at: string;
  last_login_at: string;
  withdrawn_at: string | null;
}

export interface StaffRow {
  id: number;
  login_id: string;
  name: string;
  department: string;
  role: 'ADMIN' | 'OPERATOR';
  active: boolean;
  created_at: string;
}

export interface OrderRow {
  id: number;
  member_id: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED';
  product_amount: number;
  delivery_fee: number;
  total_amount: number;
  created_at: string;
  paid_at: string | null;
  expired_at: string | null;
}

export interface DeliveryRow {
  id: number;
  order_id: number;
  status: 'READY' | 'SHIPPED' | 'DELIVERED';
  fee: number;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface RefundRow {
  id: number;
  order_id: number;
  amount: number;
  partial: boolean;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  delivery_fee_deduction: number | null;
  refunded_amount: number | null;
  requested_at: string;
  processed_at: string | null;
}

type Value = string | number | boolean | null;

function parseValues(body: string): Value[][] {
  const rows: Value[][] = [];
  let i = 0;
  let row: Value[] | null = null;
  while (i < body.length) {
    const c = body[i];
    if (c === '(' && row === null) {
      row = [];
      i++;
    } else if (c === ')' && row !== null) {
      rows.push(row);
      row = null;
      i++;
    } else if (row !== null && c === "'") {
      let s = '';
      i++;
      while (i < body.length) {
        if (body[i] === "'" && body[i + 1] === "'") {
          s += "'";
          i += 2;
        } else if (body[i] === "'") {
          i++;
          break;
        } else {
          s += body[i++];
        }
      }
      row.push(s);
    } else if (row !== null && /[A-Za-z0-9-]/.test(c)) {
      let token = '';
      while (i < body.length && /[A-Za-z0-9.\- ]/.test(body[i]) && body[i] !== "'") token += body[i++];
      token = token.trim();
      if (token === 'TIMESTAMP WITH TIME ZONE') {
        // 다음 문자열 값이 시각이다
        continue;
      }
      if (token === 'NULL') row.push(null);
      else if (token === 'TRUE') row.push(true);
      else if (token === 'FALSE') row.push(false);
      else row.push(Number(token));
    } else {
      i++;
    }
  }
  return rows;
}

function toIso(value: Value): Value {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+09:00$/.test(value)) {
    return value.replace(' ', 'T');
  }
  return value;
}

function parseSeed(sql: string): Record<string, Record<string, Value>[]> {
  const tables: Record<string, Record<string, Value>[]> = {};
  const re = /INSERT INTO (\w+) \(([^)]+)\) VALUES\n([\s\S]*?);\n/g;
  for (const m of sql.matchAll(re)) {
    const cols = m[2].split(',').map((c) => c.trim());
    tables[m[1]] = parseValues(m[3]).map((values) => {
      if (values.length !== cols.length) throw new Error(`${m[1]}: ${values.length} values for ${cols.length} columns`);
      return Object.fromEntries(cols.map((c, k) => [c, toIso(values[k])]));
    });
  }
  return tables;
}

const seedPath = process.env.GRADING_SEED_SQL ?? path.resolve(import.meta.dirname, '../../spec/seed.sql');
const tables = parseSeed(readFileSync(seedPath, 'utf8'));

export const seed = {
  members: tables.members as unknown as MemberRow[],
  staff: tables.staff as unknown as StaffRow[],
  orders: tables.orders as unknown as OrderRow[],
  deliveries: tables.deliveries as unknown as DeliveryRow[],
  refunds: tables.refunds as unknown as RefundRow[],
};

export const ms = (iso: string) => Date.parse(iso);

export function memberById(id: number): MemberRow {
  const m = seed.members.find((x) => x.id === id);
  if (!m) throw new Error(`member ${id} not in seed`);
  return m;
}

export function orderById(id: number): OrderRow {
  const o = seed.orders.find((x) => x.id === id);
  if (!o) throw new Error(`order ${id} not in seed`);
  return o;
}

export const activeVips = seed.members.filter((m) => m.grade === 'VIP' && m.status === 'ACTIVE');
export const activeGenerals = seed.members.filter((m) => m.grade === 'GENERAL' && m.status === 'ACTIVE');
