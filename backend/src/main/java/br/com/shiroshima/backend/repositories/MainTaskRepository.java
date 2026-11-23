package br.com.shiroshima.backend.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.shiroshima.backend.models.MainTask;

public interface MainTaskRepository extends JpaRepository<MainTask, UUID> {

    List<MainTask> findAllByOrderByCreatedAtAsc();
}
