import { toast } from "react-toastify";

let lastToastMessage = "";
let lastToastTime = 0;

export const smartToast = {
    success: (msg) => showUniqueToast(msg, "success"),
    error: (msg) => showUniqueToast(msg, "error"),
    info: (msg) => showUniqueToast(msg, "info"),
    warning: (msg) => showUniqueToast(msg, "warning"),
    };

    function showUniqueToast(message, type) {
    const now = Date.now();

    if (message === lastToastMessage && now - lastToastTime < 2000) {
        return;
    }

    lastToastMessage = message;
    lastToastTime = now;

    toast[type](message);
}
