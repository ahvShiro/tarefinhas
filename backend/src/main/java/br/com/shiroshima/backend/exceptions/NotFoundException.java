package br.com.shiroshima.backend.exceptions;

/** The item does not exist, was deleted, or belongs to another user (404). Same answer for all, so ids do not leak. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
