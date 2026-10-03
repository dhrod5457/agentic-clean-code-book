package com.example.shop.repository;

import com.example.shop.common.money.Money;
import com.example.shop.domain.Delivery;
import com.example.shop.domain.DeliveryStatus;
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
public class DeliveryRepository {

  private static final String SELECT =
      """
      SELECT id, order_id, status, fee, created_at, shipped_at, delivered_at
      FROM deliveries
      """;

  private final JdbcClient jdbcClient;

  public DeliveryRepository(JdbcClient jdbcClient) {
    this.jdbcClient = jdbcClient;
  }

  public List<Delivery> findAll() {
    return jdbcClient.sql(SELECT + " ORDER BY id DESC").query(DeliveryRepository::map).list();
  }

  public Optional<Delivery> findById(long id) {
    return jdbcClient
        .sql(SELECT + " WHERE id = :id")
        .param("id", id)
        .query(DeliveryRepository::map)
        .optional();
  }

  public Optional<Delivery> findByOrderId(long orderId) {
    return jdbcClient
        .sql(SELECT + " WHERE order_id = :orderId")
        .param("orderId", orderId)
        .query(DeliveryRepository::map)
        .optional();
  }

  /** {@code READY} 배송을 저장하고 새 배송 ID 를 돌려준다. */
  public long insertReady(long orderId, Money fee, OffsetDateTime createdAt) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcClient
        .sql(
            """
            INSERT INTO deliveries (order_id, status, fee, created_at)
            VALUES (:orderId, :status, :fee, :createdAt)
            """)
        .param("orderId", orderId)
        .param("status", DeliveryStatus.READY.name())
        .param("fee", fee.value())
        .param("createdAt", createdAt)
        .update(keyHolder);
    return keyHolder.getKeyAs(Long.class);
  }

  public void markShipped(long id, OffsetDateTime shippedAt) {
    jdbcClient
        .sql("UPDATE deliveries SET status = :status, shipped_at = :at WHERE id = :id")
        .param("status", DeliveryStatus.SHIPPED.name())
        .param("at", shippedAt)
        .param("id", id)
        .update();
  }

  public void markDelivered(long id, OffsetDateTime deliveredAt) {
    jdbcClient
        .sql("UPDATE deliveries SET status = :status, delivered_at = :at WHERE id = :id")
        .param("status", DeliveryStatus.DELIVERED.name())
        .param("at", deliveredAt)
        .param("id", id)
        .update();
  }

  private static Delivery map(ResultSet rs, int rowNum) throws SQLException {
    return new Delivery(
        rs.getLong("id"),
        rs.getLong("order_id"),
        DeliveryStatus.valueOf(rs.getString("status")),
        Money.won(rs.getLong("fee")),
        rs.getObject("created_at", OffsetDateTime.class),
        rs.getObject("shipped_at", OffsetDateTime.class),
        rs.getObject("delivered_at", OffsetDateTime.class));
  }
}
