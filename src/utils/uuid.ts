// 简单的 UUID v4 生成器，跨平台兼容（不需要额外的原生依赖）

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateInviteCode(): string {
  // 6位随机数字
  return String(Math.floor(100000 + Math.random() * 900000));
}
