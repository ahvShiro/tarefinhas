package br.com.shiroshima.backend.models;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** How hard a MainTask is. Harder tasks come first in the suggestions. JSON: "easy", "medium", "hard", as in the frontend. */
public enum Effort {
    EASY,
    MEDIUM,
    HARD;

    public static final Effort DEFAULT = MEDIUM;

    @JsonValue
    public String json() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static Effort fromJson(String value) {
        for (Effort effort : values()) {
            if (effort.json().equals(value)) return effort;
        }
        throw new IllegalArgumentException("Unknown effort: " + value);
    }
}
