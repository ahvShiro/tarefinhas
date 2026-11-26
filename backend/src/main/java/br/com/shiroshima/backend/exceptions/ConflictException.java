package br.com.shiroshima.backend.exceptions;

/** Request conflicts with saved data (409), e.g. an e-mail that already has an account. */
public class ConflictException extends BusinessException {

    public ConflictException(String field, String message) {
        super(field, message);
    }
}
