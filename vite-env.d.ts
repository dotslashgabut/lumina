/// <reference types="vite/client" />
import { ThreeElements } from '@react-three/fiber'

declare module '*.woff' {
    const src: string;
    export default src;
}

declare global {
    namespace React {
        namespace JSX {
            interface IntrinsicElements extends ThreeElements { }
        }
    }
}
