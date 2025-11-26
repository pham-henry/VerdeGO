package com.verdego.api.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class JwtConfig {

    @Value("${verdego.jwt.secret}")
    private String secret;

    @Value("${verdego.jwt.access-exp-min}")
    private Long accessExpirationMinutes;

    @Value("${verdego.jwt.refresh-exp-days}")
    private Long refreshExpirationDays;
}

