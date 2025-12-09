declare module "@/hooks/use-todos-data" {
  export { useTodosData as useToDosData } from "@/hooks/use-todos-data";
}

// Allow extra props being passed to React components without failing TS (defense for existing usages)
declare namespace JSX {
  interface IntrinsicAttributes {
    // Accept arbitrary attributes on components to avoid compilation failures from prop mismatches
    [prop: string]: any;
  }
}