/**
 * 内置提示词模板库：点选后填入输入框，可继续编辑再发送。
 */

export interface PromptTemplate {
  id: string;
  /** 模板名（面板里显示） */
  name: string;
  /** 一句话说明 */
  desc: string;
  /** 填入输入框的内容 */
  content: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'translate',
    name: '翻译',
    desc: '中英互译，保留原意与语气',
    content: '请把下面的内容翻译成中文（如果是中文则翻译成英文），保留原意、语气和格式，只输出译文：\n\n',
  },
  {
    id: 'summarize',
    name: '总结要点',
    desc: '提炼核心观点与结论',
    content: '请总结下面内容的要点：先给出 3-5 条核心结论，再补充关键细节，用简洁列表呈现：\n\n',
  },
  {
    id: 'review',
    name: '代码审查',
    desc: '检查 Bug、性能与可读性',
    content: '请审查下面的代码，指出：1) 潜在 Bug；2) 性能问题；3) 可读性/规范改进建议。每条给出原因和修改示例：\n\n',
  },
  {
    id: 'polish',
    name: '润色改写',
    desc: '提升表达，保持原意',
    content: '请润色下面的文字：改进措辞与句式，让表达更流畅自然，但保持原意不变。如果原文是中文，用中文润色：\n\n',
  },
  {
    id: 'explain',
    name: '通俗解释',
    desc: '费曼学习法，讲给小白听',
    content: '请用通俗易懂的方式解释下面的概念，假设听众完全没有背景知识，多用类比和例子，避免术语堆砌：\n\n',
  },
  {
    id: 'brainstorm',
    name: '头脑风暴',
    desc: '围绕主题发散想法',
    content: '围绕下面的主题进行头脑风暴，给出 10 个有创意的点子或角度，每个用一句话说明：\n\n',
  },
  {
    id: 'email',
    name: '写邮件',
    desc: '得体、清晰的商务邮件',
    content: '帮我写一封邮件：\n- 收件人：\n- 目的：\n- 语气：礼貌专业\n- 字数：200 字以内\n',
  },
  {
    id: 'deepen',
    name: '深入探讨',
    desc: '多角度剖析一个话题',
    content: '请深入分析下面这个话题：从背景、争议点、不同立场、影响与结论五个角度展开，尽量客观全面：\n\n',
  },
];
