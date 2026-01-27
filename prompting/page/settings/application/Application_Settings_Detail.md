# 화면 상세 분석: Endpoint Parameters (설정 관리) - Application Settings

이 문서는 `Settings` 화면의 **Application** 탭에서 제공하는 기능, 데이터 구조, 그리고 UI 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

**Application Settings**는 테스트 대상이 되는 애플리케이션(예: WPAY)의 메타데이터와 환경별 도메인 정보를 정의하는 곳입니다. 또한, 복잡한 서비스 구조를 가진 앱을 위해 'Service' 및 'Site' 단위를 관리하는 기능을 포함합니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. Application Configuration (애플리케이션 설정)

* **애플리케이션 등록/수정**: 앱 이름(ID), 설명 등 기본 정보를 관리합니다.
* **환경별 도메인 관리**: DEV(개발), STG(스테이지), GLB(글로벌), KS(한국), FC(기능검증) 등 각 환경에 맞는 API 도메인을 설정합니다.
* **Service Distinction (서비스 구분)**:
  * **OFF (단일 서비스)**: 앱이 단일 서비스로 구성된 경우입니다. 도메인 설정은 '앱' 레벨에서 관리됩니다.
  * **ON (다중 서비스)**: 앱 하위에 여러 서비스(예: `wpaystd`, `wpaymembership`)가 존재하는 경우입니다. 이 경우 도메인 설정은 각 **Service** 레벨에서 개별적으로 관리됩니다.
* **데이터 활용**: 등록된 애플리케이션은 **User Profile**에서 사용자가 '내 애플리케이션'을 선택할 때 Master Data로 활용됩니다.

#### 2.1.1. 데이터 필드 (Schema: Application)

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| **App Name** | String | Y | 애플리케이션 식별자 (예: `WPAY`) |
| **Description** | String | N | 애플리케이션 설명 |
| **Service Distinction** | Boolean | N | 서비스 단위 구분 여부 (Default: `false`) |
| **Domains** | Object | N | 환경별 도메인 URL (Distinction OFF 시 사용) |
| **Services** | Array | N | 하위 서비스 목록 (Distinction ON 시 사용) |

### 2.2. 상세 로직 및 상호작용 (Detailed Logic & Interaction)

#### 2.2.1. Application 관리 로직

* **유효성 검사 (Validation)**:
  * **Required Fields**: `App Name`은 필수 항목입니다.
  * **Service Distinction Rules**: 기능 활성화(`ON`) 시, **최소 1개 이상의 서비스**가 정의되어야 하며, 정의된 모든 서비스는 `Name`을 필수적으로 가져야 합니다. 위반 시 저장 버튼 클릭 시 에러 알림(`Error Alert`)이 표시됩니다.
* **도메인 환경 설정 (Fixed Environment Keys)**:
  * 시스템은 다음 5가지 고정된 환경 키를 관리합니다. 이 키들은 코드 레벨에서 고정되어 있으며 UI에서 추가/삭제할 수 없습니다.
  * `dev` (Development), `stg` (Staging), `pGlb` (Production Global), `pKs` (Production KS), `pFc` (Production FC).
* **입력 편의성**:
  * **App Name Suggestion**: `App Name` 입력 시 사전 정의된 추천 목록(`WPAY`, `Express`, `Smart`, `sbuckwpay`)이 자동 완성(Datalist)으로 제공됩니다.
  * **Free Text Input**: 추천 목록 외의 임의의 애플리케이션 이름도 자유롭게 입력 가능합니다.
* **삭제 프로세스**:
  * 애플리케이션 삭제 시 실수 방지를 위해 **AlertModal**을 통한 확인 절차를 거칩니다.

### 2.3. 데이터 영속성 (Data Persistence)

* **Local Storage Key**: `settings_store`
  * 데이터는 `localStorage`의 `settings_store` 키에 JSON 문자열로 저장됩니다.
* **JSON Data Path**:
  * Application 목록: `root.applications`
* **Google Drive Sync**:
  * FileName: `settings.json`
  * Structure: `settingsStore` 객체 전체가 그대로 JSON 파일로 저장됩니다.
