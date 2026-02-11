# 상세 설명: Seed Data Import (데이터 초기 세팅)

## 1. 개요 (Overview)

`Seed Data Import` 기능은 프로젝트의 초기 환경을 빠르게 구축하거나, 테스트를 위한 샘플 데이터를 로컬 저장소(LocalStorage)에 주입하기 위해 사용됩니다. 이 기능은 `src/lib/data/seeds/` 디렉토리에 정의된 표준 JSON 데이터를 기반으로 동작합니다.

---

## 2. 진입 경로 및 실행 방법 (Access & Execution)

### 2.1. 진입 경로

* **메뉴**: Settings (설정) 페이지
* **위치**: 설정 페이지 좌측 **'Categories'** 사이드바의 하단 **`Seed Data`** (아이콘: `auto_fix`) 항목을 클릭합니다.

### 2.2. 실행 옵션 (Scope)

가져올 데이터의 범위를 세 가지 중 하나로 선택할 수 있습니다.

| 옵션 | 명칭 | 설명 | 포함 데이터 |
| :--- | :--- | :--- | :--- |
| **Settings** | Import Settings Only | 어플리케이션의 기본 환경 설정을 로드합니다. | 앱 목록, 글로벌 파라미터, 파라미터 옵션, MID 컨텍스트 등 |
| **Data** | Import Core Data Only | 실제 작업에 필요한 핵심 도메인 데이터를 로드합니다. | 엔드포인트(API), API 카테고리, API 컬렉션 등 |
| **All** | Import Complete Sample Pack | 설정과 데이터를 모두 포함하여 전체 환경을 구축합니다. | 위 모든 항목 포함 (가장 권장됨) |

---

## 3. 데이터 주입 전략 (Import Strategy)

데이터를 임포트할 때 기존 데이터와의 충돌을 처리하는 방식을 결정합니다.

* **Merge Mode (기본값)**:
  * **동작**: 기존 데이터를 유지하면서 새로운 데이터를 추가합니다.
  * **동일 ID 처리**: 동일한 ID를 가진 데이터가 있을 경우에만 시드 데이터로 업데이트(Overwrite)됩니다.
  * **사용 사례**: 사용자의 기존 작업물을 보존하면서 새로운 샘플 API만 추가하고 싶을 때 사용합니다.
* **Overwrite Mode (체크박스 선택 시)**:
  * **동작**: 현재 로컬 저장소에 있는 기존 데이터를 모두 삭제하고 시드 데이터로 완전히 대체합니다.
  * **사용 사례**: 환경이 오염되었거나, 프로젝트를 최초 상태로 완전히 초기화하고 싶을 때 사용합니다. **(주의: 기존 데이터가 영구 삭제됨)**

---

## 4. 데이터 원천 (Data Sources)

임포트되는 데이터는 다음 경로의 파일들을 참조합니다.

* `src/lib/data/seeds/settings.json`: 앱 및 파라미터 설정
* `src/lib/data/seeds/endpoints.json`: API 목록
* `src/lib/data/seeds/apiCategories.json`: 카테고리 정보
* `src/lib/data/seeds/apiCollections.json`: 컬렉션(시나리오) 정보

---

## 5. 기술적 특징 (Technical Notes)

* **저장소**: 모든 데이터는 브라우저의 `localStorage`에 저장되며, `settingsStore`와 `endpointService`를 통해 앱 상태가 실시간으로 동기화됩니다.
* **클라우드 연동**: Google Drive 연동이 활성화된 경우, 임포트 직후 클라우드 백업이 자동으로 트리거됩니다.
* **반영 방식**: Svelte의 Reactive 변수를 사용하므로 임포트 완료 즉시 별도의 새로고침 없이 다른 페이지에서 결과 확인이 가능합니다.
