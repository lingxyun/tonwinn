
import React, { useRef, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const InvoiceModal = ({ isOpen, onClose, transaction, customer }) => {
    const invoiceRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen || !transaction) return null;

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const element = invoiceRef.current;
            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff' // Ensure white background
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`invoice_${transaction.id}.pdf`);
            toast.success('电子收据已下载');
        } catch (error) {
            console.error('PDF Generation failed:', error);
            toast.error('生成 PDF 失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-slate-100 dark:bg-slate-900 rounded-xl shadow-2xl mx-4 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                {/* Header Actions */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">电子收据预览</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            {isGenerating ? '生成中...' : '下载 PDF'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
                    {/* The Invoice Paper - Always White */}
                    <div
                        ref={invoiceRef}
                        className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-[20mm] shadow-lg"
                        style={{ aspectRatio: '210/297' }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">电子收据</h1>
                                <p className="text-slate-500 mt-1">RECEIPT / INVOICE</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xl font-bold text-primary">同为厨业</h3>
                                <p className="text-sm text-slate-500 mt-1">日期: {transaction.date}</p>
                                <p className="text-sm text-slate-500">单号: #{transaction.id}</p>
                            </div>
                        </div>

                        {/* Bill To */}
                        <div className="mb-12 p-6 bg-slate-50 rounded-lg border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">客户信息 (BILL TO)</h4>
                            <div className="text-slate-900">
                                <p className="text-lg font-bold">{customer?.name || '未知客户'}</p>
                                {customer?.phone && <p className="text-slate-600 mt-1">电话: {customer.phone}</p>}
                                {customer?.email && <p className="text-slate-600">邮箱: {customer.email}</p>}
                            </div>
                        </div>

                        {/* Line Items */}
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-2 border-slate-900">
                                    <th className="text-left py-3 font-bold text-slate-900">项目描述</th>
                                    <th className="text-left py-3 font-bold text-slate-900">类别</th>
                                    <th className="text-right py-3 font-bold text-slate-900">金额</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-100">
                                    <td className="py-4 text-slate-700">{transaction.description}</td>
                                    <td className="py-4 text-slate-700">{transaction.category}</td>
                                    <td className="py-4 text-right font-bold text-slate-900">
                                        ¥{Math.abs(transaction.amount).toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end mb-16">
                            <div className="w-64">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">小计</span>
                                    <span className="font-medium">¥{Math.abs(transaction.amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">税费 (0%)</span>
                                    <span className="font-medium">¥0.00</span>
                                </div>
                                <div className="flex justify-between py-4">
                                    <span className="text-lg font-bold text-slate-900">总计</span>
                                    <span className="text-lg font-bold text-primary">¥{Math.abs(transaction.amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 pt-8 text-center">
                            <p className="text-slate-900 font-medium mb-2">感谢您的惠顾！</p>
                            <p className="text-slate-500 text-sm">此单据由系统自动生成，作为交易凭证使用。</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
