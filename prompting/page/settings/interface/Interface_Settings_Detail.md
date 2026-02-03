# Interface Settings (인터페이스 설정)

## 1. 개요 (Overview)

**Interface Settings**는 사용자의 작업 환경(Workspace)을 개인화하기 위한 설정 기능을 제공합니다. 사이드바 메뉴의 표시 여부와 대시보드 위젯의 구성을 사용자의 필요에 따라 커스터마이징할 수 있습니다.

이 설정은 `settingsStore`의 `interface` 객체에 저장되며, 변경 즉시 UI에 반응적으로 반영됩니다.

---

## 2. 상세 명세 (Detailed Specifications)

### 2.1. 데이터 스키마 (Data Schema)

Interface 설정은 크게 `Sidebar`와 `Dashboard` 두 가지 영역으로 구분됩니다. 모든 설정의 **기본값(Default)은 `true`**입니다.

```typescript
interface InterfaceSettings {
    sidebar: {
        showReport: boolean;
        showIssue: boolean;
        showTestSuite: boolean;
        showEndpoint: boolean;
        showCollections: boolean;
        showCategories: boolean;
        showChatbot: boolean;
    };
    dashboard: {
        showStats: boolean;
        showRecentActivity: boolean;
    };
    bookmarks: BookmarkSetting[]; // 북마크 통합 관리
    starredEndpointIds: string[]; // 즐겨찾기 Endpoint ID 목록
}

interface BookmarkSetting {
    id: string;          // e.g., 'api-categories'
    name: string;
    icon: string;
    path: string;
    isEnabled: boolean;  // 활성화 여부
    showNewButton: boolean; // 목록 헤더의 'New' 버튼 표시 여부
    listLimit: number;   // 목록 표시 개수 제한 (0: Unlimited)
}
```

### 2.2. 설정 항목 (Configuration Options)

#### 2.2.1. Sidebar Menu (사이드바 메뉴)

사이드바의 각 메뉴 항목을 토글 스위치(Checkbox)로 제어합니다.

* **Report**: 테스트 결과 및 리포트 메뉴
* **Issue**: 이슈 트래킹 메뉴
* **Test Suite**: 테스트 케이스 모음 메뉴
* **Endpoint**: API 엔드포인트 관리 메뉴
* **Collections**: 엔드포인트 컬렉션 메뉴
* **Categories**: 카테고리 분류 메뉴
* **Chatbot**: 챗봇 어시스턴트 메뉴

#### 2.2.2. Dashboard Widgets (대시보드 위젯)

메인 대시보드 화면에 노출될 정보 섹션을 제어합니다.

* **Stats**: 전체 프로젝트의 통계 요약 (Endpoint 수, 테스트 성공률 등)
* **Recent Activity**: 최근 수행한 작업 및 변경 이력 로그

#### 2.2.3. Dashboard Bookmarks (북마크 설정)

대시보드 하단에 표시되는 바로가기(Bookmark) 리스트의 동작을 설정합니다.

* **표시 여부 (Show)**: 각 북마크 섹션(Categories, Collections, Favorites 등)의 노출 여부 제어.
* **항목 수 제한 (List Limit)**: 리스트에 표시될 최대 아이템 개수 지정.
* **New 버튼**: 각 섹션 헤더에 '새로 만들기(+)' 버튼 노출 여부.

### 2.3. 상세 로직 및 상호작용 (Detailed Logic & Interaction)

* **실시간 반영 (Reactivity)**:
  * 사용자가 토글을 클릭하거나 Limit을 변경하는 순간 `updateBookmark` 함수가 호출되며, `settingsStore`가 업데이트됩니다.
  * Svelte의 Store 구독 메커니즘에 의해, 별도의 저장 버튼 클릭 없이 즉시 사이드바나 대시보드 UI가 갱신됩니다.

* **데이터 영속성 (Data Persistence)**:
  * **Local Storage Key**: `settings_store` (Path: `root.interface`)
  * **Google Drive Sync**: `settings.json`
    * `settingsStore`가 전체 동기화될 때 함께 저장됩니다.
  * 브라우저를 새로고침하거나 재접속하더라도 설정 상태가 유지됩니다.

* **UI 표현**:
  * **Toggle Switch**: `ON(Blue)` / `OFF(Gray)` 상태로 시각화됩니다.
  * **Label Formatting**: 내부 키(key) 값(예: `showRecentActivity`)에서 접두어 `show`를 제거하고, 남은 문자열(예: `RecentActivity`)을 라벨로 표시합니다.
  * **Input Number**: List Limit 설정 시 숫자 입력 필드를 제공합니다.
