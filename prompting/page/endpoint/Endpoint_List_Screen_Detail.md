# 화면 상세 분석: Endpoint List Screen

이 문서는 **Endpoint List** 화면(`src/routes/(app)/endpoint/+page.svelte`)의 UI 구성, 기능, 그리고 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

* **목적**: 등록된 API Endpoint 목록을 조회, 검색, 관리(생성/삭제)하고, 바로 실행(Execute)할 수 있는 진입점(Dashboard) 역할을 합니다.
* **주요 기능**:
  * Endpoint 검색 및 필터링 (Name, URI, Method, Category, Collection)
  * Application별 그룹핑 뷰 (WPAY 전용)
  * Google Drive 백업 및 복구 (Sync)
  * Endpoint 실행(Execute), 즐겨찾기(Bookmark), 삭제(Delete)
  * Global Lock 및 Read-only 모드 지원

## 2. 화면 구성 (UI Structure)

### 2.1. Header Area

* **Breadcrumbs**: 상단에 현재 위치 경로 표시 (예: Home > API Categories > Test Endpoint). `category` 또는 `collection` 파라미터 유무에 따라 경로가 동적으로 변경됨.

| 요소 | 설명 | 비고 |
| :--- | :--- | :--- |
| **Title** | "Endpoints" | |
| **Description** | "Manage your API endpoints and configurations." | |
| **New Endpoint** | 새 Endpoint 생성 화면(`/endpoint/new`)으로 이동하는 버튼 | `Global Lock` 상태이거나 `readonly` 모드일 경우 숨김 처리됨. Mobile에서는 하단/상단 배치 차이 있음. |
| **Sync Buttons** | **Backup**: 현재 Endpoint 데이터를 Google Drive에 저장<br>**Restore**: Google Drive에서 데이터를 불러와 로컬 덮어쓰기 | `Global Lock` 상태이거나 `readonly` 모드일 경우 비활성화됨. |

### 2.2. Search & Filter Bar

* **Search Input**:
  * 대상 필드: Endpoint Name, URI, Method
  * 동작: 입력 즉시 필터링 (Client-side filtering)
  * URL 연동: `q` 쿼리 파라미터와 양방향 동기화
* **Filters**:
  * **Application Filter** (Global Header 연동): 상단 글로벌 헤더의 Application 선택에 따라 목록이 필터링됩니다 (`app` 파라미터).
  * **Category Filter**: URL `category` 파라미터가 있을 경우 해당 카테고리의 Endpoint만 표시.
  * **Collection Filter**: URL `collection` 파라미터가 있을 경우 해당 컬렉션에 포함된 Endpoint만 표시.

### 2.3. List View (보기 방식)

목록은 **Application Filter**의 값에 따라 **Grouping View**와 **Flat Grid View**로 자동 전환됩니다.

#### 2.3.1. Grouping View (Application = "WPAY")

* **조건**: 선택된 Application이 `WPAY`(대소문자 무관)인 경우.
* **구조**: `Service` 단위로 섹션을 구분하여 표시 (Accordion UI).
* **Interaction**: 섹션 헤더 클릭 시 접기/펼치기 토글.

#### 2.3.2. Flat Grid View (그 외)

* **조건**: Application이 "All"이거나 "WPAY"가 아닌 경우.
* **구조**: 그룹 없이 3열 그리드(반응형)로 카드 나열.

## 3. 기능 명세 (Detailed Specifications)

### 3.1. Endpoint Card (Item)

각 Endpoint는 카드 형태의 UI로 표현됩니다.

* **Header Badges**:
  * Application Name (예: `WPAY`, `Smartro`)
  * Method (예: `POST`, `GET`)
  * Request Type (예: `REST`, `FORM`)
* **Actions (Hover/Mobile Display)**:
  * 모바일에서는 항상 표시, 데스크탑에서는 Hover 시 표시.
  * **Execute (Play Icon)**: 해당 Endpoint의 실행 모달(`EndpointExecutionModal`)을 엽니다.
  * **Delete (Trash Icon)**: 삭제 확인 알림(`AlertModal`) 호출 후 삭제합니다. (`Global Lock` 또는 `readonly` 상태 시 숨김)
* **Content**:
  * **Name**: Endpoint 이름 (클릭 시 상세 페이지 `/endpoint/[id]` 이동)
  * **URI**: 경로 표시 (Truncated)
* **Footer Info**:
  * **Service**: 소속 서비스 (Scope)
  * **Site**: 소속 사이트 (Scope)
  * **Bookmark (Star Icon)**: 우측 하단에 위치. 클릭하여 즐겨찾기(Favorites) 등록/해제 토글.

### 3.2. Google Drive Sync (Backup & Restore)

* **Authentication**:
  * Google 로그인 상태가 아닐 경우, 버튼 클릭 시 로그인 팝업을 호출합니다.
  * Access Token 만료 시(401 Error), 재로그인 및 재시도 프롬프트를 표시합니다.
* **Backup**:
  * `driveService.saveEndpoints` 호출. 저장 위치: Google Drive App Data Folder.
* **Restore**:
  * `driveService.loadEndpoints` 호출. 로컬 데이터를 덮어쓰기 전 사용자 확인(`confirm`)을 거칩니다.

### 3.3. Empty State

* 검색 결과가 없거나 등록된 Endpoint가 없을 경우, 안내 문구와 "Create new endpoint" 링크를 중앙에 표시합니다.

## 4. 데이터 및 로직 (Data & Logic)

* **Source of Truth**: `endpointService` (LocalStorage 기반)
* **State Management**:
  * `endpoints`: 전체 데이터 목록
  * `searchTerm`, `filterApp`: 필터링 상태 (URL Query Params와 동기화)
  * `collapsedServices`: 접혀있는 서비스 그룹 상태 관리 (Set 구조)
  * `isReadOnly`, `$appStateStore.isPageLocked`: 편집/삭제/동기화 기능 제한 여부
