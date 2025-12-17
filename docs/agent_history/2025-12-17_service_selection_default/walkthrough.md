# 서비스 선택 기본값 업데이트

로그인 페이지의 서비스 선택 항목이 기본적으로 비어 있고 "선택해 주세요"라는 placeholder가 표시되도록 업데이트했습니다.

## 변경 사항

### 로그인 페이지 (`src/routes/login/+page.svelte`)

- **기본값**: `service` 변수의 초기값을 미리 선택된 값에서 빈 문자열 `""`로 변경했습니다.
- **Placeholder**: 드롭다운의 placeholder 텍스트를 "선택해 주세요"로 업데이트했습니다.
- **타입 안전성**: `siteOptions`를 계산할 때 빈 서비스 문자열을 처리할 수 있도록 코드를 추가했습니다.

```svelte
// src/routes/login/+page.svelte

// 상태 (State)
let service = $state(""); // 기존 SERVICE_OPTIONS[1] 에서 변경됨

// ...

// 반응형 옵션 (Reactive Options)
let siteOptions = $derived(
    (service && SERVICE_SITE_MAPPING[service as ServiceType]) || [],
); // 빈 문자열 처리를 위한 로직 추가
```

### 검증 결과

변경으로 인해 타입 오류가 발생하지 않는지 확인하기 위해 `npm run check`를 실행했습니다:

```bash
> svelte-check found 0 errors and 0 warnings
```
