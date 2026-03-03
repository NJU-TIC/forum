"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Code,
  List,
  ListOrdered,
  Image as ImageIcon,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Strikethrough,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type MarkdownStorage = {
  markdown?: {
    getMarkdown?: () => string;
  };
};

function readMarkdown(storage: unknown): string {
  const markdownStorage = storage as MarkdownStorage;
  return markdownStorage.markdown?.getMarkdown?.() ?? "";
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MarkdownEditor({ value, onChange, disabled }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(readMarkdown(editor.storage));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
    immediatelyRender: false,
  });

  // Sync external value changes (optional, mostly for initial load or external reset)
  useEffect(() => {
    if (editor && value !== readMarkdown(editor.storage)) {
       // Check if the difference is significant to avoid cursor jumps
       // For now, we only set if it's completely different or empty
       // But actually, we should be careful. 
       // If the user types, onChange fires, value updates.
       // If we setContent here, it might reset cursor.
       // We can skip this if we assume value is controlled by this component mostly.
       // However, to support initial value properly:
       if (editor.getText() === "" && value) {
         editor.commands.setContent(value);
       }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const editorContentClass = cn(
    "flex-1 overflow-y-auto",
    "[&_.ProseMirror]:min-h-[400px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-foreground",
    "[&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:leading-relaxed",
    "[&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold",
    "[&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold",
    "[&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold",
    "[&_.ProseMirror_ul]:mb-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5",
    "[&_.ProseMirror_ol]:mb-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5",
    "[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground",
    "[&_.ProseMirror_pre]:my-4 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:border [&_.ProseMirror_pre]:border-border [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:px-4 [&_.ProseMirror_pre]:py-3 [&_.ProseMirror_pre]:text-foreground",
    "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:font-mono [&_.ProseMirror_pre_code]:text-[0.8125rem] [&_.ProseMirror_pre_code]:leading-[1.5] [&_.ProseMirror_pre_code]:whitespace-pre-wrap [&_.ProseMirror_pre_code]:break-words",
    "[&_.ProseMirror_code]:font-mono [&_.ProseMirror_p_code]:text-[0.85em] [&_.ProseMirror_p_code]:rounded [&_.ProseMirror_p_code]:bg-muted [&_.ProseMirror_p_code]:px-1.5 [&_.ProseMirror_p_code]:py-0.5",
    "[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg",
    "[&_.ProseMirror_a]:text-[#2563EB] [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2 [&_.ProseMirror_a:hover]:text-[#1D4ED8]",
  );

  const addImage = () => {
    const url = window.prompt("URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const { from, to, empty } = editor.state.selection;

    if (empty) {
      const end = from + url.length;
      editor
        .chain()
        .focus()
        .setLink({ href: url })
        .insertContent(url)
        .setTextSelection(end)
        .unsetMark("link")
        .run();
      return;
    }

    // update
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .setTextSelection(to)
      .unsetMark("link")
      .run();
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground flex flex-col min-h-[500px]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-border bg-muted/40">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
          isActive={editor.isActive("bold")}
          icon={<Bold className="w-4 h-4" />}
          tooltip="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
          isActive={editor.isActive("italic")}
          icon={<Italic className="w-4 h-4" />}
          tooltip="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run() || disabled}
          isActive={editor.isActive("strike")}
          icon={<Strikethrough className="w-4 h-4" />}
          tooltip="Strikethrough"
        />
        
        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          icon={<Heading1 className="w-4 h-4" />}
          tooltip="Heading 1"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          icon={<Heading2 className="w-4 h-4" />}
          tooltip="Heading 2"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          icon={<Heading3 className="w-4 h-4" />}
          tooltip="Heading 3"
          disabled={disabled}
        />

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={<List className="w-4 h-4" />}
          tooltip="Bullet List"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={<ListOrdered className="w-4 h-4" />}
          tooltip="Ordered List"
          disabled={disabled}
        />

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          icon={<Code className="w-4 h-4" />}
          tooltip="Code Block"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          icon={<Quote className="w-4 h-4" />}
          tooltip="Quote"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus className="w-4 h-4" />}
          tooltip="Horizontal Rule"
          disabled={disabled}
        />

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive("link")}
          icon={<LinkIcon className="w-4 h-4" />}
          tooltip="Link"
          disabled={disabled}
        />
        <ToolbarButton
          onClick={addImage}
          icon={<ImageIcon className="w-4 h-4" />}
          tooltip="Image"
          disabled={disabled}
        />

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run() || disabled}
          icon={<Undo className="w-4 h-4" />}
          tooltip="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run() || disabled}
          icon={<Redo className="w-4 h-4" />}
          tooltip="Redo"
        />
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={editorContentClass}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  tooltip,
  disabled,
  isActive,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
  disabled?: boolean;
  isActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {icon}
    </button>
  );
}
