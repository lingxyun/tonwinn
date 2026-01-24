/**
 * 格式化货币金额
 * @param {number} amount - 金额
 * @param {boolean} isPrivacyMode - 是否隐私模式
 * @returns {string} 格式化后的金额字符串
 */
export function formatCurrency(amount, isPrivacyMode = false) {
    if (isPrivacyMode) {
        return '¥***.**';
    }

    if (amount === null || amount === undefined) {
        return '¥0.00';
    }

    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}
