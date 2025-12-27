<aside>
💡

로그인 페이지 구성 및 각 요소들의 이벤트 처리 방법을 정의 한다.

</aside>

## UI Style
- ../UI STYLE.md 참고
- UI 구성 요소 중 사용자 입력 필수
  - required가 true면 사용자 입력이 필수 이다.
  - 페이지 UI Section에 노출되는 이름 옆에 "*" 를 표시하고 "*" 색상은 red 계열로 하여 강조 한다.

## UI 구성

### label default value set.
- localStorage key "sign-in-page" value가 있는지 확인한다.
- localStorage key "sign-in-page" value(JSON)가 있으면
  - isSaveCache가 true면 각 label의 default value를 세팅 한다.
  - isSaveCache이 없거나 true가 아니면 각 label의 default value를 빈값으로 세팅 한다.

### Service 선택 영역
- label: service (`페이지에는 "Service" 문구로 표시한다.`)
- required: true
- DropdownInput
  - placeholder: "선택해 주세요"
  - values: wpayServerType.md > SERVICE_OPTIONS 참고. (`중복 선택 불가`)

### Server 선택 영역
- label: server (`페이지에는 "Server" 문구로 표시한다.`)
- required: true
- Radio Button (`Variant: Box`)
  - values: wpayServerType.md > SERVER_TYPES 참고. (`중복 선택 불가`)
  - click event
    - PROD 
      - PROD-Domain Modal 오픈.
    - DEV, STG 
      - Server* 문구 오른쪽에 "(선택한 PROD_SERVER_DOMAINS)" 문구를 제거 한다.
      - PROD-Domain 값을 빈값으로 변경 한다.
  
### PROD Domain Modal
- label: prodDomain (`페이지에는 "PROD Domain" 문구로 표시한다.`)
- required: false (`Server 선택 영역 Radio Button 값이 PROD로 선택 했을 때 true`)
- Radio Button (`Variant: Box`)
  - values: wpayServerType.ts > PROD_SERVER_DOMAINS 참고. (`중복 선택 불가`)
  - click event
    - PROD-Domain 값이 설정 되면 Server* 문구 오른쪽에 "(선택한 PROD_SERVER_DOMAINS)" 문구를 표시 한다.
    - PROD-Domain 값을 localStorage에 저장 한다.
  
### Site 선택 영역
- label: site (`페이지에는 "Site" 문구로 표시한다.`)
- required: true
- DropdownInput
  - placeholder: "선택해 주세요"
  - values: wpayServerType.ts > SITE_OPTIONS 참고. (`중복 선택 불가`)

### Merchant ID 선택 영역.
- label: mid (`페이지에는 "Merchant ID" 문구로 표시한다.`)
- required: true
- DropdownInput
  - placeholder: "선택해 주세요"
  - values: wpayServerType.ts > MERCHANT_ID_OPTIONS 참고. (`중복 선택 불가`)

### Member ID 입력 영역.
- label: userId (`페이지에는 "Member ID" 문구로 표시한다.`)
- required: false
- text Input
  - placeholder: "wpayTestUser01"

### Cell Phone Number 입력 영역.
- label: hNum (`페이지에는 "Cell Phone Number" 문구로 표시한다.`)
- required: false
- number Input
  - placeholder: "입력해 주세요."
  - value: 복사한 문자열을 붙여 넣기 할 경우 숫자를 제외한 문자를 제거한다.

### isSaveCache Check Box 영역.
- label: isSaveCache (`페이지에는 "isSaveCache"문구 대신 체크박스 오른쪽에 "Should I save to cache?" 문구로 표시한다.`)
- required: false
- Check Box
  - true: 체크 박스를 체크 한다.
  - false: 체크 박스를 체크하지 않는다.

### Next Button 영역.
- label: nextButton
- text: Next
- 버튼 활성화
  - label service, server, site, mid 값이 모두 선택 되었을 때.
  - Click Event
    - label userId가 빈값인 경우: "wpayTestUser01"로 설정 한다.
    - Sign-up 진행.
      - hNum 값이 없을 때.
      - ./features/signup.md 참고
    - Sign-in STEP 진행.
      - hNum 값이 있을 때.
      - ./features/signin-step01.md 참고
    - localStorage 입력 정보 저장.
      - key: sign-in-page 
      - value: JSON.stringify({
        service: label:service 값,
        server: label:server 값,
        prodDomain: label:prodDomain 값,
        site: label:site 값,
        mid: label:mid 값,
        userId: label:userId 값,
        hNum: label:hNum 값,
        isSaveCache: label:isSaveCache 값
      })
- 버튼 비활성화
  - label [service, server, site, mid] 중 선택 되지 않은 값이 있을 때.
  - Mouse Over
    - 입력 또는 선택이 필요한 영역을 표시 한다.
    - radio button 의 경우 radio button 의 테두리 색상을 변경 한다.
    - 마우스가 Next Button 영역을 벗어나면 원래 스타일로 돌아온다.
  - Touch (모바일 환경)
    - 입력 또는 선택이 필요한 영역을 표시 한다.
    - radio button 의 경우 radio button 의 테두리 색상을 변경 한다.
    - 2초 뒤 원래 스타일로 서서히(2초동안) 돌아온다.
