import type { Preview } from '@storybook/react-vite'
import '../src/index.css'
import '../src/styles/typography.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0D0D0F' },
        { name: 'panel', value: '#1A1A1F' },
        { name: 'light', value: '#FFFFFF' },
      ],
    },
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;