# 메인 페이지 레이아웃 명세 (Main Page Layout)

## 1. Overview

애플리케이션의 메인 레이아웃은 **Header**, **Desktop Sidebar**, **Mobile Drawer (Slide Menu)**로 구성됩니다. 사용자의 기기 환경에 따라 반응형으로 동작하며, 공통적인 네비게이션과 상태 관리를 담당합니다.

* **위치**: `src/routes/(app)/+layout.svelte`
* **주요 기능**: 반응형 네비게이션, 사용자 인증 상태 관리, 전역 검색, 알림 및 프로필 관리.
* **컴포넌트 구조**:

    ```text
    +layout.svelte
    ├── Header.svelte (Top Navigation)
    ├── SidebarNav.svelte (Desktop Aside)
    └── Slide Menu (Mobile Drawer Wrapper)
        └── SidebarNav.svelte (Mobile Navigation)
    ```

### 1.1. Global Resources & Theme

* **Fonts**: `Inter` (Google Fonts) 사용.
* **Icons**: `Material Symbols Outlined` (Google Fonts) 사용.
* **Theme Strategy**: Tailwind CSS `dark` mode (class strategy)를 사용하여 다크 모드를 지원합니다. `bg-slate-50` (Light) <-> `dark:bg-background-dark` (Dark) 등 색상 토큰 기반으로 전환됩니다.

---

## 2. Header (`Header.svelte`)

화면 상단에 고정된 네비게이션 바입니다. 로고, 검색, 사용자 컨트롤 기능을 제공합니다.

### 2.1. Left Section

* **Hamburger Button**: 모바일 환경에서만 노출되며, 슬라이드 메뉴(`Drawer`)를 토글합니다.
* **Brand Logo**: 클릭 시 메인 페이지(`/`)로 이동합니다.

### 2.2. Center Section (Search & Filter)

* **Application Dropdown** (`SelectBox`):
  * 사용자가 생성/관리하는 애플리케이션 목록(`profileStore.myApplications`)을 표시합니다.
  * 선택 시 `appStateStore.selectedApp`을 업데이트하고, URL 파라미터 `app`을 설정합니다.
  * 기본값: `All`.
* **Global Search Bar**:
  * **UI**: 둥근 모서리의 입력 필드, 돋보기 아이콘, 닫기(X) 버튼(입력 시 노출).
  * **Placeholder**: "Endpoint search".
  * **동작**:
    * 입력: URL 쿼리 파라미터 `q`를 실시간으로 참조/업데이트합니다.
    * Enter Key: 현재 검색어와 선택된 앱 필터를 가지고 `/endpoint` 페이지로 이동합니다. (이미 해당 페이지면 쿼리만 업데이트).
    * Clear (X): 검색어를 초기화하고 URL에서 `q` 파라미터를 제거합니다.
  * **반응형**: 데스크톱(`md`) 이상에서만 표시됩니다.

### 2.3. Right Section (User Controls)

* **New Endpoint (+)**:
  * 경로: `/endpoint/new` 이동.
  * 특징: 데스크톱 전용(`hidden md:block`), Tooltip("new Endpoint") 제공.
* **History**: 최근 활동 내역 아이콘 (현재 기능 미구현, UI만 존재).
* **Sync Status**:
  * Google Drive 연동 상태를 배지 형태로 표시합니다.
  * **Synced (Green/Blue)**: 연동 완료 및 토큰 유효.
  * **Not Synced**: 연동 안 됨. 클릭 시 로그인 팝업 호출.
* **User Menu**: 프로필 아바타(또는 이니셜 아이콘)를 클릭하여 상세 메뉴를 엽니다. (아래 2.4 참조)

### 2.4. User Menu Detail (`UserMenu.svelte`)

아바타 클릭 시 드롭다운으로 표시되는 상세 메뉴입니다.

1. **App User Info**:
    * **Identity**: `nickname` > `userId` > `Guest` 순서로 표시.
    * **Sync Indicator**:
        * 🟢 **Green**: Google Synced (로그인 + 토큰 유효).
        * 🟠 **Amber**: Sync Paused (로그인 되어있으나 토큰 만료/유실).
        * ⚪ **Slate**: Not Synced.
2. **Google Account Section**:
    * **Linked**: Google 프로필(사진, 이름, 이메일) 표시 및 **Logout** 아이콘(Hover 시) 제공.
    * **Token Expired**: "Reconnect Drive" 버튼 (Amber) - 클릭 시 재인증 시도.
    * **Not Linked**: "Link Google Account" 버튼 - 클릭 시 구글 로그인 시도.
3. **Navigation Links**:
    * **Profile**: `/profile` 페이지로 이동.
    * **Sign Out**: 애플리케이션 로그아웃. `accessToken` 쿠키를 삭제하고 `/signin`으로 이동.

---

## 3. Sidebar (Desktop)

데스크톱 환경(`md` breakpoint 이상)에서 화면 좌측에 고정되는 사이드바입니다.

* **컴포넌트**: `src/lib/components/layout/SidebarNav.svelte`
* **특징**:
  * 스크롤 가능한 독립 영역 (`overflow-y-auto`).
  * `settingsStore`의 설정에 따라 메뉴 아이템의 노출 여부가 제어됩니다.

### 3.1. Primary Navigation

다음 메뉴들은 설정(`Settings > Interface`)에 따라 조건부 렌더링됩니다.

* Report (`/report`)
* Issue (`/issue`)
* Test Suite (`/test-suite`)
* Test Endpoint (`/endpoint`)
* API Collections (`/collections`)
* API Categories (`/categories`)
* Chatbot (`/chatbot`)

### 3.2. API Categories

사용자가 직접 구성한 API 카테고리 목록을 표시하는 영역입니다.

* **현재 상태**: 개발용 샘플 데이터가 표시되고 있습니다.
* **향후 계획**: 사용자가 설정을 통해 카테고리를 추가/수정/삭제할 수 있는 기능을 제공할 예정입니다.
* **UI 구성**: 아이콘, 카테고리 명, 엔드포인트 경로 등을 포함합니다.

---

## 4. Slide Menu (Mobile Drawer)

모바일 환경 또는 화면 크기가 작을 때 활성화되는 슬라이드 메뉴입니다.

* **Trigger**: Header의 햄버거 버튼 클릭 (`isDrawerOpen = true`).
* **Transition**: 왼쪽에서 오른쪽으로 슬라이드 (`fly` transition).
* **Structure**:
  * **Header**: 닫기 버튼 및 로고.
  * **Body**: `SidebarNav` 컴포넌트를 재사용.
    * `showNewButton=true`: 모바일에서는 'New' 버튼이 별도로 노출됨.
    * `allowTextWrap=true`: 텍스트 줄바꿈 허용.
* **Behavior**:
  * 메뉴 아이템 클릭 시 페이지 이동 후 자동으로 닫힘 (`afterNavigate` hook).
  * 백그라운드 클릭 시 닫힘.

---

## 5. Layout Logic & State Management

### 5.1. Authentication & Auto-Restore

* **Auth Check**: `onMount` 시 `accessToken` 쿠키(App Login)를 확인하여 없으면 `/signin`으로 리다이렉트합니다.
* **Auto-Restore**: 로그인 감지 시 `driveService.loadProfile`을 호출하여 Google Drive에서 최신 프로필을 자동으로 복구합니다.
* **Connect Prompt Logic**:
  * App에는 로그인되어 있으나 Google Access Token이 없는 경우(예: 새로고침 후) 사용자에게 **Google 계정 연결 프롬프트**(`AlertModal`)를 표시합니다.
  * 사용자가 '취소'를 누르면 `sessionStorage`에 거절 상태를 저장하여 세션 동안 다시 묻지 않습니다.
* **Error Handling**: 복구 실패(Token 만료 등) 시 `disconnectGoogle()`을 수행하고 재연결을 유도합니다.

### 5.2. Profile Synchronization

* `profileStore`를 구독하여 Header의 사용자 정보(이름, 아바타, 역할)를 실시간으로 업데이트합니다.
* 백업 데이터가 로드되면 UI에 즉시 반영됩니다.

### 5.3. Google Account Integration Detail

Google 계정 연동은 Firebase Auth 및 Google Drive API를 활용하여 구현됩니다.

#### 1. Configuration (`.env`)

프로젝트 루트의 `.env` 파일에 정의된 Firebase 설정을 `import.meta.env`를 통해 로드합니다. (`src/lib/firebase/firebase.ts`)

| Key | Description |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

#### 2. Authentication Flow (`authService.ts`)

* **Provider**: `GoogleAuthProvider` 사용.
* **Scopes**: `https://www.googleapis.com/auth/drive.appdata` (Application Data Folder 접근 권한)을 추가하여 사용자 드라이브의 히든 폴더에 접근합니다.
* **Process**:
    1. `loginWithGoogle()` (`signInWithPopup`) 호출.
    2. 성공 시 반환된 `result`에서 `credential.accessToken` 추출.
    3. `authStore` 업데이트 (`firebaseUser` + `accessToken`).
* **Logout**: `signOut(auth)` 호출 및 `authStore` 초기화.
* **Disconnect**: `authStore`의 `accessToken`만 `null`로 설정하여 재연결을 유도합니다.
  * **Token Validity**: Google OAuth 2.0 Access Token의 유효 기간은 **1시간 (3600초)**입니다.
  * **Expiration Condition**: 발급 시점으로부터 1시간이 경과하여 Google API(Drive) 호출 시 `401 Unauthorized` 에러가 발생할 때.
  * **Error Handling**: `+layout.svelte` 또는 API 호출부에서 `401` 에러를 감지하면 즉시 `disconnectGoogle()`을 실행하고 사용자에게 재연결 프롬프트를 표시합니다.
