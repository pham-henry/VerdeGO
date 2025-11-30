package com.verdego.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/hello-world")
    public ResponseEntity<Map<String, String>> helloWorld() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello World");
        response.put("status", "Service is running");
        return ResponseEntity.ok(response);
    }
}


