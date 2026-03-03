/**
 * Auth service – static API for authentication.
 * All auth API calls go through here. No class instances.
 */
import * as authApi from "../API/auth";

export const signup = authApi.signup;
export const login = authApi.login;
export const verifyEmail = authApi.verifyEmail;
export const forgotPassword = authApi.forgotPassword;
export const resendResetCode = authApi.resendResetCode;
export const verifyResetCode = authApi.verifyResetCode;
export const resetPassword = authApi.resetPassword;

export const getGroups = authApi.getGroups;
export const getMessages = authApi.getMessages;
export const deleteMessage = authApi.deleteMessage;
export const updateMessage = authApi.updateMessage;
