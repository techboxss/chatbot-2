
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Trophy, ArrowRight, ShieldCheck, Zap, Lightbulb, Building, Scale, FileText, Settings, Info, ChevronDown } from 'lucide-react';
import { ServiceDetail } from '../constants/services';
import { cn } from '@/src/lib/utils';

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceDetail | null;
  justification?: string | null;
  onServiceRequest?: (service: ServiceDetail) => void;
  onAskQuestion?: (question: string) => void;
}

const getServiceIcon = (iconName: string, size = 20) => {
  switch (iconName) {
    case 'ShieldCheck': return <ShieldCheck size={size} />;
    case 'Lightbulb': return <Lightbulb size={size} />;
    case 'Building': return <Building size={size} />;
    case 'Scale': return <Scale size={size} />;
    case 'FileText': return <FileText size={size} />;
    case 'Settings': return <Settings size={size} />;
    case 'Zap': return <Zap size={size} />;
    default: return <Info size={size} />;
  }
};

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ isOpen, onClose, service, justification, onServiceRequest, onAskQuestion }) => {
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (!service) return null;

  const toggleFeature = (index: number) => {
    setExpandedFeature(expandedFeature === index ? null : index);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header section with specialized background */}
            <div className="bg-slate-900 p-10 text-white relative overflow-hidden shrink-0">
              <div className="absolute -bottom-10 -right-10 p-10 opacity-10 rotate-12">
                {getServiceIcon(service.iconName, 300)}
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
                      {getServiceIcon(service.iconName, 32)}
                    </div>
                    <div>
                      <div className="px-3 py-1 bg-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit mb-2">
                        LegalEase Services
                      </div>
                      <h2 className="text-4xl font-serif italic">{service.name}</h2>
                    </div>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <p className="text-blue-200 text-lg font-medium max-w-2xl">{service.tagline}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left: General info & Features */}
                <div className="lg:col-span-2 space-y-10">
                  {justification && (
                    <motion.section 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-2xl"
                    >
                      <h3 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Zap size={12} className="fill-blue-600" />
                        AI Recommendation Insight
                      </h3>
                      <p className="text-blue-900 font-medium italic text-lg leading-relaxed">
                        "{justification}"
                      </p>
                    </motion.section>
                  )}

                  {service.videoGenerationUrl && (
                    <motion.section 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={16} className="text-blue-500" />
                        Service Vision Video
                      </h3>
                      <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-900 group">
                        <video 
                          key={service.videoGenerationUrl}
                          src={service.videoGenerationUrl} 
                          controls 
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-3xl"></div>
                      </div>
                    </motion.section>
                  )}

                  <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Overview</h3>
                    <p className="text-slate-700 leading-relaxed text-lg">{service.description}</p>
                  </section>

                  <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="lg:col-span-1">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Settings size={16} />
                        Key Features
                      </h3>
                      <div className="space-y-3">
                        {service.features.map((feature, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "border rounded-2xl transition-all duration-300 overflow-hidden",
                              expandedFeature === i 
                                ? "border-blue-200 bg-blue-50/20 shadow-sm" 
                                : "border-slate-100 bg-white hover:border-slate-200"
                            )}
                          >
                            <button
                              onClick={() => toggleFeature(i)}
                              aria-expanded={expandedFeature === i}
                              aria-controls={`feature-content-${i}`}
                              id={`feature-button-${i}`}
                              className="w-full flex items-center justify-between p-4 text-left group cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-xl transition-all duration-300",
                                  expandedFeature === i 
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                                    : "bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-blue-500"
                                )}>
                                  <Zap size={14} className={cn(expandedFeature === i && "fill-white")} />
                                </div>
                                <span className={cn(
                                  "text-[13px] font-extrabold tracking-tight transition-colors",
                                  expandedFeature === i ? "text-slate-900" : "text-slate-600"
                                )}>
                                  {feature.title}
                                </span>
                              </div>
                              <motion.div
                                animate={{ rotate: expandedFeature === i ? 180 : 0 }}
                                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                className={cn(
                                  "text-slate-400 p-1 rounded-full transition-colors",
                                  expandedFeature === i && "text-blue-500 bg-blue-50"
                                )}
                              >
                                <ChevronDown size={18} />
                              </motion.div>
                            </button>
                            <AnimatePresence initial={false}>
                              {expandedFeature === i && (
                                <motion.div
                                  id={`feature-content-${i}`}
                                  role="region"
                                  aria-labelledby={`feature-button-${i}`}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                >
                                  <div className="px-14 pb-5 pr-6">
                                    <p className="text-[13px] text-slate-600 leading-relaxed font-semibold opacity-90">
                                      {feature.description}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-1">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        Strategic Benefits
                      </h3>
                      <div className="space-y-4">
                        {service.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all group">
                            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-slate-600 font-bold text-sm tracking-tight">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  
                  <section className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Info size={16} className="text-blue-500" />
                      Frequently Asked Questions
                    </h3>
                    <div className="space-y-4">
                      {service.faqs.map((faq, i) => (
                        <div 
                          key={i} 
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all hover:border-blue-200"
                        >
                          <div className="w-full flex items-center justify-between p-4 text-left group">
                            <button
                              onClick={() => toggleFaq(i)}
                              className="flex-1 flex items-center justify-between text-left cursor-pointer"
                            >
                              <span className="text-[13px] font-bold text-slate-800 pr-8">
                                {faq.question}
                              </span>
                              <motion.div
                                animate={{ rotate: expandedFaq === i ? 180 : 0 }}
                                className={cn(
                                  "text-slate-400 shrink-0",
                                  expandedFaq === i && "text-blue-500"
                                )}
                              >
                                <ChevronDown size={18} />
                              </motion.div>
                            </button>
                            
                            <motion.button
                              whileHover={{ scale: 1.1, color: '#2563eb' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskQuestion?.(`Can you elaborate on this FAQ for ${service.name}: "${faq.question}"?`);
                                onClose();
                              }}
                              className="ml-4 p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2 group/ask"
                              title="Ask AI Concierge"
                            >
                              <Lightbulb size={14} className="group-hover/ask:fill-blue-500/20" />
                              <span className="text-[9px] font-black uppercase tracking-tighter hidden md:block">Ask Concierge</span>
                            </motion.button>
                          </div>
                          <AnimatePresence>
                            {expandedFaq === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="px-5 pb-5 pt-0">
                                  <p className="text-[13px] text-slate-600 leading-relaxed font-medium bg-blue-50/30 p-3 rounded-xl border border-blue-100/50">
                                    {faq.answer}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right: Case Study Sidebar */}
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sticky top-0 shadow-sm overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Trophy size={80} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Trophy size={16} className="text-amber-500" />
                       Success Story
                    </h3>
                    <h4 className="text-xl font-bold text-slate-900 mb-4">{service.caseStudy.title}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">"{service.caseStudy.description}"</p>
                    
                    <div className="pt-6 border-t border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quantifiable Result</p>
                      <p className="text-slate-900 font-bold flex items-center gap-2 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        {service.caseStudy.result}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 flex justify-center md:justify-end shrink-0 relative z-20">
              <motion.button 
                whileHover={{ scale: 1.02, backgroundColor: '#1d4ed8' }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                id="request-service-btn"
                onClick={() => {
                  if (service && onServiceRequest) {
                    onServiceRequest(service);
                  }
                  onClose();
                }}
                className="w-full md:w-auto px-12 py-6 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-4 hover:bg-blue-700 transition-all shadow-[0_20px_50px_rgba(37,99,235,0.3)] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-100%] group-hover:translate-x-[100%] duration-1000"></div>
                <span className="relative z-10">Request This Service</span>
                <ArrowRight size={20} className="relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
