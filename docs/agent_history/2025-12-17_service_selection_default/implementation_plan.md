# Service Selection Default Value Update

## Goal Description
Update the service selection dropdown on the login page to default to an empty value with a "선택해 주세요" (Please select) placeholder, as requested in the updated prompt `prompt/3_로그인페이지_구현.md`.

## User Review Required
None.

## Proposed Changes

### Login Page
#### [MODIFY] [src/routes/login/+page.svelte](file:///Users/hyunseung/projects/git/klmlboom1013/repository/my-study-svelte/src/routes/login/+page.svelte)
- Change initialization of `service` state variable from `SERVICE_OPTIONS[1]` to `""` (empty string).
- Update the `placeholder` attribute of the `DropdownInput` component for "Service Selection" from "서비스를 선택하거나 입력하세요" to "선택해 주세요".

## Verification Plan
### Manual Verification
- Verify that `service` defaults to an empty string.
- Verify that the placeholder text is displayed correctly as "선택해 주세요".
