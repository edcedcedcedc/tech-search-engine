/// <reference types="vite/client" />

// Declare SVG imports
declare module '*.svg' {
  import { FC, SVGProps } from 'react'
  const content: FC<SVGProps<SVGElement>>
  export default content
}

// Or if you want named export as well:
declare module '*.svg?react' {
  import { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGElement>>
  export { ReactComponent }
  export default ReactComponent
}