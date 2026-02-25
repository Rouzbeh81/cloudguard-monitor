
import React, { memo } from 'react';
import { CloudUpdate } from '../types';
import { ExternalLink, Calendar, Info, Tag } from 'lucide-react';

interface UpdateCardProps {
  update: CloudUpdate;
}

// Static style maps moved outside to prevent recreation on every render
const CATEGORY_STYLES: Record<string, string> = {
  Azure: 'bg-blue-50 text-blue-700 border-blue-100',
  M365: 'bg-purple-50 text-purple-700 border-purple-100',
  Security: 'bg-red-50 text-red-700 border-red-100'
};

const STATUS_STYLES: Record<string, string> = {
  'General Availability': 'bg-green-50 text-green-700',
  'Public Preview': 'bg-yellow-50 text-yellow-700',
  'Development': 'bg-slate-100 text-slate-600',
  'Retired': 'bg-slate-200 text-slate-800'
};

const UpdateCard = memo(({ update }: UpdateCardProps) => {
  return (
    <div className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${CATEGORY_STYLES[update.category] || 'bg-slate-50'}`}>
            {update.category}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[update.status] || 'bg-slate-50'}`}>
            {update.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-xs">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {update.date}
          </span>
        </div>
      </div>
      
      <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
        {update.title}
      </h3>
      
      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-4">
        {update.description || "No description available for this update. Click learn more for official documentation and technical specifications."}
      </p>
      
      <div className="flex items-center justify-between border-t border-slate-50 pt-3">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-500 font-medium">{update.subcategory || 'General Update'}</span>
        </div>
        <a 
          href={update.url} 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label={`Read documentation for ${update.title} (opens in new tab)`}
          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
        >
          Documentation
          <ExternalLink className="w-3 h-3 ml-1.5" />
        </a>
      </div>
    </div>
  );
});

export default UpdateCard;
