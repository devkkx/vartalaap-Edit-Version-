package com.prochat.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.json.JSONArray;
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
    private static final String GEMINI_API_KEY = "AIzaSyAKqx-4R5gSCYHUbwAg4bbDYxmKAYUDu0M";
    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY;

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    public String askAI(String question) throws Exception {
        // Try local Ollama first
        try {
            return askOllama(question);
        } catch (Exception e) {
            System.err.println("Local Ollama failed (" + e.getMessage() + "), attempting Gemini API fallback...");
            try {
                return askGemini(question);
            } catch (Exception geminiEx) {
                System.err.println("Gemini API fallback failed: " + geminiEx.getMessage());
                throw new RuntimeException("AI services unavailable. Local Ollama: " + e.getMessage() + "; Gemini API: " + geminiEx.getMessage());
            }
        }
    }

    public String summarizeDocument(String fileName, String contentText) throws Exception {
        String prompt = "You are an intelligent document analyzer for VarTalaap.\n"
                + "Document Name: " + fileName + "\n"
                + "Document Content:\n" + contentText + "\n\n"
                + "Provide a professional summary formatted as follows:\n"
                + "Topics: <Key topics separated by commas>\n"
                + "Summary: <Concise 2-3 sentence overview>";
        return askAI(prompt);
    }

    public String askDocumentQuestion(String fileName, String contentText, String userQuestion) throws Exception {
        String prompt = "You are an intelligent assistant for VarTalaap analyzing document: " + fileName + "\n"
                + "Document Text:\n" + contentText + "\n\n"
                + "User Question: " + userQuestion + "\n\n"
                + "Answer accurately based on the document text above.";
        return askAI(prompt);
    }

    public String checkContextMisalignment(String messageText, String activeMode) {
        // Quick rule checks
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
        return null; // aligned
    }

    public String detectConflict(String newMessage, List<String> recentMessages) {
        String lowerNew = newMessage.toLowerCase();
        for (String old : recentMessages) {
            String lowerOld = old.toLowerCase();
            // Check time conflicts e.g. 4 PM vs 5 PM or different days
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
        body.put("model", "llama3");
        body.put("prompt", question);
        body.put("stream", false);

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

    private String askGemini(String question) throws Exception {
        JSONObject textPart = new JSONObject();
        textPart.put("text", question);
        JSONArray partsArray = new JSONArray();
        partsArray.put(textPart);
        JSONObject contentObject = new JSONObject();
        contentObject.put("parts", partsArray);
        JSONArray contentsArray = new JSONArray();
        contentsArray.put(contentObject);
        JSONObject body = new JSONObject();
        body.put("contents", contentsArray);

        Request request = new Request.Builder()
                .url(GEMINI_URL)
                .post(RequestBody.create(
                        body.toString(),
                        MediaType.parse("application/json")))
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new RuntimeException("Gemini HTTP " + response.code());
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
            return json.getJSONArray("candidates")
                    .getJSONObject(0)
                    .getJSONObject("content")
                    .getJSONArray("parts")
                    .getJSONObject(0)
                    .getString("text")
                    .trim();
        }
    }
}
