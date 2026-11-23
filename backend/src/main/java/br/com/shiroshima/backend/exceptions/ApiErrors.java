package br.com.shiroshima.backend.exceptions;

import java.util.Map;

/**
 * Error body of the API: { "errors": { field: message } }, the shape the frontend forms use.
 * Errors that belong to no field (wrong credentials, expired session) use the key {@link #FORM}.
 */
public final class ApiErrors {

    public static final String FORM = "form";

    private ApiErrors() {
    }

    public static Map<String, Map<String, String>> of(Map<String, String> errors) {
        return Map.of("errors", errors);
    }

    public static Map<String, Map<String, String>> of(String field, String message) {
        return of(Map.of(field, message));
    }
}
