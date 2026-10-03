package com.example.shop.common.money;

/** 원 단위 정수 금액. 계산이 long 범위를 넘으면 ArithmeticException 을 던진다. */
public record Money(long value) implements Comparable<Money> {

  public static final Money ZERO = new Money(0);

  public static Money won(long value) {
    return new Money(value);
  }

  public Money plus(Money other) {
    return new Money(Math.addExact(value, other.value));
  }

  public Money minus(Money other) {
    return new Money(Math.subtractExact(value, other.value));
  }

  public Money times(long multiplier) {
    return new Money(Math.multiplyExact(value, multiplier));
  }

  public boolean isZero() {
    return value == 0;
  }

  public boolean isPositive() {
    return value > 0;
  }

  public boolean isLessThan(Money other) {
    return value < other.value;
  }

  public boolean isGreaterThan(Money other) {
    return value > other.value;
  }

  public static Money min(Money a, Money b) {
    return a.value <= b.value ? a : b;
  }

  @Override
  public int compareTo(Money other) {
    return Long.compare(value, other.value);
  }
}
