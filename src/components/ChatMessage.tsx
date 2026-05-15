
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/src/lib/utils';
import { Shield, CheckCircle, AlertTriangle, Lock, ThumbsUp, ThumbsDown, Info, ShieldCheck, Lightbulb, Building, Scale, FileText, Settings, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import { LEGAL_SERVICES, ServiceDetail } from '../constants/services';

interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
  feedback?: 'up' | 'down';
  justifications?: Record<string, string>;
  onFeedback?: (type: 'up' | 'down') => void;
  onLearnMore?: (service: ServiceDetail, justification?: string) => void;
  onRequestService?: (service: ServiceDetail) => void;
  onAskQuestion?: (question: string) => void;
  onEscalate?: () => void;
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({ 
  role, 
  content, 
  feedback, 
  justifications, 
  onFeedback, 
  onLearnMore,
  onRequestService,
  onAskQuestion,
  onEscalate
}) => {
  const isModel = role === 'model';

  const getServiceIcon = (iconName: string, size = 12) => {
    switch (iconName) {
      case 'ShieldCheck': return <ShieldCheck size={size} className="text-blue-500" />;
      case 'Lightbulb': return <Lightbulb size={size} className="text-blue-500" />;
      case 'Building': return <Building size={size} className="text-blue-500" />;
      case 'Scale': return <Scale size={size} className="text-blue-500" />;
      case 'FileText': return <FileText size={size} className="text-blue-500" />;
      case 'Settings': return <Settings size={size} className="text-blue-500" />;
      default: return <Info size={size} className="text-blue-500" />;
    }
  };
  
  // Detect potential service recommendations with robust keyword mapping
  const detectRecommendedServices = () => {
    if (!isModel) return [];
    const lowerContent = content.toLowerCase();
    const recommended: ServiceDetail[] = [];
    
    // 1. Check for explicit Tags [SERVICE:NAME] or Markdown triggers (service:ID)
    const tagRegex = /\[SERVICE:([A-Z_]+)\]|[(]service:([A-Z_]+)[)]/g;
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      const serviceId = match[1] || match[2];
      const service = Object.values(LEGAL_SERVICES).find(s => s.id === serviceId);
      if (service) recommended.push(service);
    }

    // 2. Use keywords from LEGAL_SERVICES for automatic detection
    Object.values(LEGAL_SERVICES).forEach((service) => {
      const hasMatch = service.keywords.some(kw => {
        // Use regex for word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(lowerContent);
      });
      
      if (hasMatch) {
        recommended.push(service);
      }
    });
    
    // De-duplicate and priority sorting (explicit tags first)
    const seen = new Set();
    return recommended.filter(s => {
      const duplicate = seen.has(s.id);
      seen.add(s.id);
      return !duplicate;
    });
  };

  const recommendedServices = detectRecommendedServices();

  // Automatically linkify service mentions in the content
  const linkifyContent = (text: string, recommended: ServiceDetail[]) => {
    if (!isModel || recommended.length === 0) return text;
    
    let processedText = text;
    
    // Sort services by keyword length descending for greedy matching
    const allKeyMap = recommended.flatMap(s => 
      s.keywords.map(kw => ({ kw, serviceId: s.id }))
    ).sort((a, b) => b.kw.length - a.kw.length);

    allKeyMap.forEach(({ kw, serviceId }) => {
      // Escape the keyword to ensure it doesn't break the regex if it contains special characters
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace ALL instances of the keyword, but avoid those already inside brackets or links
      // Using negative lookbehind and lookahead as requested to avoid unintended replacements
      // We use double backslashes in the template literal to pass single backslashes to the RegExp constructor
      const regex = new RegExp(`(?<!\\[|\\()\\b(${escapedKw})\\b(?!\\s*\\]|\\)|:)`, 'gi');
      
      // We use a function replacement to preserve original case
      processedText = processedText.replace(regex, `[$1](service:${serviceId})`);
    });

    return processedText;
  };

  const interactiveContent = isModel ? linkifyContent(content, recommendedServices) : content;
  
  // Confidence & Review Status extraction helper
  const getFooterData = (text: string) => {
    // 1. Try to split by the official separator or common variations
    const separators = ['---', '___', '***', '\n\n'];
    let splitIndex = -1;
    let footerPart = "";

    for (const sep of separators) {
      const idx = text.lastIndexOf(sep);
      if (idx !== -1 && idx > text.length * 0.4) { // Must be in the latter half
        splitIndex = idx;
        footerPart = text.substring(idx + sep.length).trim();
        break;
      }
    }

    // Fallback: If no separator, look for keywords deep in the text
    if (!footerPart) {
      const keywords = [/AI Confidence/i, /Review Status/i, /🤖/];
      for (const kw of keywords) {
        const matches = [...text.matchAll(new RegExp(kw, 'gi'))];
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1];
          if (lastMatch.index! > text.length * 0.5) {
            splitIndex = lastMatch.index!;
            footerPart = text.substring(splitIndex).trim();
            break;
          }
        }
      }
    }

    if (!footerPart) return { footerData: null, cleanedContent: text };

    // More robust regex pattern matching for components
    // Handling multiple formats: "AI Confidence: HIGH (90%)", "Confidence: HIGH", etc.
    const confidenceRegex = /(?:AI\s+)?Confidence:\s*([^|(\n]+)(?:\s*\(([^)]+)\))?/i;
    const statusRegex = /(?:Review\s+)?Status:\s*([^|#\n]+)/i;
    const noteRegex = /(?:Categorization\s+Note|Reason|Note):\s*([^|\n]+)/i;

    const confidenceMatch = footerPart.match(confidenceRegex);
    const statusMatch = footerPart.match(statusRegex);
    const noteMatch = footerPart.match(noteRegex);

    const confidence = confidenceMatch ? (confidenceMatch[1].trim() + (confidenceMatch[2] ? ` (${confidenceMatch[2]})` : "")) : "N/A";
    const status = statusMatch ? statusMatch[1].trim() : "N/A";
    const reason = noteMatch ? noteMatch[1].trim() : "";

    // Clean up icons from status for processing
    const cleanStatus = status.replace(/[✅⚠️🔒📋🤖]/g, '').trim();

    // If we only found one or none, it might be a false positive
    if (confidence === "N/A" && (status === "N/A" || !status)) {
      return { footerData: null, cleanedContent: text };
    }

    const footerData = { confidence, status: cleanStatus, reason };
    const cleanedContent = text.substring(0, splitIndex).trim();

    // Remove explicit service tags that are used for detection only
    return { 
      footerData, 
      cleanedContent: cleanedContent.replace(/\[SERVICE:[A-Z_]+\]/g, '').trim() 
    };
  };

  const { footerData, cleanedContent: mainContent } = isModel ? getFooterData(interactiveContent) : { footerData: null, cleanedContent: interactiveContent };

  const getStatusConfig = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('verified')) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <CheckCircle size={10} className="text-emerald-400" /> };
    if (s.includes('recommended')) return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: <AlertTriangle size={10} className="text-orange-400" /> };
    if (s.includes('required')) return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: <Lock size={10} className="text-rose-400" /> };
    return { color: 'text-slate-400', bg: 'bg-slate-700/30', border: 'border-slate-700/50', icon: <Info size={10} className="text-slate-500" /> };
  };

  const getConfidenceConfig = (conf: string) => {
    const c = conf.toLowerCase();
    if (c.includes('high')) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (c.includes('medium')) return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    if (c.includes('low')) return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    return { color: 'text-slate-400', bg: 'bg-slate-700/30', border: 'border-slate-700/50' };
  };

  const statusConfig = footerData ? getStatusConfig(footerData.status) : null;
  const confConfig = footerData ? getConfidenceConfig(footerData.confidence) : null;

  const detectEscalationNeed = () => {
    if (!isModel) return false;
    
    // 1. Low Confidence Trigger
    const isLowConfidence = footerData?.confidence.toLowerCase().includes('low');
    
    // 2. Distress/High-Risk Keyword Detection
    const lowerContent = content.toLowerCase();
    const distressKeywords = [
      'urgent', 'emergency', 'sued', 'lawsuit', 'bankruptcy', 'eviction',
      'criminal', 'arrested', 'injunction', 'breach', 'desperate', 'panicking',
      'high risk', 'critical failure', 'legal threat'
    ];
    
    const hasDistressSignal = distressKeywords.some(kw => lowerContent.includes(kw));
    
    return isLowConfidence || hasDistressSignal;
  };

  const showEscalation = detectEscalationNeed();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const listCount = isModel ? ((mainContent.match(/^\s*[-*+]\s+/gm) || []).length + (mainContent.match(/^\s*\d+\.\s+/gm) || []).length) : 0;
  const isLongContent = isModel && (mainContent.length > 700 || listCount > 8);

  return (
    <div className={cn(
      "flex w-full mb-8",
      isModel ? "justify-start" : "justify-end"
    )}>
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "rounded-2xl shadow-sm relative group",
          isModel 
            ? "max-w-2xl bg-slate-800 text-white border border-slate-700 p-8 rounded-tl-none shadow-xl shadow-slate-900/20" 
            : "max-w-md bg-blue-600 text-white p-4 rounded-tr-none shadow-blue-500/10"
        )}
      >
        {isModel && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-[10px] text-white font-bold shadow-lg">AI</div>
              <div>
                <span className="block text-xs font-bold text-white uppercase tracking-tighter">LegalEase Assistant</span>
                {footerData && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className={cn(
                      "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border shadow-sm",
                      "bg-slate-700/50 text-slate-300 border-slate-600"
                    )}>
                      {statusConfig?.icon}
                      {footerData.status}
                    </div>
                    <div className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border shadow-sm",
                      "bg-slate-700/50 text-slate-300 border-slate-600"
                    )}>
                      {footerData.confidence}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onFeedback?.('up')}
                className={cn(
                  "p-2 rounded-lg transition-all border",
                  feedback === 'up' 
                    ? "text-emerald-600 bg-emerald-50 border-emerald-200 shadow-sm" 
                    : "text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600"
                )}
                title="Helpful"
              >
                <ThumbsUp size={14} className={cn(feedback === 'up' && "fill-emerald-600")} />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onFeedback?.('down')}
                className={cn(
                  "p-2 rounded-lg transition-all border",
                  feedback === 'down' 
                    ? "text-rose-600 bg-rose-50 border-rose-200 shadow-sm" 
                    : "text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600"
                )}
                title="Not helpful"
              >
                <ThumbsDown size={14} className={cn(feedback === 'down' && "fill-rose-600")} />
              </motion.button>
            </div>
          </div>
        )}

        <div className={cn(
          "markdown-body relative transition-all duration-500 ease-in-out", 
          "text-white",
          isModel && !isExpanded && isLongContent && "max-h-[320px] overflow-hidden"
        )}>
          <motion.div
            initial={isModel ? { opacity: 0, x: -20 } : undefined}
            animate={isModel ? { opacity: 1, x: 0 } : undefined}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => {
                  const href = props.href || '';
                  if (href.startsWith('service:')) {
                    const serviceId = href.split(':')[1];
                    const service = Object.values(LEGAL_SERVICES).find(s => s.id === serviceId);
                    if (service) {
                      return (
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: '#eff6ff' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onLearnMore?.(service, justifications?.[service.id])}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50/40 border border-blue-100 rounded text-[10px] font-black text-blue-700 hover:text-blue-800 transition-all mx-0.5 shadow-sm align-baseline"
                          title={`View ${service.name} details`}
                        >
                          <span className="underline decoration-blue-200 decoration-1 underline-offset-2">{props.children}</span>
                          <Zap size={10} className="text-blue-500 fill-blue-500/20" />
                        </motion.button>
                      );
                    }
                  }
                  return (
                    <a 
                      {...props} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={cn(
                        "font-bold underline decoration-2 transition-colors",
                        isModel ? "text-blue-400 hover:text-blue-300 decoration-blue-400/30" : "text-white hover:text-blue-100 decoration-white/30"
                      )}
                    />
                  );
                },
                code: ({ node, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isBlock = !!match;
                  
                  return isBlock ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-xl my-4 text-xs shadow-lg border border-slate-700/50"
                      customStyle={{
                        margin: '1.5rem 0',
                        padding: '1.25rem',
                        background: '#0f172a'
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code 
                      className={cn(
                        "px-1.5 py-0.5 rounded-md font-mono text-[0.9em]",
                        isModel ? "bg-slate-700 text-blue-300" : "bg-blue-500 text-white"
                      )} 
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
              }}
            >
              {mainContent}
            </ReactMarkdown>
          </motion.div>
          
          {isModel && !isExpanded && isLongContent && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-800 via-slate-800/80 to-transparent pointer-events-none" />
          )}
        </div>

        {isModel && isLongContent && (
          <div className="mt-2 flex justify-center">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 border border-slate-600 rounded-full text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-slate-600 hover:text-white transition-all shadow-sm"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={10} />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={10} />
                  Show Full Insight
                </>
              )}
            </motion.button>
          </div>
        )}

        {isModel && showEscalation && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-800 uppercase tracking-tight">Escalation Protocol Triggered</p>
                <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                  Based on the complexity or urgency of your request, we recommend consulting with a qualified human attorney immediately.
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: '#e11d48' }}
              whileTap={{ scale: 0.98 }}
              onClick={onEscalate}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 text-white rounded-lg text-xs font-black uppercase tracking-[0.1em] shadow-lg shadow-rose-200 transition-all hover:shadow-rose-300"
            >
              <Scale size={14} className="fill-white" />
              Connect with Human Attorney
            </motion.button>
          </motion.div>
        )}

        {isModel && justifications && Object.keys(justifications).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 border-dashed space-y-3">
            {Object.entries(justifications).map(([serviceId, text]) => {
              const service = Object.values(LEGAL_SERVICES).find(s => s.id === serviceId);
              if (!service) return null;
              return (
                <motion.div 
                  key={`insight-${serviceId}`}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 items-start group/insight"
                >
                  <div className="mt-1 p-1 bg-blue-500 rounded shadow-sm group-hover/insight:scale-110 transition-transform">
                    <Zap size={10} className="text-white fill-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">
                      Consultant Insight: {service.name}
                    </p>
                    {service.tagline && (
                      <p className="text-[9px] text-slate-400 font-bold italic mb-1 leading-tight">
                        {service.tagline}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-300 leading-relaxed font-serif italic border-l-2 border-slate-700 pl-3">
                      "{text}"
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        
        {isModel && recommendedServices.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8 space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Recommended Solutions</h4>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Scroll to explore</p>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar -mx-2 px-2 mask-linear-right">
              {recommendedServices.map((service, idx) => (
                <motion.div 
                  key={service.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + (idx * 0.1), duration: 0.5, ease: "easeOut" }}
                  className="flex-none w-[260px] snap-start"
                >
                  <div className="h-full flex flex-col p-4 rounded-2xl border border-blue-100 bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group/card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 bg-blue-50 rounded-xl group-hover/card:bg-blue-600 group-hover/card:text-white transition-colors">
                        {getServiceIcon(service.iconName, 20)}
                      </div>
                      <div className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        {service.id.split('_')[0]}
                      </div>
                    </div>
                    
                    <h5 className="text-sm font-black text-slate-900 leading-tight mb-1">{service.name}</h5>
                    
                    {service.tagline && (
                      <p className="text-[10px] text-blue-600 leading-tight font-bold italic mb-3">
                        {service.tagline}
                      </p>
                    )}
                    
                    <div className="relative h-12 mb-4 overflow-hidden">
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 group-hover/card:opacity-0 transition-opacity duration-300">
                        {service.description}
                      </p>
                      <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 py-0.5 pointer-events-none">
                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.1em] block mb-1.5">Strategic Outcome</span>
                        <p className="text-[11px] text-slate-900 font-bold leading-tight border-l-2 border-blue-500 pl-2">
                          {service.benefits[0]}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-auto space-y-2">
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: '#1d4ed8' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onLearnMore?.(service, justifications?.[service.id])}
                          className="flex-[1.4] flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black transition-all uppercase tracking-[0.05em] shadow-sm shadow-blue-100"
                        >
                          <Info size={12} />
                          Learn More
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: '#0f172a' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onRequestService?.(service)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black transition-all uppercase tracking-[0.05em] shadow-sm"
                        >
                          <Zap size={12} className="fill-white" />
                          Request
                        </motion.button>
                      </div>
                        <motion.button
                          whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onAskQuestion?.(`Can you explain in more detail how ${service.name} typically handles onboarding and initial assessments?`)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all uppercase tracking-[0.05em]"
                        >
                        <Lightbulb size={12} />
                        Ask Question
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        
        {isModel && footerData && (
          <div className="mt-8 pt-4 border-t border-slate-700">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confidence</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: footerData.confidence.includes('%') ? footerData.confidence.split('(')[1]?.split('%')[0] + '%' : '100%' }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            footerData.confidence.toLowerCase().includes('high') ? "bg-emerald-500" :
                            footerData.confidence.toLowerCase().includes('medium') ? "bg-orange-500" : "bg-rose-500"
                          )}
                        />
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase border",
                        confConfig?.bg, confConfig?.color, confConfig?.border
                      )}>
                        {footerData.confidence}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 border-l border-slate-700 pl-8 h-5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Review Status</span>
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase transition-colors shadow-sm border",
                      statusConfig?.bg, statusConfig?.color, statusConfig?.border
                    )}>
                      {statusConfig?.icon}
                      <span>{footerData.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {footerData.reason && (
                <div className="text-[10px] text-slate-400 leading-relaxed font-medium bg-slate-400/5 px-4 py-3 rounded-2xl border border-dashed border-slate-700 transition-all hover:bg-slate-400/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info size={12} className="text-blue-400" />
                    <span className="font-bold text-slate-200 uppercase tracking-tighter text-[9px]">Categorization Insight</span>
                  </div>
                  {footerData.reason}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

