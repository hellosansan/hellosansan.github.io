import { pinyin } from "pinyin-pro";

export function slugify(text: string): string {
  if (!text) return "";

  // 1. 转拼音 (保留英文原样)
  const pinyinResult = pinyin(text, {
    toneType: "none",
    separator: "_",
    v: true,
    nonZh: 'consecutive' 
  });

  // 2. 转换为小写 (GitHub Pages 严格区分大小写)
  // 3. 将所有非字母、非数字、非下划线的字符（如空格、标点）替换为下划线
  // 4. 去除首尾多余的下划线
  return pinyinResult
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_") 
    .replace(/^_|_$/g, "");
}
