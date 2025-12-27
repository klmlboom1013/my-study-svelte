<aside>
💡

WPAY 서비스 별 API 호출 및 웹페이지 호출 기본 URL 상수를 정의 한다.
소스 코드: `src/lib/constants/wpayUrls.ts`

</aside>

## Service URL 구조
- Environment (DEV, STG, PROD) 및 Prod Domain (GLB, KS, FC)에 따라 기본 URL이 결정된다.

## SERVICE_URLS
각 서비스 타입에 대한 환경별 Base URL 매핑 정보.

### wpaystd (WPAY 표준 OLD) / wpaypro (WPAY Pro)
- **DEV**: `https://devwpay.inicis.com`
- **STG**: `https://stgwpay.inicis.com`
- **PROD**:
  - `glb` (Global): `https://wpay.inicis.com`
  - `ks` (KSNet): `https://kswpay.inicis.com`
  - `fc` (Finance Center): `https://fcwpay.inicis.com`

---

### wpaystd2 (WPAY 표준 2.0)
- **DEV**: `https://devwpaystd.inicis.com`
- **STG**: `https://stgwpaystd.inicis.com`
- **PROD**:
  - `glb` (Global): `https://wpaystd.inicis.com`
  - `ks` (KSNet): `https://kswpaystd.inicis.com`
  - `fc` (Finance Center): `https://fcwpaystd.inicis.com`

---

### wpayplus (WPAY Plus)
- **DEV**: `https://devwpayplus.inicis.com`
- **STG**: `https://stgwpayplus.inicis.com`
- **PROD**:
  - `glb` (Global): `https://wpayplus.inicis.com`
  - `ks` (KSNet): `https://kswpayplus.inicis.com`
  - `fc` (Finance Center): `https://fcwpayplus.inicis.com`

---

### wpaycst (WPAY Custom)
- **DEV**: `https://devwpaycst.inicis.com`
- **STG**: `https://stgwpaycst.inicis.com`
- **PROD**:
  - `glb` (Global): `https://wpaycst.inicis.com`
  - `ks` (KSNet): `https://kswpaycst.inicis.com`
  - `fc` (Finance Center): `https://fcwpaycst.inicis.com`
