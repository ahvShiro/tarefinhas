package br.com.shiroshima.backend.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import br.com.shiroshima.backend.models.MiniTask;

public interface MiniTaskRepository extends JpaRepository<MiniTask, UUID> {

    /** All miniTasks with their MainTask in a single query, grouped by MainTask in step order. */
    @Query("""
            select miniTask from MiniTask miniTask
            join fetch miniTask.mainTask mainTask
            order by mainTask.createdAt, mainTask.id, miniTask.position
            """)
    List<MiniTask> findAllWithMainTask();
}
