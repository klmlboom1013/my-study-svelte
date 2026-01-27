# 화면 상세 분석: Endpoint Parameters (설정 관리) - MID Context

이 문서는 `Settings` 화면의 **Endpoint Parameters > MID Context** 탭에서 제공하는 기능, 데이터 구조, 그리고 UI 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

**MID Context**는 결제 및 인증 테스트에 필요한 가맹점 식별 정보 및 보안 키 정보를 관리합니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. 주요 기능 (MID Context)

* **보안 키 관리**: MID별로 매핑된 HashKey, Encryption Key, IV(Initialization Vector)를 관리합니다.
* **검색 및 필터**: WPAY 앱의 경우 다수의 MID가 존재할 수 있으므로, 서비스별 필터링 기능을 제공하여 원하는 MID를 빠르게 찾을 수 있습니다.

### 2.2. 데이터 필드 (Schema)

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| **Application** | String | Y | 가맹점 정보가 속한 애플리케이션 |
| **Service** | `Array<String>` | N | 해당 MID를 사용하는 서비스 목록 |
| **MID** | String | Y | 가맹점 ID (Merchant ID) |
| **Hash Key** | String | N | 위변조 검증용 해시 키 (HMAC 등) |
| **Enc Key** | String | N | 데이터 암호화용 키 (AES, SEED 등) |
| **Enc IV** | String | N | 암호화 초기화 벡터 (Optional) |

### 2.3. 상세 로직 및 상호작용 (Detailed Logic & Interaction)

* **Filtering Logic**:
  * **Application Filter**: MID Context 리스트는 현재 헤더에서 선택된 Application에 따라 필터링되지 **않고**, 탭 내부의 필터링 로직을 따릅니다.
  * **WPAY Service Filter**: Application이 'WPAY'인 경우, 서비스 드롭다운을 통해 특정 서비스의 MID만 필터링하여 볼 수 있습니다.
* **Dynamic UI**:
  * **Service Multi-Select**: Application 선택 값이 'WPAY'일 때만 서비스 선택 필드(MultiSelectBox)가 노출됩니다.
* **Legacy Support**:
  * **Auto-Select All Services**: 기존 데이터(Legacy) 중 서비스 정보가 없는 WPAY MID를 편집할 경우, 자동으로 'All Services'가 선택된 상태로 초기화됩니다.

### 2.4. 데이터 영속성 (Data Persistence)

* **Local Storage Key**: `settings_store`
  * 데이터는 `localStorage`의 `settings_store` 키에 JSON 문자열로 저장됩니다.
* **JSON Data Path**:
  * `root.endpoint_parameters.midContexts` (Array of MidContext objects)
* **Google Drive Sync**:
  * FileName: `settings.json`
  * Structure: `settingsStore` 객체 전체가 그대로 JSON 파일로 저장됩니다.
* **참고 (Dependency)**:
  * MID Context 추가 시 선택 가능한 Application 목록은 `profileStore.myApplications` (Key: `profile`)를 참조합니다.
