# 화면 상세 분석: Settings - API Collections (컬렉션 관리)

이 문서는 `Settings` 화면의 **API Collections** 탭에서 제공하는 기능, 데이터 구조, 그리고 UI 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

**API Collections**는 여러 API 엔드포인트를 비즈니스 로직이나 시나리오 순서대로 묶어서 실행할 수 있는 **Flow**를 관리합니다. 단순한 폴더링을 넘어, 각 단계(Step)별로 데이터를 주고받으며 연속적인 테스팅이 가능한 시나리오를 정의합니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. 주요 기능

* **시나리오 정의**: 논리적 순서(Flow)를 가진 테스트 시나리오를 생성합니다.
* **Flow Builder**: 각 단계를 시각적으로 구성하고, 엔드포인트 간의 데이터 매핑(Request/Response Mapping)을 설정합니다.
* **실행 및 검증**: 정의된 컬렉션을 원클릭으로 실행하고, 전체 트랜잭션의 성공 여부를 검증합니다.
* **북마크**: 자주 사용하는 컬렉션을 북마크하여 빠르게 접근할 수 있습니다.

### 2.2. 데이터 필드 (Schema: ApiCollection)

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| **id** | UUID | Y | 고유 식별자 |
| **Application** | String | Y | 대상 애플리케이션 |
| **Service** | `Array<String>` | N | 적용될 서비스 목록 |
| **Name** | String | Y | 컬렉션 명 (예: `카드 결제 전체 시나리오`) |
| **Description** | String | N | 시나리오 설명 |
| **Icon** | String | N | 식별 아이콘 |
| **Color** | String | N | 식별 색상 |
| **Steps** | `CollectionStep[]` | Y | 시나리오 단계 목록 (Ordered List) |
| **Bookmark** | Boolean | N | 북마크 여부 |

### 2.3. 데이터 구조 상세: CollectionStep

컬렉션 내의 각 단계는 다음과 같은 구조를 가집니다.

```typescript
interface CollectionStep {
    id: string;          // Step ID
    endpointId: string;  // 실행할 Endpoint ID
    order: number;       // 실행 순서 (1-based)
    // 매핑 및 변수 로직은 Flow Builder 상세 문서 참조
}
```

### 2.4. 상세 로직 및 상호작용 (Interaction)

* **Filtering Logic**:
  * **Application/Service Filter**: 다른 설정과 동일하게 헤더 및 서비스 필터의 영향을 받습니다.
* **Edit Mode**:
  * 컬렉션의 메타데이터(이름, 설명 등)는 리스트에서 바로 수정 가능하거나 간단한 모달로 처리합니다.
  * **Steps 구성**은 별도의 **Flow Builder** 화면(`settings/collections/[id]`)으로 진입하여 수행합니다.

### 2.5. 데이터 영속성 (Data Persistence)

* **Local Storage Key**: `api_collections`
  * **주의**: `settings_store`가 아닌 **독립된 키(`api_collections`)**를 사용합니다.
  * **대용량 데이터 가능성**: Flow Step 정보가 포함되므로 데이터 크기가 클 수 있어 분리 저장합니다.
* **Google Drive Sync**:
  * FileName: `api_collections.json`
  * 별도의 파일로 백업/동기화됩니다.
