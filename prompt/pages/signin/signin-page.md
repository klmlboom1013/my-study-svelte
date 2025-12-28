<aside>
💡

로그인 페이지 구성 및 각 요소들의 이벤트 처리 방법을 정의 한다.

- markup 파일 참고
 - prompt/markup/signin.html (기본 signin 페이지)

</aside>

## Page 

### UI 구성 요소 중 사용자 입력 필수
- required가 true면 사용자 입력이 필수 이다.

### default value set.
- localStorage key "sign-in-page"가 없으면 form의 input 태그의 default value를 빈값으로 세팅 한다.
- localStorage key "sign-in-page"가 있으면
  - "sign-in-page" value(JSON)의 isSaveCache가 true면 value(JSON)의 key value로 form의 input 태그의 default value를 세팅 한다.
  - "sign-in-page" value(JSON)의 isSaveCache가 false면 value(JSON)의 key value로 form의 input 태그의 default value를 빈값으로 세팅 한다.
    - localStorage key "sign-in-page" 을 제거 한다.

## UI 구성

### Server 선택
- name: server
- required: true
- radio button value set: prompt/constants/wpayServerType.md 의 SERVER_TYPES 참고. (`중복 선택 불가`)
- change event:
  - PROD면: "WPAY Production Domain" Modal Open.
  - PROD가 아니면:
    - "Server Environment" 문구 오른쪽 추가된 문구를 제거 한다.
    - input name "prodDomain" value를 빈값으로 설정 한다.
- click event: 
  - server value가 이미 PROD로 설정된 상태에서 PROD 버튼을 클릭하면 "WPAY Production Domain" Modal Open 한다.

### "WPAY Production Domain" Modal.
- name: prodDomain
- required: false (` "server" value가 PROD 이면 true 이다.`)
- radio button value set: prompt/constants/wpayServerType.md 의 PROD_SERVER_DOMAINS 참고. (`중복 선택 불가`)
- change event: 
  - Server 선택 영역 "Server Environment" 문구 오른쪽에 (inpput name "prodDomain" value)를 표시 한다.
  - prodDomain이 선택 되면 모달을 닫는다.
  

### Service 선택
- name: service
- required: true
- dropdownInput > ul > li set: prompt/constants/wpayServerType.md 의 SERVICE_OPTIONS 참고. (`중복 선택 불가`)

### Site 선택
- name: site
- required: true
- dropdownInput > ul > li set: prompt/constants/wpayServerType.md 의 SITE_OPTIONS 참고. (`중복 선택 불가`)

### Merchant ID 선택.
- name: mid
- required: true
- dropdownInput > ul > li set: prompt/constants/wpayServerType.md 의 MERCHANT_ID_OPTIONS 참고. (`중복 선택 불가`)

### Member ID 입력.
- name: userId
- required: false

### Cell Phone Number 입력.
- name: hNum
- required: false
- input type: number
- input event: 복사한 문자열을 붙여 넣기 할 경우 숫자를 제외한 문자를 제거한다.

### isSaveCache Check Box.
- name: isSaveCache
- required: false

### Next Button.
- name: nextButton
- text: Next
- 버튼 활성화 조건
  - service, server, site, mid 값이 모두 선택 되었을 때.
  - click Event
    - userId가 빈값인 경우: "wpayTestUser01"로 설정 한다.
    - hNum 값이 없을 때: Signup 진행. (prompt/pages/signin/features/signup.md 참고)
    - hNum 값이 있을 때: Signin STEP1 진행. (prompt/pages/signin/features/signin-step1.md 참고)
    - localStorage 입력 정보 저장.
      - key: sign-in-page
      - value: JSON.stringify({
        service: service value,
        server: server value,
        prodDomain: prodDomain value,
        site: site value,
        mid: mid value,
        userId: userId value,
        hNum: hNum value,
        isSaveCache: isSaveCache isChecked(true or false)
      })
- 버튼 비활성화
  - service, server, site, mid 중 하나라도 선택 되지 않았을 때.
  - Mouse Over
    - 입력 또는 선택이 필요한 영역을 표시 한다.
    - radio button 의 경우 radio button 의 테두리 색상을 변경 한다.
    - 마우스가 Next Button 영역을 벗어나면 원래 스타일로 돌아온다.
  - Touch (모바일 환경)
    - 입력 또는 선택이 필요한 영역을 표시 한다.
    - radio button 의 경우 radio button 의 테두리 색상을 변경 한다.
    - 2초 뒤 원래 스타일로 서서히(2초동안) 돌아온다.
