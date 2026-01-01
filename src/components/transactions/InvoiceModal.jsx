
import React, { useRef, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

const InvoiceModal = ({ isOpen, onClose, transaction, customer }) => {
    const invoiceRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { settings } = useSettings();

    if (!isOpen || !transaction) return null;

    const handleDownload = async (type = 'pdf') => {
        setIsGenerating(true);
        try {
            const element = invoiceRef.current;
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const fileName = type === 'pdf'
                ? `收据_${transaction.id}.pdf`
                : `收据_${transaction.id}.png`;

            const filePath = await save({
                filters: [{
                    name: type === 'pdf' ? 'PDF文件' : '图片文件',
                    extensions: [type]
                }],
                defaultPath: fileName
            });

            if (filePath) {
                if (type === 'pdf') {
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    const imgData = canvas.toDataURL('image/png');
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

                    const pdfArrayBuffer = pdf.output('arraybuffer');
                    await writeFile(filePath, new Uint8Array(pdfArrayBuffer));
                    toast.success('PDF 电子收据已保存');
                } else {
                    const imgData = canvas.toDataURL('image/png');
                    // Convert base64 imgData to Uint8Array
                    const base64Data = imgData.split(',')[1];
                    const binaryData = atob(base64Data);
                    const uint8Array = new Uint8Array(binaryData.length);
                    for (let i = 0; i < binaryData.length; i++) {
                        uint8Array[i] = binaryData.charCodeAt(i);
                    }
                    await writeFile(filePath, uint8Array);
                    toast.success('图片电子收据已保存');
                }
            }
        } catch (error) {
            console.error('Generation failed:', error);
            toast.error('生成失败，请重试');
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
                            onClick={() => handleDownload('png')}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            保存图片
                        </button>
                        <button
                            onClick={() => handleDownload('pdf')}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm"
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 md:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
                    {/* Scaling Wrapper - scales down the fixed-width A4 receipt on small screens */}
                    <div className="transform scale-[0.42] sm:scale-75 md:scale-100 origin-top transition-transform duration-200 mt-4 md:mt-0 h-[500px] sm:h-[900px] md:h-auto">
                        {/* The Invoice Paper - Fixed A4 Width */}
                        <div
                            ref={invoiceRef}
                            className="bg-white text-slate-900 w-[210mm] min-h-[297mm] p-[20mm] shadow-lg mx-auto"
                            style={{ aspectRatio: '210/297' }}
                        >
                            <div className="flex justify-between items-start mb-12 border-b-4 border-primary pb-8">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">收款单据</h1>
                                    <p className="text-slate-400 font-bold mt-1 tracking-[0.3em]">OFFICIAL RECEIPT</p>
                                    <div className="mt-6">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">单据编号</p>
                                        <p className="text-xl font-mono font-bold text-primary">#{transaction.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-2xl font-black text-slate-900 mb-1">{settings?.system_name || '同为厨业'}</h3>
                                    <p className="text-sm text-slate-500 font-medium">{settings?.system_subtitle || '专业财务管理系统'}</p>
                                    <div className="mt-6">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">开票日期</p>
                                        <p className="text-lg font-bold text-slate-900">{transaction.date}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bill To */}
                            <div className="mb-12 flex gap-10">
                                <div className="flex-1 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">交款单位 (BILL TO)</h4>
                                    <div className="text-slate-900">
                                        <p className="text-2xl font-black tracking-tight">{customer?.name || '个人客户'}</p>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            {customer?.phone && (
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">联系电话</p>
                                                    <p className="text-sm font-bold text-slate-600">{customer.phone}</p>
                                                </div>
                                            )}
                                            {customer?.address && (
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">联系地址</p>
                                                    <p className="text-sm font-bold text-slate-600">{customer.address}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-48 p-6 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col justify-center items-center">
                                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">单据性质</p>
                                    <p className="text-xl font-black text-primary uppercase tracking-tighter">
                                        {transaction.type === 'Income' ? '收入凭证' : '支出凭证'}
                                    </p>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="mb-12">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">项 目 描 述</th>
                                            <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">类 别</th>
                                            <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">结 算 金 额</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-100 italic">
                                            <td className="py-8">
                                                <p className="text-lg font-bold text-slate-800">{transaction.description || '日常业务往来'}</p>
                                                <p className="text-xs text-slate-400 mt-1">Transaction Ref: {transaction.id}</p>
                                            </td>
                                            <td className="py-8">
                                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">
                                                    {transaction.category || '未分类'}
                                                </span>
                                            </td>
                                            <td className="py-8 text-right">
                                                <p className="text-2xl font-black text-slate-900">¥ {Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-between items-end mb-16">
                                <div className="text-slate-400 text-[10px] font-bold italic max-w-xs">
                                    <p>* 本单据仅作为财务记账凭证使用。</p>
                                    <p>* 请妥善保管此电子单据，如有疑问请及时联系财务部门。</p>
                                </div>
                                <div className="w-72 bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 -mr-8 -mt-8 bg-white/10 rounded-full blur-2xl" />
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                            <span>应付合计 / Total</span>
                                            <span>¥ {Math.abs(transaction.amount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                            <span>优惠扣减 / Discount</span>
                                            <span>- ¥ 0.00</span>
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-white/10">
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs font-black uppercase tracking-widest">实付总计</span>
                                                <span className="text-3xl font-black tracking-tighter text-primary">¥ {Math.abs(transaction.amount).toLocaleString()}</span>
                                            </div>
                                        </div>
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
        </div>
    );
};

export default InvoiceModal;
