package com.prochat.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.prochat.model.FileMessage;
public interface FileMessageRepository extends JpaRepository<FileMessage, Long> {
    
}
