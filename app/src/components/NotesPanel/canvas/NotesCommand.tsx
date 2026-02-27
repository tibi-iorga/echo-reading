import { Extension } from '@tiptap/react'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { CommandMenu, type CommandMenuRef } from './CommandMenu'

export interface SlashCommandOptions {
  onImportNote: (cursorRect: DOMRect) => void
}

export const NotesCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onImportNote: () => {},
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }) => {
          if (props?.executeCommand) {
            props.executeCommand(editor, range)
          }
        },
        items: ({ query }) => {
          if (query.length < 30) {
            return [{ id: 'show-menu', query }]
          }
          return []
        },
        render: () => {
          let component: ReactRenderer<CommandMenuRef> | null = null
          let popup: TippyInstance[] | null = null

          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandMenu, {
                props: {
                  editor: props.editor,
                  range: props.range,
                  query: props.query,
                  onImportNote: this.options.onImportNote,
                  command: props.command,
                },
                editor: props.editor,
              })

              if (!props.clientRect) return

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },

            onUpdate: (props) => {
              component?.updateProps({
                editor: props.editor,
                range: props.range,
                query: props.query,
                onImportNote: this.options.onImportNote,
                command: props.command,
              })

              if (popup && props.clientRect) {
                popup[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                })
              }
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }

              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit: () => {
              popup?.[0]?.destroy()
              component?.destroy()
            },
          }
        },
      }),
    ]
  },
})
