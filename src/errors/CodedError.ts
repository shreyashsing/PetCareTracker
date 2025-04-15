export class CodedError extends Error {
  code: string;
  info: Record<string, any>;

  constructor(code: string, message: string, info: Record<string, any> = {}) {
    super(message);
    this.code = code;
    this.info = info;
    this.name = 'CodedError';
  }
}

export default CodedError; 