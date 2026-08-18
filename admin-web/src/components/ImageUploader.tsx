import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { App, Typography } from 'antd';
import { http } from '../services/request';

const { Text } = Typography;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const COMPRESS_QUALITY = 0.75;
const MAX_DIMENSION = 1920;

const PLUS_ICON_SVG =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
      <rect x="4" y="4" width="72" height="72" rx="12" stroke="#d9d9d9" stroke-width="2" stroke-dasharray="6 3"/>
      <path d="M40 28v24M28 40h24" stroke="#d9d9d9" stroke-width="3" stroke-linecap="round"/>
    </svg>`
  );

type UploaderValue = string | string[] | undefined;

interface ImageUploaderProps {
  value?: UploaderValue;
  onChange?: (url: UploaderValue) => void;
  disabled?: boolean;
  maxCount?: number;
}

const toArr = (v: UploaderValue): string[] => {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return v ? [v] : [];
};

const toEmit = (arr: string[], multi: boolean): UploaderValue => {
  if (multi) return arr;
  return arr[0];
};

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  disabled = false,
  maxCount = 1,
}) => {
  const { message } = App.useApp();
  const multi = maxCount > 1;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewList, setPreviewList] = useState<string[]>(toArr(value));

  useEffect(() => {
    setPreviewList(toArr(value));
  }, [value]);

  const emitChange = useCallback(
    (next: string[]) => {
      setPreviewList(next);
      queueMicrotask(() => {
        onChange?.(toEmit(next, multi));
      });
    },
    [onChange, multi]
  );

  const compressImage = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);

          let { width, height } = img;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const outputType =
            file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality =
            file.size > COMPRESS_THRESHOLD ? COMPRESS_QUALITY : undefined;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () =>
                reject(new Error('FileReader failed'));
              reader.readAsDataURL(blob);
            },
            outputType,
            quality
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Image load failed'));
        };

        img.src = url;
      }),
    []
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        message.error('仅支持 JPG、PNG、WEBP 格式');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        message.error('图片大小不能超过 5MB');
        return;
      }

      const msgKey = 'img_upload';
      try {
        message.loading({ content: '正在压缩图片...', key: msgKey, duration: 0 });
        const dataUrl = await compressImage(file);

        setPreviewList((prev) => {
          if (multi) {
            return [...prev, dataUrl].slice(0, maxCount);
          } else {
            return [dataUrl];
          }
        });

        message.loading({ content: '正在上传图片...', key: msgKey, duration: 0 });
        const result = await http.post<{ url: string }>('/upload', { data: dataUrl });
        const serverUrl = result.url;

        if (multi) {
          let finalList: string[] = [];
          setPreviewList((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0) {
              next[lastIdx] = serverUrl;
            }
            finalList = next.slice(0, maxCount);
            return finalList;
          });
          queueMicrotask(() => {
            onChange?.(toEmit(finalList, multi));
          });
        } else {
          setPreviewList([serverUrl]);
          queueMicrotask(() => {
            onChange?.(toEmit([serverUrl], multi));
          });
        }

        message.success({ content: '图片上传成功', key: msgKey });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误';
        setPreviewList((prev) => {
          if (multi) {
            return prev.slice(0, -1);
          } else {
            return [];
          }
        });
        message.error({ content: `图片上传失败: ${msg}`, key: msgKey });
      }
    },
    [compressImage, message, onChange, multi, maxCount]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      e.target.value = '';
    },
    [handleFile]
  );

  const canAddMore = multi ? previewList.length < maxCount : previewList.length === 0;

  const handleClick = useCallback(() => {
    if (disabled || !canAddMore) return;
    fileInputRef.current?.click();
  }, [disabled, canAddMore]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || !canAddMore) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile, canAddMore]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && canAddMore) {
        setIsDragging(true);
      }
    },
    [disabled, canAddMore]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (disabled || !canAddMore) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === 'file' && ACCEPTED_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    },
    [disabled, handleFile, canAddMore]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent, idx?: number) => {
      e.stopPropagation();
      if (multi) {
        const index = typeof idx === 'number' ? idx : 0;
        const next = previewList.filter((_, i) => i !== index);
        emitChange(next);
      } else {
        emitChange([]);
      }
    },
    [previewList, multi, emitChange]
  );

  const containerStyleBase: React.CSSProperties = {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: 12,
    border: '2px dashed #d9d9d9',
    backgroundColor: '#fafafa',
    cursor: disabled || !canAddMore ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    flex: '0 0 auto',
  };

  const draggingStyle: React.CSSProperties = {
    borderColor: '#1677ff',
    backgroundColor: '#e6f4ff',
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const placeholderStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const removeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
  };

  const indexBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: '2px 8px',
    borderRadius: 10,
    background: 'rgba(22, 119, 255, 0.9)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
  };

  if (multi) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {previewList.map((url, idx) => (
            <div
              key={idx}
              style={{
                ...containerStyleBase,
                border: '2px solid #e5e7eb',
                cursor: 'default',
                opacity: 1,
              }}
            >
              <img src={url} alt={`上传预览 ${idx + 1}`} style={imgStyle} />
              {idx === 0 && (
                <div style={indexBadgeStyle}>主图</div>
              )}
              {!disabled && (
                <button
                  type="button"
                  style={removeBtnStyle}
                  onClick={(e) => handleRemove(e, idx)}
                  title="移除图片"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {canAddMore && (
            <div
              style={{
                ...containerStyleBase,
                ...(isDragging ? draggingStyle : {}),
                opacity: disabled ? 0.5 : 1,
              }}
              onClick={handleClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onPaste={handlePaste}
              tabIndex={0}
              role="button"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                style={{ display: 'none' }}
                onChange={handleInputChange}
                disabled={disabled}
              />
              <div style={placeholderStyle}>
                <img
                  src={PLUS_ICON_SVG}
                  alt="点击上传"
                  style={{ width: 80, height: 80, opacity: 0.55 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  点击/拖拽/粘贴
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {previewList.length}/{maxCount}
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const previewUrl = previewList[0];

  return (
    <div>
      <div
        style={{
          ...containerStyleBase,
          ...(isDragging ? draggingStyle : {}),
        }}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        tabIndex={0}
        role="button"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={disabled}
        />

        {previewUrl ? (
          <>
            <img src={previewUrl} alt="上传预览" style={imgStyle} />
            {!disabled && (
              <button
                type="button"
                style={removeBtnStyle}
                onClick={handleRemove}
                title="移除图片"
              >
                ✕
              </button>
            )}
          </>
        ) : (
          <div style={placeholderStyle}>
            <img
              src={PLUS_ICON_SVG}
              alt="点击上传"
              style={{ width: 80, height: 80, opacity: 0.55 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              点击/拖拽/粘贴 上传
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              JPG / PNG / WEBP · ≤ 5MB
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
