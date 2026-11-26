package br.com.shiroshima.backend.models;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import org.hibernate.annotations.SQLRestriction;

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
// Soft delete: rows with deleted_at stay in the database but no query sees them.
@SQLRestriction("deleted_at is null")
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

    /** HH:00 for the hour slot, or an exact time like 13:23. Only set when scheduledDate is set. */
    private LocalTime scheduledTime;

    @Column(nullable = false)
    private Instant createdAt;

    /** When it was checked as done. Null while it is not done. */
    private Instant doneAt;

    /** When it was deleted. Null while it exists. */
    private Instant deletedAt;

    public boolean isInTaskBank() {
        return scheduledDate == null;
    }
}
