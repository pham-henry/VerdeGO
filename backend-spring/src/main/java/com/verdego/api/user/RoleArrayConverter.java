package com.verdego.api.user;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Converter
public class RoleArrayConverter implements AttributeConverter<List<Role>, String[]> {

    @Override
    public String[] convertToDatabaseColumn(List<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return new String[0];
        }
        return roles.stream()
                .map(Enum::name)
                .toArray(String[]::new);
    }

    @Override
    public List<Role> convertToEntityAttribute(String[] dbData) {
        if (dbData == null || dbData.length == 0) {
            return List.of(Role.USER);
        }
        return Arrays.stream(dbData)
                .map(Role::valueOf)
                .collect(Collectors.toList());
    }
}

