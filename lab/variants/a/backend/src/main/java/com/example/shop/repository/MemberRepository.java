package com.example.shop.repository;

import com.example.shop.domain.Member;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MemberRepository {

  private static final String SELECT =
      """
      SELECT id, name, email, grade, status, joined_at, last_login_at, withdrawn_at
      FROM members
      """;

  private final JdbcClient jdbcClient;

  public MemberRepository(JdbcClient jdbcClient) {
    this.jdbcClient = jdbcClient;
  }

  public List<Member> findAll() {
    return jdbcClient.sql(SELECT + " ORDER BY id").query(MemberRepository::map).list();
  }

  public Optional<Member> findById(long id) {
    return jdbcClient
        .sql(SELECT + " WHERE id = :id")
        .param("id", id)
        .query(MemberRepository::map)
        .optional();
  }

  public void updateStatus(long id, MemberStatus status) {
    jdbcClient
        .sql("UPDATE members SET status = :status WHERE id = :id")
        .param("status", status.name())
        .param("id", id)
        .update();
  }

  public void updateGrade(long id, MemberGrade grade) {
    jdbcClient
        .sql("UPDATE members SET grade = :grade WHERE id = :id")
        .param("grade", grade.name())
        .param("id", id)
        .update();
  }

  public void withdraw(long id, OffsetDateTime withdrawnAt) {
    jdbcClient
        .sql("UPDATE members SET status = :status, withdrawn_at = :withdrawnAt WHERE id = :id")
        .param("status", MemberStatus.WITHDRAWN.name())
        .param("withdrawnAt", withdrawnAt)
        .param("id", id)
        .update();
  }

  private static Member map(ResultSet rs, int rowNum) throws SQLException {
    return new Member(
        rs.getLong("id"),
        rs.getString("name"),
        rs.getString("email"),
        MemberGrade.valueOf(rs.getString("grade")),
        MemberStatus.valueOf(rs.getString("status")),
        rs.getObject("joined_at", OffsetDateTime.class),
        rs.getObject("last_login_at", OffsetDateTime.class),
        rs.getObject("withdrawn_at", OffsetDateTime.class));
  }
}
