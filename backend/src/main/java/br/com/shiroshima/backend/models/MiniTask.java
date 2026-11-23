package br.com.shiroshima.backend.models;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "mini_tasks")
@Getter
@Setter
@NoArgsConstructor
public class MiniTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "main_task_id", nullable = false)
    private MainTask mainTask;

    @Column(nullable = false)
    private String text;

    /** Step order inside the MainTask (spec: ordem). */
    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean done;

    @Column(nullable = false)
    private boolean inProgress;

    /** Local date. Null while the miniTask is in the task bank. */
    private LocalDate scheduledDate;

    /** Whole hour (HH:00). Only set when scheduledDate is set. */
    private LocalTime scheduledTime;

    @Column(nullable = false)
    private Instant createdAt;

    public boolean isInTaskBank() {
        return scheduledDate == null;
    }
}
