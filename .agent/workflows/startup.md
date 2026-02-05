---
description: IDE Startup Checklist Automation
---

// turbo-all

This workflow executes the startup routine defined in the project's checklist.

작업 진행 중 내 승인(accept)가 필요한 것 중 개인정보 또는 보안관련 사항이 아니면 알아서 판단하고 진행해줘

1. **언어 설정.**

- agent대화는 한국어를 기본 언어로 세팅 한다.
- agent가 작성하는 task, implemantation plan, walkthrough 한국어로 작성해서 보여준다.

1. **github 동기화.**
  "git fetch -p" 명령어를 수행하고 업데이트 사항이 있는 확인 후 "git pull" 명령어를 실행여부를 물어본다 (y/n)

- y: origin remote repository 버전으로 동기화를 진행한다.
- n: origin remote repository 버전으로 동기화를 진행하지 않는다.

1. **package.json 변경사항 확인.**
  package.json 파일이 변경된 경우 모듈 설치 또는 업데이트 진행 여부를 물어본다 (y/n)

- y: 추가 또는 변경된 모듈을 설치한다.
- n: 추가 또는 변경된 모듈을 설치하지 않는다.

1. **프로젝트 소스코드 오류 체크.**
  프로젝트 소스코드 변경사항이 있으면 "npm run check" 진행 여부를 물어본다. (y/n)

- y: 프로젝트 소스코드 오류를 체크한다.
- n: 프로젝트 소스코드 오류를 체크하지 않는다.
