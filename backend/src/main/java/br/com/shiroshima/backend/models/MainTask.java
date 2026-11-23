package br.com.shiroshima.backend.models;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "main_tasks")
@Getter
@Setter
@NoArgsConstructor
public class MainTask {

    public static final int MIN_DEADLINE_DAYS = 1;
    public static final int MAX_DEADLINE_DAYS = 7;

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    /** Days after createdAt. Null when the task has no deadline. */
    private Integer deadlineDays;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private Instant createdAt;
}
