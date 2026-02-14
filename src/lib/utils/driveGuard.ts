import { checkDriveConnection, loginWithGoogle } from "$lib/features/auth/services/authService";
import { appStateStore } from "$lib/stores/appStateStore";

/**
 * 전역적으로 구글 드라이브 연동 여부를 확인하고, 연동되지 않은 경우 안내 모달을 표시합니다.
 * @returns 연동되어 있으면 true, 아니면 false
 */
export function ensureDriveConnected(): boolean {
    if (!checkDriveConnection()) {
        appStateStore.update((s) => ({
            ...s,
            globalAlert: {
                title: "Google Drive Connection Required",
                message: "Google Drive is not connected. Please connect your Google account to enable saving changes and ensure your data is backed up.",
                type: "confirm",
                onConfirm: () => {
                    loginWithGoogle().catch(console.error);
                },
            },
        }));
        return false;
    }
    return true;
}
