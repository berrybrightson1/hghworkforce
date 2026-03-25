declare module "papaparse" {
  export interface ParseMeta {
    [key: string]: unknown;
  }

  export interface ParseError {
    [key: string]: unknown;
  }

  export interface ParseResult<T = unknown> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export interface ParseConfig<T = unknown> {
    header?: boolean;
    skipEmptyLines?: boolean | "greedy";
    complete?: (results: ParseResult<T>) => void;
    [key: string]: unknown;
  }

  interface PapaStatic {
    parse<T = unknown>(input: File, config?: ParseConfig<T>): ParseResult<T>;
  }

  const Papa: PapaStatic;
  export default Papa;
}
