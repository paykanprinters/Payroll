import React from 'react';
import { sanitizeHtml } from '@/utils/sanitize-html';

type ReportContentWrapperProps = {
  html: string;
  className?: string;
};

const ReportContentWrapper: React.FC<ReportContentWrapperProps> = ({ html, className }) => {
  const clean = sanitizeHtml(html);

  return (
    <div
      className={className ?? 'prose max-w-none'}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};

export default ReportContentWrapper;