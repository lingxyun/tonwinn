import React from 'react';
import Modal from '../ui/Modal';
import { Sparkles, Wrench, Rocket, Palette, Hash, Calendar } from 'lucide-react';
import changelogData from '../../data/changelog.json';
import { cn } from '../../lib/utils';

const TypeIcon = ({ type }) => {
    switch (type) {
        case 'feat':
            return <Sparkles className="w-3 h-3 text-emerald-500" />;
        case 'fix':
            return <Wrench className="w-3 h-3 text-blue-500" />;
        case 'perf':
            return <Rocket className="w-3 h-3 text-amber-500" />;
        case 'style':
            return <Palette className="w-3 h-3 text-purple-500" />;
        default:
            return <Hash className="w-3 h-3 text-slate-400" />;
    }
};

const ChangelogModal = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="系统版本更新日志">
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-8 py-2">
                    {changelogData.versions.map((ver, idx) => (
                        <div key={ver.version} className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 last:border-transparent">
                            {/* Dot on the timeline */}
                            <div className={cn(
                                "absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm",
                                idx === 0 ? "bg-primary scale-110" : "bg-slate-300 dark:bg-slate-700"
                            )} />

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-lg font-black tracking-tight",
                                            idx === 0 ? "text-primary" : "text-slate-900 dark:text-white"
                                        )}>
                                            v{ver.version}
                                        </span>
                                        {idx === 0 && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase">最新版本</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs font-medium">
                                        <Calendar className="w-3 h-3" />
                                        {ver.date}
                                    </div>
                                </div>

                                {ver.summary && (
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {ver.summary}
                                    </p>
                                )}

                                <div className="mt-2 space-y-2">
                                    {ver.changes.map((change, cIdx) => (
                                        <div key={cIdx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <div className="mt-1 shrink-0 p-1 bg-white dark:bg-slate-900 rounded shadow-sm group-hover:shadow-md transition-all">
                                                <TypeIcon type={change.type} />
                                            </div>
                                            <span className="text-sm text-slate-600 dark:text-slate-400 leading-6">
                                                {change.description}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                    我已了解
                </button>
            </div>
        </Modal>
    );
};

export default ChangelogModal;
