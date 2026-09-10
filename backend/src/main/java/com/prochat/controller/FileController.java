package com.prochat.controller;

import java.io.File;
import java.nio.file.Files;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.prochat.model.FileMessage;
import com.prochat.repository.FileMessageRepository;
import com.prochat.service.OllamaService;

@RestController
@CrossOrigin
public class FileController {

    @Autowired
    private FileMessageRepository fileRepository;

    @Autowired
    private OllamaService ollamaService;

    // ================= GET ALL FILES =================
    @GetMapping("/files")
    public List<FileMessage> getFiles() {
        return fileRepository.findAll();
    }

    // ================= UPLOAD FILE =================
    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Map<String, Object> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("sender") String sender,
            @RequestParam("receiver") String receiver,
            @RequestParam("mode") String mode
    ) {

        Map<String, Object> response = new HashMap<>();

        try {
            String uploadDir = System.getProperty("user.dir") + File.separator + "uploads" + File.separator;
            System.err.println("Upload Directory: " + uploadDir);

            File dir = new File(uploadDir);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            String filePath = uploadDir + fileName;

            file.transferTo(new File(filePath));

            FileMessage msg = new FileMessage();
            msg.setSender(sender);
            msg.setReceiver(receiver);
            msg.setMode(mode);
            msg.setFileName(file.getOriginalFilename());
            msg.setFileType(file.getContentType());
            msg.setFilePath("/uploads/" + fileName);
            msg.setUploadTime(new Timestamp(System.currentTimeMillis()));

            fileRepository.save(msg);

            response.put("success", true);
            response.put("id", msg.getId());
            response.put("sender", sender);
            response.put("receiver", receiver);
            response.put("mode", mode);
            response.put("fileName", file.getOriginalFilename());
            response.put("fileType", file.getContentType());
            response.put("filePath", "/uploads/" + fileName);

            return response;

        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("error", e.getMessage());
            return response;
        }
    }

    // ================= AI DOCUMENT SUMMARIZATION =================
    @PostMapping("/files/{id}/summarize")
    public Map<String, Object> summarizeFile(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        FileMessage fileMsg = fileRepository.findById(id).orElse(null);

        if (fileMsg == null) {
            response.put("success", false);
            response.put("error", "File record not found");
            return response;
        }

        try {
            String fullPath = System.getProperty("user.dir") + fileMsg.getFilePath().replace("/", File.separator);
            File diskFile = new File(fullPath);

            String textContent = "";
            if (diskFile.exists() && diskFile.length() < 2 * 1024 * 1024) {
                try {
                    textContent = new String(Files.readAllBytes(diskFile.toPath()));
                } catch (Exception ex) {
                    textContent = "Document Title: " + fileMsg.getFileName() + ", File Type: " + fileMsg.getFileType();
                }
            } else {
                textContent = "Document Title: " + fileMsg.getFileName() + ", File Type: " + fileMsg.getFileType();
            }

            String summary = ollamaService.summarizeDocument(fileMsg.getFileName(), textContent);

            response.put("success", true);
            response.put("fileName", fileMsg.getFileName());
            response.put("summary", summary);

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }

        return response;
    }

    // ================= AI DOCUMENT Q&A =================
    @PostMapping("/files/{id}/ask")
    public Map<String, Object> askFileQuestion(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();
        String question = payload.get("question");

        FileMessage fileMsg = fileRepository.findById(id).orElse(null);
        if (fileMsg == null) {
            response.put("success", false);
            response.put("error", "File record not found");
            return response;
        }

        try {
            String fullPath = System.getProperty("user.dir") + fileMsg.getFilePath().replace("/", File.separator);
            File diskFile = new File(fullPath);

            String textContent = "";
            if (diskFile.exists() && diskFile.length() < 2 * 1024 * 1024) {
                try {
                    textContent = new String(Files.readAllBytes(diskFile.toPath()));
                } catch (Exception ex) {
                    textContent = "Document Title: " + fileMsg.getFileName() + ", File Type: " + fileMsg.getFileType();
                }
            } else {
                textContent = "Document Title: " + fileMsg.getFileName() + ", File Type: " + fileMsg.getFileType();
            }

            String answer = ollamaService.askDocumentQuestion(fileMsg.getFileName(), textContent, question);

            response.put("success", true);
            response.put("fileName", fileMsg.getFileName());
            response.put("answer", answer);

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }

        return response;
    }
}
