export interface ImageMetadata {
  id: number;
  filename: string;
  filepath: string;
  file_size: number;
  file_type: string;
  width: number;
  height: number;
  camera_make: string | null;
  camera_model: string | null;
  date_taken: string | null;
  iso: number | null;
  shutter_speed: string | null;
  aperture: number | null;
  focal_length: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  created_at: string;
}

export interface FilterParams {
  q: string;
  cameraModel: string;
  hasGps: string; // 'all' | 'true' | 'false'
  dateFrom: string;
  dateTo: string;
}

export interface StegoChannelInfo {
  lsb_entropy: number;
  channel_entropy: number;
  ones_ratio: number;
}

export interface StegoEntropyResult {
  suspected: boolean;
  channels: Record<string, StegoChannelInfo>;
}

export interface StegoTrailingDataResult {
  has_trailing_data: boolean;
  length: number;
  preview: string | null;
  is_text: boolean;
}

export interface StegoAnalysisResponse {
  image_id: number;
  status: 'clean' | 'suspected' | 'detected';
  trailing_data: StegoTrailingDataResult;
  entropy: StegoEntropyResult;
}

export interface StegoDecodeRequest {
  mode: 'lsb' | 'eof';
  channels?: string;
  num_bits?: number;
  stop_marker?: string;
}

export interface StegoDecodeResponse {
  success: boolean;
  detail?: string;
  mode?: 'lsb' | 'eof';
  length?: number;
  is_text?: boolean;
  text?: string;
  payload_hex?: string;
}

