package com.example.shop.repository;

import com.example.shop.common.money.Money;
import com.example.shop.domain.Order;
import com.example.shop.domain.OrderLine;
import com.example.shop.domain.OrderStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class OrderRepository {

  private static final String SELECT_ORDER =
      """
      SELECT id, member_id, status, product_amount, delivery_fee, total_amount,
             created_at, paid_at, expired_at
      FROM orders
      """;

  private static final String SELECT_LINE =
      "SELECT id, order_id, product_name, unit_price, quantity FROM order_lines";

  private final JdbcClient jdbcClient;

  public OrderRepository(JdbcClient jdbcClient) {
    this.jdbcClient = jdbcClient;
  }

  public List<Order> findAll() {
    Map<Long, List<OrderLine>> linesByOrder =
        jdbcClient.sql(SELECT_LINE + " ORDER BY id").query(LineRow::map).list().stream()
            .collect(
                Collectors.groupingBy(
                    LineRow::orderId, Collectors.mapping(LineRow::line, Collectors.toList())));
    return jdbcClient.sql(SELECT_ORDER + " ORDER BY id DESC").query(OrderRow::map).list().stream()
        .map(row -> row.toOrder(linesByOrder.getOrDefault(row.id(), List.of())))
        .toList();
  }

  public Optional<Order> findById(long id) {
    return jdbcClient
        .sql(SELECT_ORDER + " WHERE id = :id")
        .param("id", id)
        .query(OrderRow::map)
        .optional()
        .map(row -> row.toOrder(findLines(id)));
  }

  /** 주문과 주문 상품을 저장하고 새 주문 ID 를 돌려준다. */
  public long insert(
      long memberId,
      Money productAmount,
      Money deliveryFee,
      Money totalAmount,
      OffsetDateTime createdAt,
      List<OrderLine> lines) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcClient
        .sql(
            """
            INSERT INTO orders (member_id, status, product_amount, delivery_fee, total_amount,
                                created_at)
            VALUES (:memberId, :status, :productAmount, :deliveryFee, :totalAmount, :createdAt)
            """)
        .param("memberId", memberId)
        .param("status", OrderStatus.PENDING_PAYMENT.name())
        .param("productAmount", productAmount.value())
        .param("deliveryFee", deliveryFee.value())
        .param("totalAmount", totalAmount.value())
        .param("createdAt", createdAt)
        .update(keyHolder);
    long orderId = keyHolder.getKeyAs(Long.class);
    for (OrderLine line : lines) {
      jdbcClient
          .sql(
              """
              INSERT INTO order_lines (order_id, product_name, unit_price, quantity)
              VALUES (:orderId, :productName, :unitPrice, :quantity)
              """)
          .param("orderId", orderId)
          .param("productName", line.productName())
          .param("unitPrice", line.unitPrice().value())
          .param("quantity", line.quantity())
          .update();
    }
    return orderId;
  }

  public List<Order> findByStatus(OrderStatus status) {
    return jdbcClient
        .sql(SELECT_ORDER + " WHERE status = :status ORDER BY id")
        .param("status", status.name())
        .query(OrderRow::map)
        .list()
        .stream()
        .map(row -> row.toOrder(List.of()))
        .toList();
  }

  /** 결제 대기 주문만 결제 완료로 바꾼다. 바꾼 행 수를 돌려준다. */
  public int markPaid(long id, OffsetDateTime paidAt) {
    return updatePending(id, OrderStatus.PAID, "paid_at", paidAt);
  }

  /** 결제 대기 주문만 만료로 바꾼다. 바꾼 행 수를 돌려준다. */
  public int markExpired(long id, OffsetDateTime expiredAt) {
    return updatePending(id, OrderStatus.EXPIRED, "expired_at", expiredAt);
  }

  private int updatePending(long id, OrderStatus status, String timeColumn, OffsetDateTime at) {
    return jdbcClient
        .sql(
            "UPDATE orders SET status = :status, "
                + timeColumn
                + " = :at WHERE id = :id AND status = :pending")
        .param("status", status.name())
        .param("at", at)
        .param("id", id)
        .param("pending", OrderStatus.PENDING_PAYMENT.name())
        .update();
  }

  private List<OrderLine> findLines(long orderId) {
    return jdbcClient
        .sql(SELECT_LINE + " WHERE order_id = :orderId ORDER BY id")
        .param("orderId", orderId)
        .query(LineRow::map)
        .list()
        .stream()
        .map(LineRow::line)
        .toList();
  }

  private record OrderRow(
      long id,
      long memberId,
      OrderStatus status,
      Money productAmount,
      Money deliveryFee,
      Money totalAmount,
      OffsetDateTime createdAt,
      OffsetDateTime paidAt,
      OffsetDateTime expiredAt) {

    static OrderRow map(ResultSet rs, int rowNum) throws SQLException {
      return new OrderRow(
          rs.getLong("id"),
          rs.getLong("member_id"),
          OrderStatus.valueOf(rs.getString("status")),
          Money.won(rs.getLong("product_amount")),
          Money.won(rs.getLong("delivery_fee")),
          Money.won(rs.getLong("total_amount")),
          rs.getObject("created_at", OffsetDateTime.class),
          rs.getObject("paid_at", OffsetDateTime.class),
          rs.getObject("expired_at", OffsetDateTime.class));
    }

    Order toOrder(List<OrderLine> lines) {
      return new Order(
          id,
          memberId,
          status,
          productAmount,
          deliveryFee,
          totalAmount,
          createdAt,
          paidAt,
          expiredAt,
          lines);
    }
  }

  private record LineRow(long orderId, OrderLine line) {

    static LineRow map(ResultSet rs, int rowNum) throws SQLException {
      return new LineRow(
          rs.getLong("order_id"),
          new OrderLine(
              rs.getLong("id"),
              rs.getString("product_name"),
              Money.won(rs.getLong("unit_price")),
              rs.getInt("quantity")));
    }
  }
}
