/**
 * Tool UI 显示层（Post-Gate UX polish）：把 exact Tool ID（builtin.* 等）翻译成
 * 人类可读的默认展示。底层 Tool ID / toolVersionId / provider enum 不变——
 * 原始技术信息由 Inspector 的「技术详情」折叠区承载。
 *
 * 纯函数，无 store 依赖。
 */

/** Built-in Tool 默认显示名；MCP / HTTP Tool 保留真实技术名（github.push 等） */
const BUILTIN_TOOL_DISPLAY: Record<string, string> = {
  "builtin.read": "读取文件",
  "builtin.glob": "文件查找",
  "builtin.grep": "内容搜索",
  "builtin.edit": "编辑文件",
  "builtin.write": "写入文件",
  "builtin.bash": "执行命令",
};

export function toolDisplayName(toolName: string): string {
  return BUILTIN_TOOL_DISPLAY[toolName] ?? toolName;
}

/** 解析 `key="value" key2="value2"` 形式的 argsDigest（mock 与演示数据统一使用该格式） */
function parseArgsDigest(digest: string): Record<string, string> {
  const args: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(digest)) !== null) args[match[1]] = match[2];
  return args;
}

/**
 * 人类可读的「这次调用做了什么」一行摘要。无法识别的工具返回空串
 * （UI 隐藏摘要行，原始参数放技术详情）。
 */
export function toolCallSummary(toolName: string, argsDigest: string): string {
  const args = parseArgsDigest(argsDigest);
  switch (toolName) {
    case "builtin.grep":
      if (args.pattern !== undefined) return `在 ${args.path || "工作区"} 中搜索 ${args.pattern}`;
      break;
    case "builtin.read":
      if (args.file !== undefined) return `读取 ${args.file}`;
      break;
    case "builtin.glob":
      if (args.pattern !== undefined) return `查找匹配 ${args.pattern} 的文件`;
      break;
    case "builtin.edit":
      if (args.file !== undefined) return `编辑 ${args.file}`;
      break;
    case "builtin.write":
      if (args.file !== undefined) return `写入 ${args.file}`;
      break;
    case "builtin.bash":
      if (args.cmd !== undefined) return `执行 ${args.cmd}`;
      break;
    case "github.push":
      if (args.repo !== undefined) return `推送 ${args.repo} 分支 ${args.branch ?? ""}`.trimEnd();
      break;
  }
  return "";
}

/**
 * 人类可读的执行结果摘要；无法识别时返回 undefined（UI 回退显示原始 resultDigest）。
 */
export function toolCallResultSummary(toolName: string, resultDigest: string): string | undefined {
  const numbers = (re: RegExp): number[] | undefined => {
    const m = re.exec(resultDigest);
    return m ? m.slice(1).map(Number) : undefined;
  };
  switch (toolName) {
    case "builtin.grep": {
      const n = numbers(/^(\d+) matches in (\d+) files$/);
      if (n) return `在 ${n[1]} 个文件中找到 ${n[0]} 处匹配`;
      break;
    }
    case "builtin.edit": {
      const n = numbers(/^applied (\d+) hunk$/);
      if (n) return `已应用 ${n[0]} 处修改`;
      break;
    }
    case "builtin.bash": {
      const n = numbers(/^Tests run: (\d+), Failures: (\d+)/);
      if (n) return n[1] > 0 ? `运行 ${n[0]} 个测试，${n[1]} 个失败` : `运行 ${n[0]} 个测试，全部通过`;
      break;
    }
    case "builtin.read": {
      const n = numbers(/^(\d+) lines$/);
      if (n) return `共 ${n[0]} 行`;
      break;
    }
    case "builtin.glob": {
      const n = numbers(/^(\d+) files?$/);
      if (n) return `找到 ${n[0]} 个文件`;
      break;
    }
    case "github.push": {
      const m = /^pushed (\S+) → (\S+)$/.exec(resultDigest);
      if (m) return `已推送 ${m[1]} 到 ${m[2]}`;
      break;
    }
  }
  return undefined;
}
