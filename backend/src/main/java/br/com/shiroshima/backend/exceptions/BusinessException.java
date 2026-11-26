package br.com.shiroshima.backend.exceptions;

import lombok.Getter;

/** Business rule broken by the request (400). Points to the form field with the problem. */
@Getter
public class BusinessException extends RuntimeException {

    private final String field;

    public BusinessException(String field, String message) {
        super(message);
        this.field = field;
    }
}
