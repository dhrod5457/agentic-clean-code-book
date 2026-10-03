package com.example.shop.repository;

import com.example.shop.common.money.Money;
import com.example.shop.domain.Refund;
import com.example.shop.domain.RefundStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class RefundRepository {

  private static final String SELECT =
      """
      SELECT id, order_id, amount, partial, reason, status, delivery_fee_deduction,
             refunded_amount, requested_at, processed_at
      FROM refunds
      """;

  private final JdbcClient jdbcClient;

  public RefundRepository(JdbcClient jdbcClient) {
    this.jdbcClient = jdbcClient;
  }

  public List<Refund> findAll() {
    return jdbcClient.sql(SELECT + " ORDER BY id DESC").query(RefundRepository::map).list();
  }

  public Optional<Refund> findById(long id) {
    return jdbcClient
        .sql(SELECT + " WHERE id = :id")
        .param("id", id)
        .query(RefundRepository::map)
        .optional();
  }

  public List<Refund> findByOrderId(long orderId) {
    return jdbcClient
        .sql(SELECT + " WHERE order_id = :orderId ORDER BY id")
        .param("orderId", orderId)
        .query(RefundRepository::map)
        .list();
  }

  /** {@code REQUESTED} 환불을 저장하고 새 환불 ID 를 돌려준다. */
  public long insertRequested(
      long orderId, Money amount, boolean partial, String reason, OffsetDateTime requestedAt) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcClient
        .sql(
            """
            INSERT INTO refunds (order_id, amount, partial, reason, status, requested_at)
            VALUES (:orderId, :amount, :partial, :reason, :status, :requestedAt)
            """)
        .param("orderId", orderId)
        .param("amount", amount.value())
        .param("partial", partial)
        .param("reason", reason)
        .param("status", RefundStatus.REQUESTED.name())
        .param("requestedAt", requestedAt)
        .update(keyHolder);
    return keyHolder.getKeyAs(Long.class);
  }

  public void approve(
      long id, Money deliveryFeeDeduction, Money refundedAmount, OffsetDateTime processedAt) {
    jdbcClient
        .sql(
            """
            UPDATE refunds
            SET status = :status, delivery_fee_deduction = :deduction,
                refunded_amount = :refundedAmount, processed_at = :processedAt
            WHERE id = :id
            """)
        .param("status", RefundStatus.APPROVED.name())
        .param("deduction", deliveryFeeDeduction.value())
        .param("refundedAmount", refundedAmount.value())
        .param("processedAt", processedAt)
        .param("id", id)
        .update();
  }

  public void reject(long id, OffsetDateTime processedAt) {
    jdbcClient
        .sql("UPDATE refunds SET status = :status, processed_at = :processedAt WHERE id = :id")
        .param("status", RefundStatus.REJECTED.name())
        .param("processedAt", processedAt)
        .param("id", id)
        .update();
  }

  private static Refund map(ResultSet rs, int rowNum) throws SQLException {
    return new Refund(
        rs.getLong("id"),
        rs.getLong("order_id"),
        Money.won(rs.getLong("amount")),
        rs.getBoolean("partial"),
        rs.getString("reason"),
        RefundStatus.valueOf(rs.getString("status")),
        nullableMoney(rs, "delivery_fee_deduction"),
        nullableMoney(rs, "refunded_amount"),
        rs.getObject("requested_at", OffsetDateTime.class),
        rs.getObject("processed_at", OffsetDateTime.class));
  }

  private static Money nullableMoney(ResultSet rs, String column) throws SQLException {
    Long value = rs.getObject(column, Long.class);
    return value == null ? null : Money.won(value);
  }
}
