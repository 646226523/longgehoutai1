import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  height?: number
  placeholder?: string
}

const toolbarKeys: string[] = [
  'headerSelect',
  '|',
  'bold',
  'italic',
  'underline',
  'through',
  '|',
  'bulletedList',
  'numberedList',
  '|',
  'justifyLeft',
  'justifyCenter',
  'justifyRight',
  '|',
  'insertTable',
  '|',
  'insertLink',
  '|',
  'undo',
  'redo',
]

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  height = 400,
  placeholder = '请输入正文内容',
}) => {
  const [editor, setEditor] = useState<IDomEditor | null>(null)
  const initialValueRef = useRef(value)
  const editorRef = useRef<IDomEditor | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      const editorInstance = editorRef.current
      if (editorInstance != null) {
        editorInstance.destroy()
      }
    }
  }, [])

  const handleCreated = (editorInstance: IDomEditor) => {
    editorRef.current = editorInstance
    setEditor(editorInstance)
    try {
      if (initialValueRef.current) {
        editorInstance.setHtml(initialValueRef.current)
      }
    } catch (e) {
      console.error('[RichTextEditor] handleCreated setHtml error:', e)
    }
  }

  const handleEditorConfig: Partial<IEditorConfig> = {
    placeholder,
    MENU_CONF: {},
    onChange(editorInstance: IDomEditor) {
      try {
        const html = editorInstance.getHtml()
        onChange?.(html)
      } catch (e) {
        console.error('[RichTextEditor] onChange error:', e)
      }
    },
  }

  const toolbarConfig: Partial<IToolbarConfig> = {
    toolbarKeys,
  }

  const insertImages = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const editorInstance = editorRef.current
    if (!editorInstance) return

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        editorInstance.dangerouslyInsertHtml(
          `<img src="${reader.result}" alt="${file.name}" style="max-width:100%;" />`,
        )
      }
    })
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      insertImages(e.target.files)
      e.target.value = ''
    },
    [insertImages],
  )

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #d9d9d9',
          background: '#fafafa',
          paddingRight: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Toolbar
            editor={editor}
            defaultConfig={toolbarConfig}
            mode="default"
            style={{ border: 'none' }}
          />
        </div>
        <div
          style={{
            width: 1,
            height: 24,
            background: '#e0e0e0',
            margin: '0 4px',
          }}
        />
        <button
          type="button"
          onClick={triggerFileSelect}
          title="上传图片（支持多选）"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 32,
            padding: '0 10px',
            border: '1px solid #e0e0e0',
            background: '#fff',
            cursor: 'pointer',
            borderRadius: 4,
            color: '#1677ff',
            fontSize: 12,
            fontWeight: 500,
            gap: 4,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#1677ff'
            e.currentTarget.style.background = '#e6f4ff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e0e0e0'
            e.currentTarget.style.background = '#fff'
          }}
        >
          <svg viewBox="0 0 1024 1024" width="16" height="16">
            <path d="M959.877 128l0.123 0.123v767.775l-0.123 0.122H64.102l-0.122-0.122V128.123l0.122-0.123h895.775zM960 64H64C28.795 64 0 92.795 0 128v768c0 35.205 28.795 64 64 64h896c35.205 0 64-28.795 64-64V128c0-35.205-28.795-64-64-64zM832 288.01c0 53.023-42.988 96.01-96.01 96.01s-96.01-42.987-96.01-96.01S682.967 192 735.99 192 832 234.988 832 288.01zM896 832H128V704l224.01-384 256 320h64l224.01-192z" fill="currentColor" />
          </svg>
          <span>上传图片</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <Editor
        mode="default"
        defaultConfig={handleEditorConfig}
        onCreated={handleCreated}
        style={{ height, overflowY: 'auto' }}
      />
    </div>
  )
}

export default RichTextEditor
export type { RichTextEditorProps }
