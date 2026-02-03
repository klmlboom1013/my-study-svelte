# 화면 상세 분석: Settings - API Categories (카테고리 관리)

이 문서는 `Settings` 화면의 **API Categories** 탭에서 제공하는 기능, 데이터 구조, 그리고 UI 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

**API Categories**는 방대한 API 엔드포인트들을 논리적인 그룹(예: '회원', '결제', '주문')으로 분류하여 관리하기 위한 메타데이터입니다. 각 카테고리는 특정 애플리케이션에 속하며, 시각적인 식별을 위한 아이콘과 색상 정보를 포함합니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. 주요 기능

* **카테고리 정의**: 엔드포인트를 분류할 기준(카테고리)을 생성하고 관리합니다.
* **시각적 식별**: Material Symbol 아이콘과 Hex 색상 코드를 지정하여 대시보드 및 리스트에서 직관적으로 구분할 수 있습니다.
* **북마크**: 자주 사용하는 카테고리를 북마크(`isBookmarked`)하여 대시보드나 사이드바 상단에 고정할 수 있습니다.
* **서비스 매핑 (WPAY)**: WPAY 앱의 경우, 특정 서비스(예: `wpaystd`)에 종속된 카테고리를 정의할 수 있습니다.

### 2.2. 데이터 필드 (Schema: ApiCategory)

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| **id** | UUID | Y | 고유 식별자 (Auto-generated) |
| **Application** | String | Y | 대상 애플리케이션 (예: `WPAY`) |
| **Service** | `Array<String>` | N | 적용될 서비스 목록 (WPAY 등) |
| **Name** | String | Y | 카테고리 명 (예: `Payment Approval`) |
| **Description** | String | N | 카테고리 설명 |
| **Icon** | String | N | Material Symbol 아이콘 이름 (예: `credit_card`) |
| **Color** | String | N | 식별 색상 코드 (예: `#FF5733`) |
| **Bookmark** | Boolean | N | 북마크 여부 (Default: `false`) |

### 2.3. 상세 로직 및 상호작용 (Detailed Logic & Interaction)

* **Filtering Logic**:
  * **Application Filter**: 헤더에서 선택된 Application에 따라 리스트가 필터링됩니다.
  * **Service Filter**: WPAY 앱인 경우, 서비스 필터를 통해 특정 서비스의 카테고리만 조회할 수 있습니다.
* **UI Components**:
  * **Icon Picker**: Material Symbols 목록에서 아이콘을 검색하고 선택할 수 있는 팝업/UI를 제공해야 합니다.
  * **Color Picker**: 프리셋 색상 또는 사용자 지정 색상을 선택할 수 있습니다.

### 2.4. 데이터 영속성 (Data Persistence)

* **Local Storage Key**: `api_categories`
  * **주의**: `settings_store`가 아닌 **독립된 키(`api_categories`)**를 사용합니다.
  * 데이터 양이 많아질 수 있고, 설정(Settings)과는 별도의 메타 데이터 성격이 강하기 때문입니다.
* **Google Drive Sync**:
  * FileName: `api_categories.json`
  * 별도의 파일로 백업 및 복원됩니다.
