package com.example.shop.dto.staff;

import com.example.shop.domain.Role;
import jakarta.validation.constraints.NotNull;

public record StaffRoleChangeRequest(@NotNull Role role) {}
