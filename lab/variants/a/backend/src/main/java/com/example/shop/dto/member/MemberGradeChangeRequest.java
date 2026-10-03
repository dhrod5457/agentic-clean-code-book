package com.example.shop.dto.member;

import com.example.shop.domain.MemberGrade;
import jakarta.validation.constraints.NotNull;

public record MemberGradeChangeRequest(@NotNull MemberGrade grade) {}
