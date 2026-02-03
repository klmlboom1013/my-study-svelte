# 화면 상세 분석: Chatbot (AI Assistant)

이 문서는 `Chatbot` 화면의 기능, 데이터 요청 로직, 그리고 UI 상호작용을 상세히 기술합니다.

## 1. 개요 (Overview)

**Chatbot**은 Google Gemini AI (gemini-flash-latest)를 기반으로 사용자에게 프로젝트 관련 질의응답 및 코딩 가이드를 제공하는 대화형 인터페이스입니다.
프로젝트의 전반적인 컨텍스트(`PROJECT_CONTEXT`)를 인지하고 있어, 단순한 일반 대화가 아닌 프로젝트 맞춤형 답변을 제공합니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. 주요 기능

* **AI 대화**: 사용자의 질문에 대해 Gemini AI가 답변을 생성합니다.
* **Context Awareness**: 프로젝트 설정, 규칙, 데이터 구조 등 사전 정의된 컨텍스트를 기반으로 답변합니다.
* **Rate Limiting**: 과도한 사용을 방지하기 위해 분당 요청 횟수를 제한합니다 (서버 사이드).
* **Feedback UI**: 로딩 상태(Thinking...), 에러 메시지 등을 시각적으로 제공합니다.

### 2.2. API Contract

* **Endpoint**: `POST /api/chat`
* **Request Body**:

  ```json
  {
    "message": "사용자 질문 내용",
    "history": [
      { "role": "user", "parts": [{ "text": "이전 질문" }] },
      { "role": "model", "parts": [{ "text": "이전 답변" }] }
      // ... 대화 내역
    ]
  }
  ```

* **Response**:
  * **Success (200)**: `{ "response": "AI 답변 텍스트" }`
  * **Rate Limit Exceeded (429)**: `{ "error": "Too many requests..." }`
  * **Server Error (500)**: `{ "error": "Error message" }`

### 2.3. 상세 로직 및 상호작용 (Detailed Logic & Interaction)

* **메시지 전송 프로세스**:
  1. 사용자가 메시지를 입력하고 `Send` 버튼(또는 Enter)을 클릭합니다.
  2. UI에 사용자 메시지가 즉시 '말풍선'으로 추가됩니다.
  3. UI는 `Thinking...` 로딩 상태로 전환되며 입력을 비활성화합니다.
  4. `/api/chat`으로 현재 메시지와 이전 `chatHistory`를 전송합니다.
  5. 응답 수신 시, AI의 답변을 새로운 말풍선으로 추가하고 로딩 상태를 해제합니다.
  6. 채팅 영역 최하단으로 자동 스크롤(`smooth`)됩니다.

* **에러 핸들링**:
  * **429 (Too Many Requests)**: "이용량이 많아 잠시 제한되었습니다. 1분 뒤 다시 시도해주세요." 메시지를 표시합니다.
  * **기타 에러**: 일반적인 오류 안내 메시지를 표시합니다.

* **데이터 생명주기 (Lifecycle)**:
  * **Chat History**: 현재 세션(페이지 접속) 동안만 메모리에 유지됩니다. 페이지를 새로고침하거나 이동하면 대화 내역은 초기화됩니다. (`localStorage` 미사용)

### 2.4. UI Components

* **Header**: 기능 타이틀과 AI 모델 정보(Gemini 1.5 Flash)를 표시합니다.
* **Chat Area**: 대화 내역이 표시되는 스크롤 영역입니다.
  * **Empty State**: 대화가 없을 때 초기 환영 메시지와 아이콘을 중앙에 표시합니다.
  * **Bubbles**: User(오른쪽/Indigo), Model(왼쪽/White)로 구분된 말풍선 디자인을 적용합니다.
* **Input Area**: 다중 라인 입력이 가능한 `textarea`와 전송 버튼을 포함합니다. 입력 내용에 따라 높이가 자동 조절되지는 않지만 최대 높이 제한이 있습니다.

---

## 3. 설정 및 제약 (Settings & Constraints)

* **활성화 제어**: `Settings > Interface` 메뉴의 **Chatbot** 토글을 통해 사이드바 메뉴 진입점을 제어할 수 있습니다.
* **모델 설정**: 서버 사이드에서 `gemini-flash-latest` 모델을 사용하도록 고정되어 있습니다.
* **Rate Limit**: 서버 메모리(`requests` 배열)를 사용하여 최근 1분간의 요청 타임스탬프를 관리하며, 최대 15회로 제한합니다.
