/**
 * Type declarations for Expo modules that might be missing proper TypeScript definitions
 */

declare module 'expo-image-manipulator' {
  export enum SaveFormat {
    JPEG = 'jpeg',
    PNG = 'png',
    WEBP = 'webp'
  }

  export interface ImageResult {
    uri: string;
    width: number;
    height: number;
  }

  export type ImageManipulationResult = ImageResult;

  export interface ImageManipulatorOptions {
    compress?: number;
    format?: SaveFormat;
    base64?: boolean;
  }

  export interface ResizeAction {
    resize: {
      width?: number;
      height?: number;
    }
  }

  export type Action = ResizeAction;

  export function manipulateAsync(
    uri: string,
    actions: Action[],
    options?: ImageManipulatorOptions
  ): Promise<ImageManipulationResult>;
}

declare module 'expo-file-system' {
  export interface FileInfo {
    exists: boolean;
    isDirectory?: boolean;
    modificationTime?: number;
    size?: number;
    uri?: string;
    md5?: string;
  }

  export function getInfoAsync(
    fileUri: string,
    options?: {
      md5?: boolean;
      size?: boolean;
    }
  ): Promise<FileInfo>;

  export const documentDirectory: string;
  export const cacheDirectory: string;
} 