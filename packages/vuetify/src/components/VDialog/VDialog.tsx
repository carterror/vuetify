// Styles
import './VDialog.sass'

// Components
import { VDialogTransition } from '@/components/transitions'
import { VDefaultsProvider } from '@/components/VDefaultsProvider'
import { VOverlay } from '@/components/VOverlay'

// Composables
import { makeTransitionProps } from '@/composables/transition'
import { useProxiedModel } from '@/composables/proxiedModel'
import { useScopeId } from '@/composables/scopeId'
import { forwardRefs } from '@/composables/forwardRefs'

// Utilities
import { nextTick, ref, watch } from 'vue'
import { genericComponent, IN_BROWSER, useRender } from '@/util'

// Types
import type { OverlaySlots } from '@/components/VOverlay/VOverlay'

export const VDialog = genericComponent<new () => {
  $slots: OverlaySlots
}>()({
  name: 'VDialog',

  inheritAttrs: false,

  props: {
    fullscreen: Boolean,
    origin: {
      type: String,
      default: 'center center',
    },
    retainFocus: {
      type: Boolean,
      default: true,
    },
    scrollable: Boolean,
    modelValue: Boolean,

    ...makeTransitionProps({
      transition: { component: VDialogTransition },
    }),
  },

  emits: {
    'update:modelValue': (value: boolean) => true,
  },

  setup (props, { attrs, slots }) {
    const isActive = useProxiedModel(props, 'modelValue')
    const { scopeId } = useScopeId()

    const overlay = ref<VOverlay>()
    function onFocusin (e: FocusEvent) {
      const before = e.relatedTarget as HTMLElement | null
      const after = e.target as HTMLElement | null

      if (
        before !== after &&
        overlay.value?.contentEl &&
        // We're the topmost dialog
        overlay.value?.globalTop &&
        // It isn't the document or the dialog body
        ![document, overlay.value.contentEl].includes(after!) &&
        // It isn't inside the dialog body
        !overlay.value.contentEl.contains(after)
      ) {
        const focusable = [...overlay.value.contentEl.querySelectorAll(
          'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter(el => !el.hasAttribute('disabled') && !el.matches('[tabindex="-1"]')) as HTMLElement[]

        if (!focusable.length) return

        const firstElement = focusable[0]
        const lastElement = focusable[focusable.length - 1]

        if (before === firstElement) {
          lastElement.focus()
        } else {
          firstElement.focus()
        }
      }
    }

    if (IN_BROWSER) {
      watch(() => isActive.value && props.retainFocus, val => {
        val
          ? document.addEventListener('focusin', onFocusin)
          : document.removeEventListener('focusin', onFocusin)
      }, { immediate: true })
    }

    watch(isActive, async val => {
      await nextTick()
      if (val) {
        overlay.value!.contentEl?.focus({ preventScroll: true })
      } else {
        overlay.value!.activatorEl?.focus({ preventScroll: true })
      }
    })

    useRender(() => (
      <VOverlay
        v-model={ isActive.value }
        class={[
          'v-dialog',
          {
            'v-dialog--fullscreen': props.fullscreen,
            'v-dialog--scrollable': props.scrollable,
          },
        ]}
        transition={ props.transition }
        scrollStrategy="block"
        ref={ overlay }
        aria-role="dialog"
        aria-modal="true"
        activatorProps={{
          'aria-haspopup': 'dialog',
          'aria-expanded': String(isActive.value),
        }}
        z-index={ 2400 }
        { ...scopeId }
        { ...attrs }
      >
        {{
          activator: slots.activator,
          default: () => (
            <VDefaultsProvider root>
              { slots.default?.() }
            </VDefaultsProvider>
          ),
        }}
      </VOverlay>
    ))

    return forwardRefs({}, overlay)
  },
})

export type VDialog = InstanceType<typeof VDialog>
