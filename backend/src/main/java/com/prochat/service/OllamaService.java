package com.prochat.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.json.JSONObject;
import org.springframework.stereotype.Service;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

@Service
public class OllamaService {

    private static final String OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
    private static final String OLLAMA_MODEL = "llama3";

    // OkHttpClient configured for local Ollama inference
    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(180, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    public String askAI(String question) {
        if (question == null || question.trim().isEmpty()) {
            return "Please provide a valid question or topic.";
        }

        // Dedicated local Ollama (Llama 3) call
        try {
            return askOllama(question);
        } catch (Exception e) {
            System.err.println("Ollama unavailable (" + e.getMessage() + "). Using VarTalaap fallback engine...");
            return generateIntelligentFallback(question);
        }
    }

    public String summarizeDocument(String fileName, String contentText) {
        String prompt = "You are an intelligent document analyzer for VarTalaap.\n"
                + "Document Name: " + fileName + "\n"
                + "Document Content:\n" + contentText + "\n\n"
                + "Provide a professional summary formatted as follows:\n"
                + "Topics: <Key topics separated by commas>\n"
                + "Summary: <Concise 2-3 sentence overview>";
        return askAI(prompt);
    }

    public String askDocumentQuestion(String fileName, String contentText, String userQuestion) {
        String prompt = "You are an intelligent assistant for VarTalaap analyzing document: " + fileName + "\n"
                + "Document Text:\n" + contentText + "\n\n"
                + "User Question: " + userQuestion + "\n\n"
                + "Answer accurately based on the document text above.";
        return askAI(prompt);
    }

    public String checkContextMisalignment(String messageText, String activeMode) {
        if (messageText == null || activeMode == null) return null;
        String lowerMsg = messageText.toLowerCase();
        if ("WORK".equalsIgnoreCase(activeMode)) {
            if (lowerMsg.contains("party") || lowerMsg.contains("movie tonight") || lowerMsg.contains("hangout bro") || lowerMsg.contains("pub")) {
                return "⚠️ Context Warning: This message appears casual/personal for Work mode.";
            }
        } else if ("CASUAL".equalsIgnoreCase(activeMode)) {
            if (lowerMsg.contains("dbms_notes.pdf") || lowerMsg.contains("sprint deliverable") || lowerMsg.contains("client deadline")) {
                return "⚠️ Context Warning: This message appears work/study related for Casual mode.";
            }
        }
        return null;
    }

    public String detectConflict(String newMessage, List<String> recentMessages) {
        if (newMessage == null || recentMessages == null) return null;
        String lowerNew = newMessage.toLowerCase();
        for (String old : recentMessages) {
            String lowerOld = old.toLowerCase();
            if ((lowerOld.contains("pm") || lowerOld.contains("am") || lowerOld.contains("clock"))
                    && (lowerNew.contains("pm") || lowerNew.contains("am") || lowerNew.contains("clock"))) {
                if (!lowerOld.equals(lowerNew)) {
                    return "⚠️ Conflict Detected: Conflicting times mentioned (" + old + " vs " + newMessage + ")";
                }
            }
        }
        return null;
    }

    private String askOllama(String question) throws Exception {
        JSONObject body = new JSONObject();
        body.put("model", OLLAMA_MODEL);
        body.put("prompt", question);
        body.put("stream", false);

        JSONObject options = new JSONObject();
        options.put("num_predict", 150);
        body.put("options", options);

        Request request = new Request.Builder()
                .url(OLLAMA_URL)
                .post(RequestBody.create(
                        body.toString(),
                        MediaType.parse("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new RuntimeException("Ollama HTTP " + response.code());
            }

            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(response.body().byteStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }

            JSONObject json = new JSONObject(sb.toString());
            return json.getString("response").trim();
        }
    }

    public String generateIntelligentFallback(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return "VarTalaap AI: Hello! How can I assist you today?";
        }

        // 1. Document Summarization
        if (prompt.contains("intelligent document analyzer for VarTalaap") || (prompt.contains("Document Name:") && prompt.contains("Document Content:"))) {
            return fallbackSummarize(prompt);
        }

        // 2. Document Q&A
        if (prompt.contains("analyzing document:") && prompt.contains("User Question:")) {
            return fallbackDocumentQA(prompt);
        }

        // 3. Decision Memory Q&A
        if (prompt.contains("project decisions memory:") || prompt.contains("Known Decisions Memory:")) {
            return fallbackDecisionQA(prompt);
        }

        // 4. General AI Assistant Chat
        return fallbackGeneralChat(prompt);
    }

    private String fallbackSummarize(String prompt) {
        String fileName = "Document";
        String content = "";
        try {
            int nameStart = prompt.indexOf("Document Name:");
            int contentStart = prompt.indexOf("Document Content:");
            int formatStart = prompt.indexOf("Provide a professional summary");
            if (nameStart != -1 && contentStart != -1) {
                fileName = prompt.substring(nameStart + "Document Name:".length(), contentStart).trim();
            }
            if (contentStart != -1) {
                if (formatStart != -1 && formatStart > contentStart) {
                    content = prompt.substring(contentStart + "Document Content:".length(), formatStart).trim();
                } else {
                    content = prompt.substring(contentStart + "Document Content:".length()).trim();
                }
            }
        } catch (Exception e) {
            content = prompt;
        }

        List<String> topics = extractKeywords(content + " " + fileName, 4);
        String topicList = topics.isEmpty() ? "Documentation, VarTalaap Workspace, Specifications" : String.join(", ", topics);

        String summarySentences = extractKeySentences(content, 2);
        if (summarySentences.isEmpty()) {
            summarySentences = "This document contains workspace materials and project communication specifications for " + fileName + ".";
        }

        return "Topics: " + topicList + "\nSummary: Overview for " + fileName + ": " + summarySentences;
    }

    private String fallbackDocumentQA(String prompt) {
        String fileName = "document";
        String content = "";
        String question = "";
        try {
            int nameStart = prompt.indexOf("analyzing document:");
            int textStart = prompt.indexOf("Document Text:");
            int qStart = prompt.indexOf("User Question:");
            int endStart = prompt.indexOf("Answer accurately based on");

            if (nameStart != -1 && textStart != -1) {
                fileName = prompt.substring(nameStart + "analyzing document:".length(), textStart).trim();
            }
            if (textStart != -1 && qStart != -1) {
                content = prompt.substring(textStart + "Document Text:".length(), qStart).trim();
            }
            if (qStart != -1) {
                if (endStart != -1 && endStart > qStart) {
                    question = prompt.substring(qStart + "User Question:".length(), endStart).trim();
                } else {
                    question = prompt.substring(qStart + "User Question:".length()).trim();
                }
            }
        } catch (Exception e) {
            question = prompt;
        }

        String matchedSentence = findBestMatchingSentence(content, question);
        if (matchedSentence != null && !matchedSentence.trim().isEmpty()) {
            return "Based on " + fileName + ": \"" + matchedSentence + "\"";
        }

        String overview = extractKeySentences(content, 1);
        if (overview.isEmpty()) {
            overview = "The document contains configuration and reference records.";
        }
        return "According to " + fileName + ", direct query matches for \"" + question + "\" were not found. Key context: " + overview;
    }

    private String fallbackDecisionQA(String prompt) {
        String question = "";
        String memory = "";
        try {
            int memStart = prompt.indexOf("Known Decisions Memory:");
            int qStart = prompt.indexOf("Question:");
            if (memStart != -1 && qStart != -1) {
                memory = prompt.substring(memStart, qStart).trim();
                question = prompt.substring(qStart + "Question:".length()).trim();
            } else {
                question = prompt;
            }
        } catch (Exception e) {
            question = prompt;
        }

        if (memory.isEmpty() || !memory.contains("- Topic:")) {
            return "No previous decisions have been logged in the Decision Memory yet. You can log one in the Decisions tab.";
        }

        String[] lines = memory.split("\n");
        List<String> matched = new ArrayList<>();
        String[] qWords = question.toLowerCase().split("\\W+");

        for (String line : lines) {
            if (!line.startsWith("- Topic:")) continue;
            String lowerLine = line.toLowerCase();
            for (String w : qWords) {
                if (w.length() > 3 && lowerLine.contains(w)) {
                    matched.add(line);
                    break;
                }
            }
        }

        if (!matched.isEmpty()) {
            StringBuilder sb = new StringBuilder("Found matching project decision records:\n");
            for (String m : matched) {
                sb.append(m).append("\n");
            }
            return sb.toString().trim();
        }

        StringBuilder sb = new StringBuilder("No specific match for \"" + question + "\". Recent logged decisions:\n");
        int count = 0;
        for (String line : lines) {
            if (line.startsWith("- Topic:") && count < 3) {
                sb.append(line).append("\n");
                count++;
            }
        }
        return sb.toString().trim();
    }

    private String fallbackGeneralChat(String question) {
        if (question == null || question.trim().isEmpty()) {
            return "Hello! I am VarTalaap AI. How can I assist you today?";
        }
        String q = question.trim().toLowerCase();

        if (q.matches(".*\\b(hi|hello|hey|hola|greetings)\\b.*")) {
            return "Hello! 👋 I am VarTalaap AI Assistant (powered by Ollama). How can I assist you with your messages, team decisions, or documents?";
        }
        if (q.contains("who are you") || q.contains("what are you") || q.contains("your name")) {
            return "I am VarTalaap AI Assistant, powered by local Ollama (Llama 3).";
        }
        if (q.contains("what is vartalaap") || q.contains("about vartalaap")) {
            return "VarTalaap is an enterprise real-time collaboration workspace designed to eliminate context switching and message overload. It features mode-based messaging (Casual, Work, Emergency, AI), document Q&A, automated decision memory, and smart reminders.";
        }
        if (q.contains("features") || q.contains("help") || q.contains("capabilities") || q.contains("what can you do")) {
            return "VarTalaap features include:\n"
                    + "• 🔀 Multi-Mode Channels: Casual, Work, Emergency, and AI modes\n"
                    + "• 📄 Document Intelligence: Instant summarization & deep Q&A on uploads\n"
                    + "• 🧠 Decision Memory: Track, log, and search team decisions with audit history\n"
                    + "• ⚠️ Real-Time Protections: Conflict detection and mode misalignment warnings\n"
                    + "• ⏰ Smart Reminders: Automated background task & meeting reminders\n"
                    + "• 🔐 OTP & Profile Security: Password reset & role management";
        }
        if (q.contains("mode") || q.contains("casual") || q.contains("work") || q.contains("emergency")) {
            return "VarTalaap provides 4 distinct modes:\n"
                    + "1. Casual: Informal team chat.\n"
                    + "2. Work: Professional tasks, deliverables, and architecture updates.\n"
                    + "3. Emergency: High-priority alerts broadcast with visual urgency.\n"
                    + "4. AI: Interactive AI chat companion powered by Ollama.";
        }
        if (q.contains("thank") || q.contains("thanks")) {
            return "You're very welcome! Let me know if there's anything else you need.";
        }
        if (q.contains("bye") || q.contains("goodbye")) {
            return "Goodbye! Have a great day.";
        }

        return "VarTalaap AI: I processed your query: \"" + question.trim() + "\".\n\n"
                + "💡 Note: To enable live Llama 3 generative responses, please start your local Ollama server: `ollama serve` and `ollama run llama3`.";
    }

    private List<String> extractKeywords(String text, int maxKeywords) {
        if (text == null) return Collections.emptyList();
        Set<String> stopWords = new HashSet<>(Arrays.asList(
                "the", "and", "is", "in", "to", "of", "a", "for", "with", "on", "as", "at", "by", "an",
                "be", "this", "that", "from", "or", "are", "was", "we", "it", "you", "your", "can", "have",
                "has", "document", "content", "title", "text", "file", "null", "type", "name"
        ));

        String[] tokens = text.toLowerCase().replaceAll("[^a-zA-Z0-9\\s]", " ").split("\\s+");
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String token : tokens) {
            token = token.trim();
            if (token.length() > 3 && !stopWords.contains(token)) {
                counts.put(token, counts.getOrDefault(token, 0) + 1);
            }
        }

        List<Map.Entry<String, Integer>> list = new ArrayList<>(counts.entrySet());
        list.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        List<String> result = new ArrayList<>();
        for (int i = 0; i < Math.min(maxKeywords, list.size()); i++) {
            String word = list.get(i).getKey();
            result.add(Character.toUpperCase(word.charAt(0)) + word.substring(1));
        }
        return result;
    }

    private String extractKeySentences(String text, int count) {
        if (text == null || text.trim().isEmpty()) return "";
        String[] sentences = text.split("(?<=[.!?])\\s+");
        StringBuilder sb = new StringBuilder();
        int added = 0;
        for (String s : sentences) {
            String trimmed = s.trim();
            if (trimmed.length() > 20 && !trimmed.toLowerCase().startsWith("document title:")) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(trimmed);
                added++;
                if (added >= count) break;
            }
        }
        return sb.toString();
    }

    private String findBestMatchingSentence(String content, String question) {
        if (content == null || question == null) return null;
        String[] qWords = question.toLowerCase().replaceAll("[^a-zA-Z0-9\\s]", " ").split("\\s+");
        Set<String> searchWords = new HashSet<>();
        Set<String> stopWords = new HashSet<>(Arrays.asList(
                "what", "when", "where", "which", "who", "whom", "whose", "why", "how", "is", "are", "the", "a", "an", "in", "on", "to"
        ));
        for (String w : qWords) {
            if (w.length() > 2 && !stopWords.contains(w)) {
                searchWords.add(w);
            }
        }

        String[] sentences = content.split("(?<=[.!?\\n])\\s+");
        String bestSentence = null;
        int maxMatches = 0;

        for (String s : sentences) {
            String lower = s.toLowerCase();
            int matches = 0;
            for (String sw : searchWords) {
                if (lower.contains(sw)) {
                    matches++;
                }
            }
            if (matches > maxMatches) {
                maxMatches = matches;
                bestSentence = s.trim();
            }
        }
        return bestSentence;
    }
}
