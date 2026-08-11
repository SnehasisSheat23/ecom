"use client"

import * as React from "react"
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onGenerateAI?: () => void
  isGenerating?: boolean
  dir?: 'ltr' | 'rtl'
}

const ToolbarButton = ({ 
  onClick, 
  isActive, 
  icon, 
  title 
}: { 
  onClick: () => void
  isActive?: boolean
  icon: string
  title: string
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      "p-1.5 rounded-md hover:bg-muted transition-colors flex items-center justify-center",
      isActive ? "bg-muted text-foreground" : "text-muted-foreground"
    )}
  >
    <Icon name={icon} className="size-[18px]" />
  </button>
)

const MenuBar = ({ editor, onGenerateAI, isGenerating }: { editor: Editor | null, onGenerateAI?: () => void, isGenerating?: boolean }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between border-b border-border/60 p-2 bg-muted/20">
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon="format_bold"
          title="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon="format_italic"
          title="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          icon="strikethrough_s"
          title="Strikethrough"
        />
        
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          icon="format_h1"
          title="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon="format_h2"
          title="Heading 2"
        />
        
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon="format_list_bulleted"
          title="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon="format_list_numbered"
          title="Numbered List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon="format_quote"
          title="Blockquote"
        />
        
        <div className="w-[1px] h-4 bg-border/60 mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          icon="undo"
          title="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          icon="redo"
          title="Redo"
        />
      </div>

      {onGenerateAI && (
        <Button 
          type="button"
          size="sm" 
          variant="outline" 
          className="h-7 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          onClick={onGenerateAI}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Icon name="sync" className="size-3.5 animate-spin" />
          ) : (
            <Icon name="auto_awesome" className="size-3.5" />
          )}
          {isGenerating ? "Generating..." : "Generate AI"}
        </Button>
      )}
    </div>
  )
}

export function RichTextEditor({ value, onChange, onGenerateAI, isGenerating, dir }: RichTextEditorProps) {
  const isRtl = dir === 'rtl'
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'focus:outline-none min-h-[150px] p-4 text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:mb-2 [&_p:last-child]:mb-0',
          isRtl && 'text-right font-arabic [&_ul]:pr-5 [&_ul]:pl-0 [&_ol]:pr-5 [&_ol]:pl-0'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Update editor content when value changes externally (e.g. from AI generation)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div dir={dir || 'ltr'} className="border border-border/60 rounded-md overflow-hidden bg-background focus-within:outline-none focus-within:ring-1 focus-within:ring-ring transition-shadow">
      <MenuBar editor={editor} onGenerateAI={onGenerateAI} isGenerating={isGenerating} />
      <EditorContent editor={editor} className="cursor-text" onClick={() => editor?.commands.focus()} />
    </div>
  )
}
