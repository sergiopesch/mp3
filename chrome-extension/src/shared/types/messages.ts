/**
 * Message types for communication between popup, content scripts, and service worker
 */

export type MessageType =
  | 'EXTRACT_AUDIO'
  | 'DOWNLOAD_AUDIO'
  | 'GET_HISTORY'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'CLEAR_HISTORY'
  | 'CHECK_BACKEND'
  | 'START_BACKEND';

export interface ExtractAudioRequest {
  type: 'EXTRACT_AUDIO';
  url: string;
}

export interface ExtractAudioResponse {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export interface DownloadAudioRequest {
  type: 'DOWNLOAD_AUDIO';
  downloadUrl: string;
  filename: string;
}

export interface DownloadAudioResponse {
  success: boolean;
  downloadId?: number;
  error?: string;
}

export interface GetHistoryRequest {
  type: 'GET_HISTORY';
}

export interface GetHistoryResponse {
  history: import('./storage').HistoryItem[];
}

export interface GetSettingsRequest {
  type: 'GET_SETTINGS';
}

export interface GetSettingsResponse {
  settings: import('./storage').Settings;
}

export interface UpdateSettingsRequest {
  type: 'UPDATE_SETTINGS';
  settings: Partial<import('./storage').Settings>;
}

export interface UpdateSettingsResponse {
  success: boolean;
}

export interface ClearHistoryRequest {
  type: 'CLEAR_HISTORY';
}

export interface ClearHistoryResponse {
  success: boolean;
}

export interface CheckBackendRequest {
  type: 'CHECK_BACKEND';
}

export interface CheckBackendResponse {
  running: boolean;
}

export interface StartBackendRequest {
  type: 'START_BACKEND';
}

export interface StartBackendResponse {
  success: boolean;
  error?: string;
}

export type Message =
  | ExtractAudioRequest
  | DownloadAudioRequest
  | GetHistoryRequest
  | GetSettingsRequest
  | UpdateSettingsRequest
  | ClearHistoryRequest
  | CheckBackendRequest
  | StartBackendRequest;

export type MessageResponse<T extends Message> =
  T extends ExtractAudioRequest ? ExtractAudioResponse :
  T extends DownloadAudioRequest ? DownloadAudioResponse :
  T extends GetHistoryRequest ? GetHistoryResponse :
  T extends GetSettingsRequest ? GetSettingsResponse :
  T extends UpdateSettingsRequest ? UpdateSettingsResponse :
  T extends ClearHistoryRequest ? ClearHistoryResponse :
  T extends CheckBackendRequest ? CheckBackendResponse :
  T extends StartBackendRequest ? StartBackendResponse :
  never;
